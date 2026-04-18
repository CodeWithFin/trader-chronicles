/**
 * P&L is stored as DECIMAL(20,8). JavaScript IEEE doubles lose precision;
 * we normalize to 8 decimal places as integers before storage/display.
 */

const SCALE = 8
const FACTOR = 10 ** SCALE

export function roundPnl(value) {
  const n = typeof value === 'string' ? parseFloat(value) : Number(value)
  if (!Number.isFinite(n)) return NaN
  const q = Math.round(n * FACTOR) / FACTOR
  return parseFloat(q.toFixed(SCALE))
}

/**
 * Format P&amp;L for UI: no float noise (e.g. 199.99000000 → +$199.99).
 */
export function formatPnlCurrency(value) {
  const n = roundPnl(typeof value === 'string' ? parseFloat(value) : Number(value))
  if (!Number.isFinite(n)) return '$0'
  const sign = n >= 0 ? '+' : '-'
  const abs = Math.abs(n)
  let s = abs.toFixed(SCALE)
  s = s.replace(/\.?0+$/, '')
  return `${sign}$${s}`
}

/** Entry/exit prices and other unsigned decimals — no float noise. */
export function formatDecimalTrim(value) {
  const n = roundPnl(typeof value === 'string' ? parseFloat(value) : Number(value))
  if (!Number.isFinite(n)) return '—'
  let s = n.toFixed(SCALE)
  s = s.replace(/\.?0+$/, '')
  return s
}
