import { getSql } from '@/lib/db'

export async function fetchPublicSignals({ limit = 50, status } = {}) {
  const sql = getSql()
  if (status) {
    return sql`
      SELECT s.*, u.username
      FROM signals s
      JOIN users u ON u.id = s.user_id
      WHERE s.status = ${status}
      ORDER BY s.created_at DESC
      LIMIT ${limit}
    `
  }
  return sql`
    SELECT s.*, u.username
    FROM signals s
    JOIN users u ON u.id = s.user_id
    ORDER BY s.created_at DESC
    LIMIT ${limit}
  `
}

export async function fetchSignalsByUser(userId) {
  if (!userId) return []
  const sql = getSql()
  return sql`
    SELECT s.*, u.username
    FROM signals s
    JOIN users u ON u.id = s.user_id
    WHERE s.user_id = ${userId}
    ORDER BY s.created_at DESC
    LIMIT 30
  `
}

export async function createSignal({ userId, assetPair, direction, entryPrice, stopLoss, takeProfit, notes }) {
  const sql = getSql()
  const [row] = await sql`
    INSERT INTO signals (user_id, asset_pair, direction, entry_price, stop_loss, take_profit, notes)
    VALUES (
      ${userId},
      ${assetPair},
      ${direction},
      ${entryPrice || null},
      ${stopLoss || null},
      ${takeProfit || null},
      ${notes || ''}
    )
    RETURNING *
  `
  return row
}

export async function updateSignalStatus({ id, userId, status }) {
  const sql = getSql()
  const resolvedAt = status !== 'active' ? new Date().toISOString() : null
  const [row] = await sql`
    UPDATE signals
    SET status = ${status},
        resolved_at = ${resolvedAt},
        updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `
  return row
}

export async function deleteSignal({ id, userId }) {
  const sql = getSql()
  await sql`DELETE FROM signals WHERE id = ${id} AND user_id = ${userId}`
}
