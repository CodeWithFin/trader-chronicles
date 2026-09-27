/**
 * CRT Signal Generator
 *
 * Produces 5 Candle Range Theory (CRT) signals for XAU/USD with a
 * strict 1.5R risk-to-reward ratio. Signals alternate between LONG
 * and SHORT to give balanced coverage around the current price.
 *
 * In production, `basePrice` should come from a market-data API;
 * here it uses a simulated realistic Gold price.
 */

const crypto = require('crypto');

/**
 * Generate a secure random float between min (inclusive) and max (exclusive).
 * Uses crypto.randomBytes for unpredictable values instead of Math.random().
 */
function secureRandomFloat(min, max) {
  const buf = crypto.randomBytes(4);
  const val = buf.readUInt32BE(0) / 0xFFFFFFFF; // 0..1
  return min + val * (max - min);
}

/**
 * Generate 5 CRT signals for the given session.
 *
 * @param {'asian'|'london'|'newyork'} sessionId
 * @returns {Array<Object>} Array of 5 signal objects
 */
function generateCRTSignals(sessionId) {
  // Simulated base price — replace with live XAU/USD feed in production
  // TODO(production): integrate a real gold price feed (e.g. from a data provider API)
  const basePrice = 2340 + secureRandomFloat(-15, 15);

  const signals = [];
  const directions = ['LONG', 'SHORT', 'LONG', 'SHORT', 'LONG'];

  for (let i = 0; i < 5; i++) {
    const direction = directions[i];
    // Vary entry around the base price (±0.5 to ±4 points)
    const offset = secureRandomFloat(0.5, 4.0);
    const entry = +(basePrice + (direction === 'LONG' ? -offset : offset)).toFixed(2);

    // Risk: random between 1.5 and 5.0 points
    const risk = +secureRandomFloat(1.5, 5.0).toFixed(2);

    // Reward: strictly 1.5x the risk
    const reward = +(risk * 1.5).toFixed(2);

    let stopLoss, takeProfit;
    if (direction === 'LONG') {
      stopLoss = +(entry - risk).toFixed(2);
      takeProfit = +(entry + reward).toFixed(2);
    } else {
      stopLoss = +(entry + risk).toFixed(2);
      takeProfit = +(entry - reward).toFixed(2);
    }

    signals.push({
      id: `${sessionId}-${i + 1}-${Date.now()}`,
      session: sessionId,
      direction,
      entry,
      stopLoss,
      takeProfit,
      riskReward: 1.5,
      risk,
      reward,
      confidence: Math.floor(secureRandomFloat(3, 6)), // 3-5 dots
      timestamp: new Date().toISOString(),
    });
  }

  return signals;
}

module.exports = { generateCRTSignals };
