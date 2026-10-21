// Trader Chronicles MT5 Expert Advisor
// Automatically syncs closed trades to your Trader Chronicles journal.
//
// Setup:
//   1. In Trader Chronicles → Trading Accounts, copy your Sync Token
//   2. Open MetaEditor, compile this EA, attach it to ANY chart (e.g. EURUSD H1)
//   3. In the EA's Input Parameters, set SERVER_URL and SYNC_TOKEN
//   4. Allow "WebRequest" for your server URL in MT5 → Tools → Options → Expert Advisors
//
// The EA polls for new closed trades every SYNC_INTERVAL_MINUTES and pushes them to your journal.

#property copyright "Trader Chronicles"
#property version   "2.00"
#property strict

//--- Input parameters
input string SERVER_URL            = "";  // e.g. http://102.207.151.58:3050
input string SYNC_TOKEN            = "";  // Paste your Sync Token from Trader Chronicles
input int    SYNC_INTERVAL_MINUTES = 5;   // Sync interval in minutes

//--- State
string   g_syncEndpoint   = "";
string   g_accountId      = "";
datetime g_lastSyncTime   = 0;
datetime g_lastDealTime   = 0;
bool     g_bootstrapped   = false;

//+------------------------------------------------------------------+
int OnInit()
{
   if(SERVER_URL == "" || SYNC_TOKEN == "") {
      Alert("Trader Chronicles EA: Set SERVER_URL and SYNC_TOKEN in the EA inputs.");
      return INIT_FAILED;
   }

   PrintFormat("Trader Chronicles EA v2.00 initializing — server: %s", SERVER_URL);
   if(!Bootstrap()) return INIT_FAILED;

   // Track last deal time from existing history to avoid re-syncing old trades
   if(HistorySelect(0, TimeCurrent())) {
      int total = HistoryDealsTotal();
      for(int i = total - 1; i >= 0; i--) {
         ulong ticket = HistoryDealGetTicket(i);
         if(ticket == 0) continue;
         ENUM_DEAL_ENTRY entry = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
         if(entry == DEAL_ENTRY_OUT) {
            datetime t = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
            if(t > g_lastDealTime) g_lastDealTime = t;
            break;
         }
      }
   }

   PrintFormat("Trader Chronicles EA ready. Syncing every %d min. Last deal: %s",
               SYNC_INTERVAL_MINUTES, g_lastDealTime > 0 ? TimeToString(g_lastDealTime) : "none (full history on first sync)");
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
// Call bootstrap endpoint to get accountId and syncEndpoint from token
bool Bootstrap()
{
   string url     = SERVER_URL + "/api/sync/bootstrap";
   string headers = "Authorization: Bearer " + SYNC_TOKEN + "\r\n";

   char   postData[];
   char   response[];
   string responseHeaders;

   int statusCode = WebRequest("GET", url, headers, 5000, postData, response, responseHeaders);

   if(statusCode == -1) {
      PrintFormat("Bootstrap failed — check SERVER_URL and that %s is allowed in MT5 Options → Expert Advisors → WebRequest. Error: %d",
                  SERVER_URL, GetLastError());
      return false;
   }

   if(statusCode != 200) {
      PrintFormat("Bootstrap returned HTTP %d: %s", statusCode, CharArrayToString(response));
      return false;
   }

   string json = CharArrayToString(response);

   g_accountId    = JsonGetString(json, "accountId");
   g_syncEndpoint = JsonGetString(json, "syncEndpoint");

   if(g_accountId == "" || g_syncEndpoint == "") {
      Print("Bootstrap: could not parse accountId or syncEndpoint from response: ", json);
      return false;
   }

   string platform = JsonGetString(json, "mtPlatform");
   string broker   = JsonGetString(json, "mtBrokerServer");
   PrintFormat("Bootstrap OK — account: %s (%s / %s)", g_accountId, platform, broker);
   g_bootstrapped = true;
   return true;
}

//+------------------------------------------------------------------+
// Fetch closed trades since g_lastDealTime and push to API
void SyncTrades()
{
   datetime from = g_lastDealTime > 0 ? g_lastDealTime : (TimeCurrent() - 86400 * 30);
   datetime to   = TimeCurrent();

   if(!HistorySelect(from, to)) {
      Print("SyncTrades: HistorySelect failed");
      return;
   }

   int total = HistoryDealsTotal();
   if(total == 0) return;

   string tradesJson = "";
   int    count      = 0;
   datetime newestDealTime = g_lastDealTime;

   for(int i = 0; i < total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      ENUM_DEAL_ENTRY entryType = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entryType != DEAL_ENTRY_OUT) continue;

      ENUM_DEAL_TYPE dealType = (ENUM_DEAL_TYPE)HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(dealType != DEAL_TYPE_BUY && dealType != DEAL_TYPE_SELL) continue;

      datetime exitTime = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      if(exitTime <= g_lastDealTime) continue;

      string symbol     = HistoryDealGetString(ticket, DEAL_SYMBOL);
      double exitPrice  = HistoryDealGetDouble(ticket, DEAL_PRICE);
      double profit     = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
      double totalPnL   = profit + commission + swap;
      ulong  positionId = (ulong)HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

      // Find matching entry deal for this position
      double   entryPrice = exitPrice; // fallback
      datetime entryTime  = exitTime;
      for(int j = 0; j < total; j++) {
         ulong t2 = HistoryDealGetTicket(j);
         if(t2 == 0 || t2 == ticket) continue;
         ENUM_DEAL_ENTRY e2 = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(t2, DEAL_ENTRY);
         if(e2 != DEAL_ENTRY_IN) continue;
         if((ulong)HistoryDealGetInteger(t2, DEAL_POSITION_ID) != positionId) continue;
         entryPrice = HistoryDealGetDouble(t2, DEAL_PRICE);
         entryTime  = (datetime)HistoryDealGetInteger(t2, DEAL_TIME);
         break;
      }

      // Direction: SELL deal closes a LONG (buy), BUY deal closes a SHORT (sell)
      string direction = (dealType == DEAL_TYPE_SELL) ? "Long" : "Short";
      string result    = (totalPnL >= 0) ? "Win" : "Loss";

      string tradeJson = "{";
      tradeJson += "\"dateTime\":\""   + IsoTime(entryTime) + "\",";
      tradeJson += "\"endDate\":\""    + IsoTime(exitTime)  + "\",";
      tradeJson += "\"assetPair\":\""  + symbol             + "\",";
      tradeJson += "\"direction\":\""  + direction          + "\",";
      tradeJson += "\"entryPrice\":"   + DoubleToString(entryPrice, 5) + ",";
      tradeJson += "\"exitPrice\":"    + DoubleToString(exitPrice,  5) + ",";
      tradeJson += "\"result\":\""     + result             + "\",";
      tradeJson += "\"pnlAbsolute\":"  + DoubleToString(totalPnL, 2)   + ",";
      tradeJson += "\"stopLossPrice\":0,";
      tradeJson += "\"riskPerTrade\":0,";
      tradeJson += "\"rMultiple\":0,";
      tradeJson += "\"strategyUsed\":\"\",";
      tradeJson += "\"setupTags\":[],";
      tradeJson += "\"notes\":\"MT5 Auto-sync (pos #" + IntegerToString((int)positionId) + ")\",";
      tradeJson += "\"screenshotUrl\":\"\"";
      tradeJson += "}";

      if(count > 0) tradesJson += ",";
      tradesJson += tradeJson;
      count++;

      if(exitTime > newestDealTime) newestDealTime = exitTime;
   }

   if(count == 0) {
      Print("SyncTrades: no new closed trades since ", TimeToString(g_lastDealTime));
      return;
   }

   string payload = "{\"trades\":[" + tradesJson + "]}";
   PrintFormat("SyncTrades: sending %d trade(s) to %s", count, g_syncEndpoint);

   char   postData[];
   char   responseData[];
   string responseHeaders;
   StringToCharArray(payload, postData, 0, StringLen(payload));

   string headers = "Content-Type: application/json\r\n"
                  + "Authorization: Bearer " + SYNC_TOKEN + "\r\n";

   int statusCode = WebRequest("POST", g_syncEndpoint, headers, 10000, postData, responseData, responseHeaders);

   if(statusCode == -1) {
      PrintFormat("SyncTrades: WebRequest failed. Error: %d", GetLastError());
      return;
   }

   string resp = CharArrayToString(responseData);
   if(statusCode == 200) {
      int synced = (int)JsonGetDouble(resp, "synced");
      PrintFormat("SyncTrades: %d trade(s) synced successfully.", synced);
      g_lastDealTime = newestDealTime;
   } else {
      PrintFormat("SyncTrades: server returned HTTP %d: %s", statusCode, resp);
   }
}

//+------------------------------------------------------------------+
// Minimal JSON string-field extractor (no external library needed)
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

double JsonGetDouble(const string json, const string key)
{
   string search = "\"" + key + "\":";
   int start = StringFind(json, search);
   if(start < 0) return 0;
   start += StringLen(search);
   int end = start;
   while(end < StringLen(json)) {
      ushort c = StringGetCharacter(json, end);
      if(c == ',' || c == '}' || c == ']') break;
      end++;
   }
   return StringToDouble(StringSubstr(json, start, end - start));
}

string IsoTime(datetime t)
{
   MqlDateTime dt;
   TimeToStruct(t, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ",
                       dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
}
