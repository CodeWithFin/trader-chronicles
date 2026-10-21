# Trader Chronicles MT4/MT5 Expert Advisor (EA)

This EA automatically syncs your closed trades from MetaTrader 4/5 to your Trader Chronicles journal.

## Installation

### MetaTrader 5 (MT5)

1. **Download the EA**
   - Copy `TraderChroniclesEA.mq5` to your MT5 Experts folder:
     - Open MT5
     - Press `Ctrl+Shift+D` to open Data Folder
     - Navigate to `MQL5/Experts/`
     - Paste the file there

2. **Compile the EA**
   - Open MetaEditor (press `F4` in MT5)
   - Open `TraderChroniclesEA.mq5`
   - Press `F7` to compile
   - Ensure no errors

3. **Configure the EA**
   - In MT5, drag the EA onto any chart
   - In the inputs tab, configure:
     - **API_URL**: Your Trader Chronicles sync endpoint (e.g., `https://yourdomain.com/api/trading-accounts/YOUR_ACCOUNT_ID/sync`)
     - **ACCOUNT_ID**: Your trading account ID from Trader Chronicles (found in the URL when editing an account)
     - **SYNC_INTERVAL_MINUTES**: How often to check for new trades (default: 5)
   - Check "Allow WebRequest for listed URL" and add your API domain
   - Click OK

### MetaTrader 4 (MT4)

1. **Download the EA**
   - Copy `TraderChroniclesEA.mq4` to your MT4 Experts folder:
     - Open MT4
     - Press `Ctrl+Shift+D` to open Data Folder
     - Navigate to `MQL4/Experts/`
     - Paste the file there

2. **Compile the EA**
   - Open MetaEditor (press `F4` in MT4)
   - Open `TraderChroniclesEA.mq4`
   - Press `F7` to compile
   - Ensure no errors

3. **Configure the EA**
   - In MT4, drag the EA onto any chart
   - In the inputs tab, configure:
     - **API_URL**: Your Trader Chronicles sync endpoint
     - **ACCOUNT_ID**: Your trading account ID from Trader Chronicles
     - **SYNC_INTERVAL_MINUTES**: How often to check for new trades (default: 5)
   - Check "Allow WebRequest for listed URL" and add your API domain
   - Click OK

## Finding Your Account ID

1. Go to Trader Chronicles → Trading Accounts
2. Click "Edit" on the account you want to connect
3. The Account ID is in the URL: `/trading-accounts?edit=YOUR_ACCOUNT_ID`
4. Or check the browser's network tab when loading the accounts page

## API Endpoint Format

```
https://your-domain.com/api/trading-accounts/{ACCOUNT_ID}/sync
```

Replace `{ACCOUNT_ID}` with your actual account UUID.

## How It Works

1. The EA runs on your MT4/MT5 terminal
2. Every `SYNC_INTERVAL_MINUTES`, it checks the account history for new closed trades
3. New trades are sent to the Trader Chronicles API
4. Trades appear in your Trade Log automatically

## Trade Data Sent

Each trade includes:
- Open/close date & time
- Symbol (asset pair)
- Direction (Long/Short)
- Entry & exit prices
- Stop loss
- P&L (including commission & swap)
- Result (Win/Loss)
- Notes: "MT4/MT5 Auto-sync"

## Troubleshooting

### "WebRequest not allowed" error
- In EA settings, check "Allow WebRequest for listed URL"
- Add your API domain (e.g., `https://yourdomain.com`)

### No trades syncing
- Check the Experts log tab in MT4/MT5 for errors
- Verify the API_URL is correct and accessible
- Ensure the account has closed trades since last sync

### Duplicate trades
- The EA tracks the last synced order/deal ticket
- Duplicates are prevented by the API

## Security Notes

- The EA only sends trade data (no account credentials)
- Your MT4/MT5 password is stored in Trader Chronicles (encrypted) for reference only
- The EA uses your Trader Chronicles account ID, not your broker password
- API calls are made over HTTPS

## Support

For issues, check:
1. MT4/MT5 Experts log tab
2. Browser network tab when manually calling the sync endpoint
3. Trader Chronicles server logs