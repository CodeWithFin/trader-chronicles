'use client'

/**
 * SignalCard – a single CRT signal rendered as a rich card
 * with entry/SL/TP levels and an animated risk-reward meter.
 */
export default function SignalCard({ signal, index }) {
  const { direction, entry, stopLoss, takeProfit, riskReward, confidence } = signal
  const isLong = direction === 'LONG'
  const risk = Math.abs(entry - stopLoss)
  const reward = Math.abs(takeProfit - entry)

  return (
    <div className="fc-card fc-card-hover p-4 space-y-3 relative overflow-hidden bg-white border border-[var(--stone)] rounded-[10px]">
      {/* Glow accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: isLong ? 'var(--grass)' : 'var(--alert)',
        }}
      />

      {/* Direction badge + Signal # */}
      <div className="flex items-center justify-between pt-1">
        <span
          className={`fc-badge ${
            isLong ? 'fc-badge-win' : 'fc-badge-loss'
          } text-xs px-2.5 py-0.5 font-bold tracking-wide`}
        >
          {isLong ? '▲ LONG' : '▼ SHORT'}
        </span>
        <span className="text-xs text-muted font-mono font-medium">Signal #{index + 1}</span>
      </div>

      {/* Price levels */}
      <div className="space-y-1.5 pt-1">
        <PriceRow label="Entry" value={entry} color="var(--link)" icon="◆" />
        <PriceRow label="Stop Loss" value={stopLoss} color="var(--alert)" icon="✕" />
        <PriceRow label="Take Profit" value={takeProfit} color="var(--grass)" icon="◎" />
      </div>

      {/* R:R & Confidence meter */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--stone)]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted font-medium">Risk:Reward</span>
          <span className="text-xs font-semibold text-ink font-mono bg-[var(--sand)] px-2 py-0.5 rounded">
            1 : {riskReward?.toFixed(1) || '1.5'}
          </span>
        </div>
        <div className="flex items-center gap-1.5" title={`Confidence: ${confidence || 3}/5`}>
          {[1, 2, 3, 4, 5].map((dot) => (
            <span
              key={dot}
              className="w-1.5 h-1.5 rounded-full transition-colors"
              style={{
                background:
                  dot <= (confidence || 3)
                    ? isLong
                      ? 'var(--grass)'
                      : 'var(--alert)'
                    : 'var(--stone)',
              }}
            />
          ))}
        </div>
      </div>

      {/* Pip metrics */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <MetricChip label="Risk" value={`${risk.toFixed(2)} pts`} isPos={false} />
        <MetricChip label="Reward" value={`${reward.toFixed(2)} pts`} isPos={true} />
      </div>
    </div>
  )
}

/* ── sub-components ──────────────────────────────────────────────── */

function PriceRow({ label, value, color, icon }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted flex items-center gap-1.5 font-medium">
        <span style={{ color }}>{icon}</span>
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
