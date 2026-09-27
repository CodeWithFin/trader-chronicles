/**
 * Signal Scheduler + WebSocket Server
 *
 * – Runs a standalone WebSocket server on port 3001 (127.0.0.1 for security)
 * – Uses node-cron to fire at the exact start of each trading session:
 *     Asian   → 19:00 EST  ─  cron in UTC → 00:00
 *     London  → 04:00 EST  ─  cron in UTC → 09:00
 *     New York→ 09:30 EST  ─  cron in UTC → 14:30
 * – Generates 5 CRT signals via signalEngine and broadcasts them over WS
 *
 * Usage:  node server/signals/signalServer.js
 * Env:    SIGNAL_WS_PORT (default 3001)
 */

const cron = require('node-cron');
const { WebSocketServer } = require('ws');
const { generateCRTSignals } = require('./signalEngine');

const PORT = parseInt(process.env.SIGNAL_WS_PORT, 10) || 3001;
// TODO(security): In production, bind to 127.0.0.1 and place behind a
// reverse-proxy with TLS termination. The current binding already restricts
// to localhost for safety.
const HOST = '127.0.0.1';

/* ── WebSocket server ────────────────────────────────────────────── */
const wss = new WebSocketServer({ host: HOST, port: PORT });

console.log(`[SignalServer] WebSocket listening on ws://${HOST}:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[SignalServer] Client connected');
  // Send a welcome / handshake
  ws.send(JSON.stringify({
    type: 'info',
    message: 'Connected to Trader Chronicles Signal Engine',
    sessions: {
      asian:   { cron: '19:00 EST', next: nextSessionTime('asian') },
      london:  { cron: '04:00 EST', next: nextSessionTime('london') },
      newyork: { cron: '09:30 EST', next: nextSessionTime('newyork') },
    },
  }));

  ws.on('close', () => {
    console.log('[SignalServer] Client disconnected');
  });
});

/* ── Broadcast helper ────────────────────────────────────────────── */
function broadcast(data) {
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(payload);
    }
  });
}

/* ── Session trigger function ────────────────────────────────────── */
function triggerSession(sessionId) {
  console.log(`[SignalServer] 🔔 Triggering ${sessionId.toUpperCase()} session at ${new Date().toISOString()}`);
  const signals = generateCRTSignals(sessionId);
  broadcast({
    type: 'signals',
    session: sessionId,
    signals,
    triggeredAt: new Date().toISOString(),
  });
  console.log(`[SignalServer] ✅ Pushed ${signals.length} signals for ${sessionId}`);
}

/* ── Cron schedules (America/New_York timezone) ──────────────────── */
// Asian session:  19:00 EST
cron.schedule('0 19 * * *', () => triggerSession('asian'), {
  timezone: 'America/New_York',
});

// London session: 04:00 EST
cron.schedule('0 4 * * *', () => triggerSession('london'), {
  timezone: 'America/New_York',
});

// New York session: 09:30 EST
cron.schedule('30 9 * * *', () => triggerSession('newyork'), {
  timezone: 'America/New_York',
});

console.log('[SignalServer] Cron schedules active:');
console.log('  Asian   → 19:00 EST daily');
console.log('  London  → 04:00 EST daily');
console.log('  New York→ 09:30 EST daily');

/* ── Dev helper: manual trigger via env ───────────────────────────── */
// Set TRIGGER_NOW=asian|london|newyork to fire immediately on startup
const triggerNow = process.env.TRIGGER_NOW;
if (triggerNow && ['asian', 'london', 'newyork'].includes(triggerNow)) {
  // Small delay to let clients connect first
  setTimeout(() => triggerSession(triggerNow), 2000);
  console.log(`[SignalServer] ⚡ Will fire ${triggerNow} session in 2s (TRIGGER_NOW)`);
}

/* ── Helper: compute next session time for info ──────────────────── */
function nextSessionTime(sessionId) {
  const now = new Date();
  const est = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const today = new Date(est);

  const sessionTimes = {
    asian: { h: 19, m: 0 },
    london: { h: 4, m: 0 },
    newyork: { h: 9, m: 30 },
  };

  const { h, m } = sessionTimes[sessionId];
  today.setHours(h, m, 0, 0);

  if (est > today) {
    today.setDate(today.getDate() + 1);
  }

  return today.toISOString();
}

/* ── Graceful shutdown ───────────────────────────────────────────── */
process.on('SIGINT', () => {
  console.log('\n[SignalServer] Shutting down…');
  wss.close(() => process.exit(0));
});

process.on('SIGTERM', () => {
  wss.close(() => process.exit(0));
});
