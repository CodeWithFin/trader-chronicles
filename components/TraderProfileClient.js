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

function getResultColor(result) {
  switch (result) {
    case 'Win':
      return 'bg-green-100 text-green-900 border-green-600';
    case 'Loss':
      return 'bg-red-100 text-red-900 border-red-600';
    case 'Break Even':
      return 'bg-yellow-100 text-yellow-900 border-yellow-600';
    default:
      return 'bg-zinc-100 text-zinc-900 border-zinc-600';
  }
}

export default function TraderProfileClient({ profile, trades = [], session = null }) {
  if (!profile) {
    return (
      <div className="min-h-screen bg-white text-black">
        <Navbar initialSession={session} />
        <div className="max-w-2xl mx-auto px-4 py-12 text-center py-16 text-zinc-600">
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
    <div className="min-h-screen bg-white text-black">
      <Navbar initialSession={session} />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8 border-b-2 border-zinc-200 pb-6">
          <h1 className="text-4xl font-bold mb-2 uppercase tracking-tight">{profile.username}</h1>
          <p className="text-zinc-600 text-sm mb-2">
            Joined {formatDistanceToNow(new Date(profile.joinedAt), { addSuffix: true })}
          </p>
          <div className="flex flex-wrap gap-6 mt-4">
            <div>
              <div className="text-zinc-500 text-xs uppercase mb-1">Total Trades</div>
              <div className="text-2xl font-bold text-[#ea580c]">{profile.totalTrades}</div>
            </div>
            <div>
              <div className="text-zinc-500 text-xs uppercase mb-1">Win Rate</div>
              <div className="text-2xl font-bold">{profile.winRate}%</div>
            </div>
            {profile.bestAssetPair && (
              <div>
                <div className="text-zinc-500 text-xs uppercase mb-1">Best Asset Pair</div>
                <div className="text-lg font-semibold">{profile.bestAssetPair}</div>
              </div>
            )}
            <div>
              <div className="text-zinc-500 text-xs uppercase mb-1">Net P&amp;L</div>
              <div className={`text-2xl font-bold ${netPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPnlCurrency(netPnl)}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-zinc-500 font-bold uppercase text-xs">Trade History</p>
        </div>

        {trades.length === 0 ? (
          <div className="p-8 border-4 border-black bg-zinc-50 shadow-brutal-xl">
            <p className="text-zinc-400 italic">No trades logged yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {trades.map((trade) => {
              const pnl = getCorrectedPnl(trade);
              const pnlColor = pnl >= 0 ? 'text-green-600' : 'text-red-600';

              return (
                <div
                  key={trade.id}
                  className="border-4 border-black bg-white p-5 shadow-brutal-lg"
                >
                  <div className="text-xs uppercase font-bold text-zinc-500 mb-2">
                    {format(new Date(trade.date_time), 'MMM d, yyyy HH:mm')}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <p className="text-xl md:text-2xl font-bold tracking-tight uppercase">
                      {trade.asset_pair}
                    </p>
                    <span
                      className={`px-2 py-1 border-2 ${
                        trade.direction === 'Long'
                          ? 'border-green-600 bg-green-100 text-green-900'
                          : 'border-red-600 bg-red-100 text-red-900'
                      } font-bold text-xs`}
                    >
                      {trade.direction}
                    </span>
                    <p className={`text-lg md:text-xl font-bold ${pnlColor}`}>
                      {formatPnlCurrency(pnl)}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <div>
                      <span className="text-xs font-bold uppercase text-zinc-600 mr-2">Result</span>
                      <span
                        className={`px-2 py-1 border-2 ${getResultColor(trade.result)} font-bold text-xs`}
                      >
                        {trade.result}
                      </span>
                    </div>
                    {trade.strategy_used ? (
                      <div>
                        <span className="text-xs font-bold uppercase text-zinc-600 mr-2">Strategy</span>
                        <span className="text-sm font-semibold">{trade.strategy_used}</span>
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
