/**
 * Signal Scheduler + WebSocket Server
 *
 * – Runs a standalone WebSocket server on port 3002
 * – Retains historical session signals (Asian, London, NY) with WIN/LOSS outcomes
 * – Broadcasts live ticks and session signals
 *
 * Usage: node server/signals/signalServer.js
 */

const cron = require('node-cron')
const { WebSocketServer } = require('ws')
const { generateCRTSignals } = require('./signalEngine')

const PORT = parseInt(process.env.SIGNAL_WS_PORT, 10) || 3002
const HOST = '127.0.0.1'

/* ── Retained signals state for past & active sessions ───────────── */
const retainedSignals = {
  asian: generateCRTSignals('asian', true),
  london: generateCRTSignals('london', true),
  newyork: generateCRTSignals('newyork', false),
}

/* ── WebSocket server ────────────────────────────────────────────── */
const wss = new WebSocketServer({ host: HOST, port: PORT })

console.log(`[SignalServer] WebSocket listening on ws://${HOST}:${PORT}`)

wss.on('connection', (ws) => {
  console.log('[SignalServer] Client connected')

  // Send initial handshake + full retained signal history
  ws.send(
    JSON.stringify({
      type: 'info',
      message: 'Connected to Trader Chronicles Signal Engine',
      retainedSignals,
    })
  )

  // Immediately push retained signals for each session
  Object.keys(retainedSignals).forEach((session) => {
    ws.send(
      JSON.stringify({
        type: 'signals',
        session,
        signals: retainedSignals[session],
        triggeredAt: new Date().toISOString(),
      })
    )
  })

  ws.on('close', () => {
    console.log('[SignalServer] Client disconnected')
  })
})

/* ── Broadcast helper ────────────────────────────────────────────── */
function broadcast(data) {
  const payload = JSON.stringify(data)
  wss.clients.forEach((client) => {
    if (client.readyState === 1 /* WebSocket.OPEN */) {
      client.send(payload)
    }
  })
}

/* ── Live tick stream broadcaster (1-second XAU/USD price action) ── */
let lastClose = 2375.14
let currentMinuteTime = Math.floor(Date.now() / 60000) * 60
let currentCandle = {
  time: currentMinuteTime,
  open: lastClose,
  high: lastClose,
  low: lastClose,
  close: lastClose,
}

setInterval(() => {
  const nowUnix = Math.floor(Date.now() / 1000)
  const minuteTime = Math.floor(nowUnix / 60) * 60

  if (minuteTime > currentCandle.time) {
    lastClose = currentCandle.close
    currentCandle = {
      time: minuteTime,
      open: lastClose,
      high: lastClose,
      low: lastClose,
      close: lastClose,
    }
  }

  const delta = (Math.random() - 0.49) * 0.45
  const newClose = +(currentCandle.close + delta).toFixed(2)
  currentCandle.close = newClose
  currentCandle.high = Math.max(currentCandle.high, newClose)
  currentCandle.low = Math.min(currentCandle.low, newClose)

  broadcast({
    type: 'candle',
    data: { ...currentCandle },
  })
}, 1000)

/* ── Session trigger function ────────────────────────────────────── */
function triggerSession(sessionId) {
  console.log(`[SignalServer] 🔔 Triggering ${sessionId.toUpperCase()} session at ${new Date().toISOString()}`)
  const signals = generateCRTSignals(sessionId, false)
  retainedSignals[sessionId] = signals

  broadcast({
    type: 'signals',
    session: sessionId,
    signals,
    triggeredAt: new Date().toISOString(),
  })
  console.log(`[SignalServer] ✅ Pushed ${signals.length} signals for ${sessionId}`)
}

/* ── Cron schedules (America/New_York timezone) ──────────────────── */
cron.schedule('0 19 * * *', () => triggerSession('asian'), {
  timezone: 'America/New_York',
})

cron.schedule('0 4 * * *', () => triggerSession('london'), {
  timezone: 'America/New_York',
})

cron.schedule('30 9 * * *', () => triggerSession('newyork'), {
  timezone: 'America/New_York',
})

console.log('[SignalServer] Cron schedules active:')
console.log('  Asian   → 19:00 EST daily')
console.log('  London  → 04:00 EST daily')
console.log('  New York→ 09:30 EST daily')

/* ── Graceful shutdown ───────────────────────────────────────────── */
process.on('SIGINT', () => {
  console.log('\n[SignalServer] Shutting down…')
  wss.close(() => process.exit(0))
})

process.on('SIGTERM', () => {
  wss.close(() => process.exit(0))
})
