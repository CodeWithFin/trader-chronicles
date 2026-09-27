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
    <div
      className="group relative fc-card overflow-hidden transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        background: '#18181b',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      {/* Glow accent bar */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] transition-opacity"
        style={{
          background: isLong
            ? 'linear-gradient(90deg, #22c55e, #86efac)'
            : 'linear-gradient(90deg, #ef4444, #fca5a5)',
        }}
      />

      <div className="p-4 space-y-3">
        {/* Direction badge + Signal # */}
        <div className="flex items-center justify-between">
          <span
            className="fc-badge text-[11px] font-bold tracking-wider"
            style={{
              background: isLong ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
              color: isLong ? '#4ade80' : '#f87171',
            }}
          >
            {isLong ? '▲ LONG' : '▼ SHORT'}
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">#{index + 1}</span>
        </div>

        {/* Price levels */}
        <div className="space-y-2">
          <PriceRow label="Entry" value={entry} color="#3b82f6" icon="◆" />
          <PriceRow label="Stop Loss" value={stopLoss} color="#ef4444" icon="✕" />
          <PriceRow label="Take Profit" value={takeProfit} color="#22c55e" icon="◎" />
        </div>

        {/* R:R & Confidence meter */}
        <div className="flex items-center justify-between pt-1 border-t border-white/[0.04]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-zinc-500">R:R</span>
            <span className="text-[13px] font-semibold text-amber-400 font-mono">
              1 : {riskReward?.toFixed(1) || '1.5'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((dot) => (
              <span
                key={dot}
                className="w-[5px] h-[5px] rounded-full transition-colors"
                style={{
                  background:
                    dot <= (confidence || 3)
                      ? isLong
                        ? '#22c55e'
                        : '#ef4444'
                      : 'rgba(255,255,255,0.08)',
                }}
              />
            ))}
          </div>
        </div>

        {/* Pip metrics */}
        <div className="grid grid-cols-2 gap-2">
          <MetricChip label="Risk" value={`${risk.toFixed(2)} pts`} color="#ef4444" />
          <MetricChip label="Reward" value={`${reward.toFixed(2)} pts`} color="#22c55e" />
        </div>
      </div>
    </div>
  )
}

/* ── sub-components ──────────────────────────────────────────────── */

function PriceRow({ label, value, color, icon }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        {label}
      </span>
      <span className="text-[13px] font-mono font-semibold text-zinc-200">
        {typeof value === 'number' ? value.toFixed(2) : value}
      </span>
    </div>
  )
}

function MetricChip({ label, value, color }) {
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 flex items-center justify-between"
      style={{ background: 'rgba(255,255,255,0.03)' }}
    >
      <span className="text-[10px] text-zinc-500">{label}</span>
      <span className="text-[11px] font-mono font-semibold" style={{ color }}>
        {value}
      </span>
    </div>
  )
}
