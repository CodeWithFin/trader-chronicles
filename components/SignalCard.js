'use client'

/**
 * SignalCard – High-quality CRT setup card with win/loss status tracking.
 * Emojis are omitted per user preference.
 * Displays analysis timeframe (30m, 1h, 2h) and 60+ pips reward targets.
 */
export default function SignalCard({ signal, index }) {
  const {
    direction,
    tf = '1h',
    entry,
    stopLoss,
    takeProfit,
    riskReward,
    confidence,
    confluence,
    status,
    rewardPips,
    riskPips,
  } = signal

  const isLong = direction === 'LONG'
  const isWin = status === 'WIN'
  const isLoss = status === 'LOSS'

  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(takeProfit - entry)
  const calculatedRewardPips = rewardPips || Math.round(reward * 10)
  const calculatedRiskPips = riskPips || Math.round(risk * 10)

  return (
    <div
      className="fc-card fc-card-hover p-4 space-y-3 relative overflow-hidden bg-white rounded-[10px] transition-all"
      style={{
        boxShadow: isWin
          ? 'inset 0 0 0 1.5px var(--grass)'
          : isLoss
          ? 'inset 0 0 0 1.5px var(--alert)'
          : 'inset 0 0 0 1px var(--stone)',
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: isWin
            ? 'var(--grass)'
            : isLoss
            ? 'var(--alert)'
            : isLong
            ? 'var(--link)'
            : 'var(--amber-500)',
        }}
      />

      {/* Header: Direction + Timeframe Badge + WIN/LOSS outcome badge */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span
            className={`fc-badge ${
              isLong ? 'fc-badge-win' : 'fc-badge-loss'
            } text-xs px-2.5 py-0.5 font-bold tracking-wider`}
          >
            {isLong ? 'BUY / LONG' : 'SELL / SHORT'}
          </span>
          <span className="fc-badge fc-badge-tag text-xs px-2 py-0.5 font-mono font-semibold">
            {tf}
          </span>
          <span className="text-xs text-muted font-mono font-medium">#{index + 1}</span>
        </div>

        {/* Outcome Badge: WIN in green, LOSS in red */}
        {status && status !== 'PENDING' ? (
          <span
            className={`fc-badge ${
              isWin ? 'fc-badge-win' : 'fc-badge-loss'
            } text-xs px-2.5 py-0.5 font-extrabold tracking-widest uppercase`}
          >
            {isWin ? `WIN +${riskReward || 1.5}R` : 'LOSS -1.0R'}
          </span>
        ) : (
          <span className="fc-badge fc-badge-neutral text-xs px-2.5 py-0.5 font-medium">
            ACTIVE
          </span>
        )}
      </div>

      {/* Confluence note */}
      {confluence && (
        <div className="fc-surface px-2.5 py-1.5 rounded text-[11px] text-charcoal font-medium">
          <span className="text-muted">{tf} Setup: </span>
          {confluence}
        </div>
      )}

      {/* Price levels */}
      <div className="space-y-1.5 pt-1">
        <PriceRow label="Entry Price" value={entry} color="var(--link)" />
        <PriceRow label="Stop Loss" value={stopLoss} color="var(--alert)" />
        <PriceRow label="Take Profit" value={takeProfit} color="var(--grass)" />
      </div>

      {/* R:R & Confidence rating */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--stone)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">Target Ratio</span>
          <span className="text-xs font-semibold text-ink font-mono bg-[var(--sand)] px-2 py-0.5 rounded">
            1 : {riskReward?.toFixed(1) || '1.5'}
          </span>
        </div>
        <div className="flex items-center gap-1.5" title={`Confidence: ${confidence || 4}/5`}>
          {[1, 2, 3, 4, 5].map((dot) => (
            <span
              key={dot}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{
                background:
                  dot <= (confidence || 4)
                    ? isWin
                      ? 'var(--grass)'
                      : isLoss
                      ? 'var(--alert)'
                      : 'var(--ink)'
                    : 'var(--stone)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Risk / Reward point & pip metrics */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <MetricChip label="Risk" value={`${risk.toFixed(2)} pts (${calculatedRiskPips} pips)`} isPos={false} />
        <MetricChip label="Target Reward" value={`${reward.toFixed(2)} pts (${calculatedRewardPips} pips)`} isPos={true} />
      </div>
    </div>
  )
}

/* ── sub-components ──────────────────────────────────────────────── */

function PriceRow({ label, value, color }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted flex items-center gap-2 font-medium">
        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: color }} />
        {label}
      </span>
      <span className="font-mono font-semibold text-ink">
        {typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </div>
  )
}

function MetricChip({ label, value, isPos }) {
  return (
    <div className="fc-surface px-2.5 py-1.5 rounded-lg flex items-center justify-between">
      <span className="text-[11px] text-muted font-medium">{label}</span>
      <span
        className={`text-xs font-mono font-semibold ${
          isPos ? 'fc-text-pos' : 'fc-text-neg'
        }`}
      >
        {value}
      </span>
    </div>
  )
}
