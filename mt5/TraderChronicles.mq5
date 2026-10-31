//+------------------------------------------------------------------+
//| TraderChronicles.mq5 — Auto trade logger                        |
//| Sends every closed position to your Trader Chronicles journal    |
//+------------------------------------------------------------------+
#property copyright "Trader Chronicles"
#property version   "1.0"
#property strict

input string ApiKey    = "";                              // Your API key (from Settings page)
input string ServerUrl = "http://102.207.151.58:3055";   // Your journal URL (no trailing slash)

//--- track which tickets we already sent
ulong g_sent[];

int OnInit()
  {
   ArrayResize(g_sent, 0);
   EventSetTimer(10); // check every 10 seconds
   return INIT_SUCCEEDED;
  }

void OnDeinit(const int reason) { EventKillTimer(); }

void OnTimer() { CheckClosedTrades(); }

void OnTrade() { CheckClosedTrades(); }

void CheckClosedTrades()
  {
   if(ApiKey == "")
     {
      Print("TraderChronicles: Set your ApiKey in EA inputs.");
      return;
     }

   datetime from = TimeCurrent() - 86400 * 30; // look back 30 days
   HistorySelect(from, TimeCurrent());

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0) continue;

      long entry = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT) continue; // only closing deals

      if(AlreadySent(ticket)) continue;

      SendTrade(ticket);
      AddSent(ticket);
     }
  }

void SendTrade(ulong closeTicket)
  {
   string symbol    = HistoryDealGetString(closeTicket, DEAL_SYMBOL);
   long   dealType  = HistoryDealGetInteger(closeTicket, DEAL_TYPE);
   double closePrice = HistoryDealGetDouble(closeTicket, DEAL_PRICE);
   double profit    = HistoryDealGetDouble(closeTicket, DEAL_PROFIT)
                    + HistoryDealGetDouble(closeTicket, DEAL_SWAP)
                    + HistoryDealGetDouble(closeTicket, DEAL_COMMISSION);
   datetime closeTime = (datetime)HistoryDealGetInteger(closeTicket, DEAL_TIME);
   double   volume  = HistoryDealGetDouble(closeTicket, DEAL_VOLUME);
   string   comment = HistoryDealGetString(closeTicket, DEAL_COMMENT);
   long     posId   = HistoryDealGetInteger(closeTicket, DEAL_POSITION_ID);

   // find the matching opening deal for this position
   double openPrice = 0;
   double stopLoss  = 0;
   datetime openTime = closeTime;
   ulong openTicket  = 0;

   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong t = HistoryDealGetTicket(i);
      if(t == 0) continue;
      if(HistoryDealGetInteger(t, DEAL_POSITION_ID) != posId) continue;
      if(HistoryDealGetInteger(t, DEAL_ENTRY) != DEAL_ENTRY_IN) continue;
      openPrice  = HistoryDealGetDouble(t, DEAL_PRICE);
      openTime   = (datetime)HistoryDealGetInteger(t, DEAL_TIME);
      openTicket = t;
      break;
     }

   // try to get stop loss from position history
   if(HistorySelectByPosition(posId))
     {
      int orders = HistoryOrdersTotal();
      for(int i = 0; i < orders; i++)
        {
         ulong oh = HistoryOrderGetTicket(i);
         if(oh == 0) continue;
         double sl = HistoryOrderGetDouble(oh, ORDER_SL);
         if(sl > 0) { stopLoss = sl; break; }
        }
     }

   // Long = buy type on opening deal; Short = sell
   string direction = (dealType == DEAL_TYPE_BUY) ? "Short" : "Long";
   // Note: DEAL_ENTRY_OUT on a BUY deal means we're closing a SHORT position

   string openTimeStr  = TimeToString(openTime,  TIME_DATE|TIME_SECONDS);
   string closeTimeStr = TimeToString(closeTime, TIME_DATE|TIME_SECONDS);

   // build JSON
   string json = StringFormat(
     "{\"ticket\":%I64u,\"symbol\":\"%s\",\"direction\":\"%s\","
     "\"open_time\":%I64u,\"close_time\":%I64u,"
     "\"open_price\":%.8f,\"close_price\":%.8f,"
     "\"stop_loss\":%.8f,\"profit\":%.2f,"
     "\"volume\":%.2f,\"comment\":\"%s\"}",
     closeTicket, symbol, direction,
     (long)openTime, (long)closeTime,
     openPrice, closePrice,
     stopLoss, profit,
     volume, comment
   );

   string url     = ServerUrl + "/api/mt5/ingest";
   string headers = "Content-Type: application/json\r\nx-api-key: " + ApiKey + "\r\n";
   char   postData[];
   char   result[];
   string resultHeaders;

   StringToCharArray(json, postData, 0, StringLen(json));

   int code = WebRequest("POST", url, headers, 5000, postData, result, resultHeaders);
   if(code == 201 || code == 200)
      PrintFormat("TraderChronicles: logged trade #%I64u %s %s profit=%.2f", closeTicket, symbol, direction, profit);
   else
      PrintFormat("TraderChronicles: failed ticket #%I64u HTTP=%d response=%s", closeTicket, code, CharArrayToString(result));
  }

bool AlreadySent(ulong ticket)
  {
   for(int i = 0; i < ArraySize(g_sent); i++)
      if(g_sent[i] == ticket) return true;
   return false;
  }

void AddSent(ulong ticket)
  {
   int n = ArraySize(g_sent);
   ArrayResize(g_sent, n + 1);
   g_sent[n] = ticket;
  }
