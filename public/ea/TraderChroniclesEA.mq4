// Trader Chronicles MT4 Expert Advisor
// Automatically syncs closed trades to your Trader Chronicles journal.
//
// Setup:
//   1. In Trader Chronicles → Trading Accounts, copy your Sync Token
//   2. Open MetaEditor, compile this EA, attach it to ANY chart (e.g. EURUSD H1)
//   3. In the EA's Input Parameters, set SERVER_URL and SYNC_TOKEN
//   4. Allow "WebRequest" for your server URL in MT4 → Tools → Options → Expert Advisors
//
// The EA polls for new closed trades every SYNC_INTERVAL_MINUTES and pushes them to your journal.

#property copyright "Trader Chronicles"
#property version   "2.00"
#property strict

//--- Input parameters
extern string SERVER_URL            = "";  // e.g. http://102.207.151.58:3050
extern string SYNC_TOKEN            = "";  // Paste your Sync Token from Trader Chronicles
extern int    SYNC_INTERVAL_MINUTES = 5;   // Sync interval in minutes

//--- State
string   g_syncEndpoint = "";
string   g_accountId    = "";
datetime g_lastSyncTime = 0;
datetime g_lastDealTime = 0;
bool     g_bootstrapped = false;

//+------------------------------------------------------------------+
int OnInit()
{
   if(SERVER_URL == "" || SYNC_TOKEN == "") {
      Alert("Trader Chronicles EA: Set SERVER_URL and SYNC_TOKEN in the EA inputs.");
      return INIT_FAILED;
   }

   PrintFormat("Trader Chronicles EA v2.00 (MT4) initializing — server: %s", SERVER_URL);
   if(!Bootstrap()) return INIT_FAILED;

   // Track last closed trade time from history
   int total = OrdersHistoryTotal();
   for(int i = total - 1; i >= 0; i--) {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderType() != OP_BUY && OrderType() != OP_SELL) continue;
      if(OrderCloseTime() > g_lastDealTime) {
         g_lastDealTime = OrderCloseTime();
         break;
      }
   }

   PrintFormat("Trader Chronicles EA ready. Syncing every %d min.", SYNC_INTERVAL_MINUTES);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   Print("Trader Chronicles EA stopped.");
}

//+------------------------------------------------------------------+
void OnTick()
{
   datetime now = TimeCurrent();
   if(now - g_lastSyncTime >= (datetime)(SYNC_INTERVAL_MINUTES * 60)) {
      if(!g_bootstrapped) Bootstrap();
      if(g_bootstrapped) SyncTrades();
      g_lastSyncTime = now;
   }
}

//+------------------------------------------------------------------+
bool Bootstrap()
{
   string url     = SERVER_URL + "/api/sync/bootstrap";
   string headers = "Authorization: Bearer " + SYNC_TOKEN + "\r\n";
   string response = "";

   int statusCode = WebRequest("GET", url, headers, NULL, 5000, response, "");

   if(statusCode == -1) {
      PrintFormat("Bootstrap failed — allow %s in MT4 → Tools → Options → Expert Advisors → WebRequest. Error: %d",
                  SERVER_URL, GetLastError());
      return false;
   }
   if(statusCode != 200) {
      PrintFormat("Bootstrap returned HTTP %d: %s", statusCode, response);
      return false;
   }

   g_accountId    = JsonGetString(response, "accountId");
   g_syncEndpoint = JsonGetString(response, "syncEndpoint");

   if(g_accountId == "" || g_syncEndpoint == "") {
      Print("Bootstrap: could not parse response: ", response);
      return false;
   }

   PrintFormat("Bootstrap OK — account: %s", g_accountId);
   g_bootstrapped = true;
   return true;
}

//+------------------------------------------------------------------+
void SyncTrades()
{
   string tradesJson = "";
   int    count      = 0;
   datetime newestTime = g_lastDealTime;
   int total = OrdersHistoryTotal();

   for(int i = 0; i < total; i++) {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_HISTORY)) continue;
      if(OrderType() != OP_BUY && OrderType() != OP_SELL) continue;
      if(OrderCloseTime() == 0) continue;
      if(OrderCloseTime() <= g_lastDealTime) continue;

      double  entryPrice = OrderOpenPrice();
      double  exitPrice  = OrderClosePrice();
      double  totalPnL   = OrderProfit() + OrderCommission() + OrderSwap();
      string  direction  = (OrderType() == OP_BUY) ? "Long" : "Short";
      string  result     = (totalPnL >= 0) ? "Win" : "Loss";
      string  symbol     = OrderSymbol();

      string tradeJson = "{";
      tradeJson += "\"dateTime\":\""   + IsoTime(OrderOpenTime())  + "\",";
      tradeJson += "\"endDate\":\""    + IsoTime(OrderCloseTime()) + "\",";
      tradeJson += "\"assetPair\":\""  + symbol                    + "\",";
      tradeJson += "\"direction\":\""  + direction                 + "\",";
      tradeJson += "\"entryPrice\":"   + DoubleToString(entryPrice, 5) + ",";
      tradeJson += "\"exitPrice\":"    + DoubleToString(exitPrice,  5) + ",";
      tradeJson += "\"result\":\""     + result                    + "\",";
      tradeJson += "\"pnlAbsolute\":"  + DoubleToString(totalPnL, 2)   + ",";
      tradeJson += "\"stopLossPrice\":" + DoubleToString(OrderStopLoss(), 5) + ",";
      tradeJson += "\"riskPerTrade\":0,";
      tradeJson += "\"rMultiple\":0,";
      tradeJson += "\"strategyUsed\":\"\",";
      tradeJson += "\"setupTags\":[],";
      tradeJson += "\"notes\":\"MT4 Auto-sync (ticket #" + IntegerToString(OrderTicket()) + ")\",";
      tradeJson += "\"screenshotUrl\":\"\"";
      tradeJson += "}";

      if(count > 0) tradesJson += ",";
      tradesJson += tradeJson;
      count++;

      if(OrderCloseTime() > newestTime) newestTime = OrderCloseTime();
   }

   if(count == 0) {
      Print("SyncTrades: no new closed trades.");
      return;
   }

   string payload = "{\"trades\":[" + tradesJson + "]}";
   PrintFormat("SyncTrades: sending %d trade(s) to %s", count, g_syncEndpoint);

   string headers  = "Content-Type: application/json\r\n"
                   + "Authorization: Bearer " + SYNC_TOKEN + "\r\n";
   string response = "";

   int statusCode = WebRequest("POST", g_syncEndpoint, headers, payload, 10000, response, "");

   if(statusCode == -1) {
      PrintFormat("SyncTrades: WebRequest failed. Error: %d", GetLastError());
      return;
   }

   if(statusCode == 200) {
      int synced = (int)StringToDouble(JsonGetString(response, "synced"));
      PrintFormat("SyncTrades: %d trade(s) synced successfully.", synced);
      g_lastDealTime = newestTime;
   } else {
      PrintFormat("SyncTrades: server returned HTTP %d: %s", statusCode, response);
   }
}

//+------------------------------------------------------------------+
string JsonGetString(const string json, const string key)
{
   string search = "\"" + key + "\":\"";
   int start = StringFind(json, search);
   if(start < 0) return "";
   start += StringLen(search);
   int end = StringFind(json, "\"", start);
   if(end < 0) return "";
   return StringSubstr(json, start, end - start);
}

string IsoTime(datetime t)
{
   MqlDateTime dt;
   TimeToStruct(t, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}
