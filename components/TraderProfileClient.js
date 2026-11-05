'use client';

import { format, formatDistanceToNow } from 'date-fns';
import Navbar from '@/components/Navbar';
import { formatPnlCurrency, roundPnl } from '@/lib/pnl-money';

function getCorrectedPnl(trade) {
  const base = roundPnl(trade.pnl_absolute ?? 0);
  if (!Number.isFinite(base)) return 0;
  if (trade.result === 'Loss' && base > 0) return roundPnl(-Math.abs(base));
  if (trade.result === 'Win' && base < 0) return roundPnl(Math.abs(base));
  return base;
}

function getResultBadgeClass(result) {
  switch (result) {
    case 'Win':
      return 'fc-badge-win';
    case 'Loss':
      return 'fc-badge-loss';
    case 'Break Even':
      return 'fc-badge-neutral';
    default:
      return 'fc-badge-tag';
  }
}

export default function TraderProfileClient({ profile, trades = [], session = null }) {
  if (!profile) {
    return (
      <div className="min-h-screen bg-canvas">
        <Navbar initialSession={session} />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center py-16 text-brown">
          User profile not found.
        </div>
      </div>
    );
  }

  const netPnl =
    profile.totalPnl != null && Number.isFinite(Number(profile.totalPnl))
      ? Number(profile.totalPnl)
      : trades.reduce((sum, trade) => sum + getCorrectedPnl(trade), 0);

  return (
    <div className="min-h-screen bg-canvas">
      <Navbar initialSession={session} />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8 pb-6 shadow-[inset_0_-1px_0_0_var(--stone)]">
          <h1 className="fc-heading-lg text-4xl mb-2">{profile.username}</h1>
          <p className="text-muted text-sm mb-2">
            Joined {formatDistanceToNow(new Date(profile.joinedAt), { addSuffix: true })}
          </p>
          <div className="flex flex-wrap gap-6 mt-4">
            <div>
              <div className="text-muted text-xs uppercase mb-1">Total Trades</div>
              <div className="text-2xl font-semibold text-ink">{profile.totalTrades}</div>
            </div>
            <div>
              <div className="text-muted text-xs uppercase mb-1">Win Rate</div>
              <div className="text-2xl font-semibold text-ink">{profile.winRate}%</div>
            </div>
            {profile.bestAssetPair && (
              <div>
                <div className="text-muted text-xs uppercase mb-1">Best Asset Pair</div>
                <div className="text-lg font-semibold text-charcoal">{profile.bestAssetPair}</div>
              </div>
            )}
            <div>
              <div className="text-muted text-xs uppercase mb-1">Net P&amp;L</div>
              <div className={`text-2xl font-semibold ${netPnl >= 0 ? 'fc-text-pos' : 'fc-text-neg'}`}>
                {formatPnlCurrency(netPnl)}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-muted font-semibold uppercase text-xs">Trade History</p>
        </div>

        {trades.length === 0 ? (
          <div className="p-8 fc-surface">
            <p className="text-muted italic">No trades logged yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {trades.map((trade) => {
              const pnl = getCorrectedPnl(trade);
              const pnlClass = pnl >= 0 ? 'fc-text-pos' : 'fc-text-neg';

              return (
                <div key={trade.id} className="fc-card p-5">
                  <div className="text-xs uppercase font-semibold text-muted mb-2">
                    {format(new Date(trade.date_time), 'MMM d, yyyy HH:mm')}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <p className="text-xl md:text-2xl font-semibold text-ink">
                      {trade.asset_pair}
                    </p>
                    <span className={`fc-badge ${trade.direction === 'Long' ? 'fc-badge-win' : 'fc-badge-loss'}`}>
                      {trade.direction}
                    </span>
                    <p className={`text-lg md:text-xl font-semibold ${pnlClass}`}>
                      {formatPnlCurrency(pnl)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <span className="text-xs font-semibold uppercase text-muted mr-2">Result</span>
                      <span className={`fc-badge ${getResultBadgeClass(trade.result)}`}>
                        {trade.result}
                      </span>
                    </div>
                    {trade.strategy_used ? (
                      <div>
                        <span className="text-xs font-semibold uppercase text-muted mr-2">Strategy</span>
                        <span className="text-sm font-semibold text-charcoal">{trade.strategy_used}</span>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
