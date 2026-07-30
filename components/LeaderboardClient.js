'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { formatPnlCurrency } from '@/lib/pnl-money';

export default function LeaderboardClient({ initialEntries = [], session = null }) {
  const [entries] = useState(initialEntries);
  const [sortBy, setSortBy] = useState('pnl');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedEntries = [...entries].sort((a, b) => {
    if (sortBy === 'pnl') return b.totalPnl - a.totalPnl;
    if (sortBy === 'trades') return b.totalTrades - a.totalTrades;
    if (sortBy === 'winrate') return b.winRate - a.winRate;
    if (sortBy === 'name') return a.username.localeCompare(b.username);
    return 0;
  });

  const filteredEntries = sortedEntries.filter((entry) =>
    entry.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar initialSession={session} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 border-b-4 border-[#ea580c] pb-4 inline-flex items-center gap-3">
            <svg className="w-10 h-10 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden>
              <path d="M0 0h24v24H0z" fill="none" />
              <path
                fill="currentColor"
                d="M15.188 18.688Q16.5 17.375 16.5 15.5t-1.312-3.187T12 11t-3.187 1.313T7.5 15.5t1.313 3.188T12 20t3.188-1.312M9.075 9.7q.5-.275 1.063-.437t1.137-.213L8.75 4h-2.5zm5.85 0l2.85-5.7H15.25l-2.125 4.25l.475.95q.35.1.675.213t.65.287M6.4 18.8q-.425-.725-.663-1.562T5.5 15.5t.238-1.737T6.4 12.2q-1.05.35-1.725 1.238T4 15.5t.675 2.063T6.4 18.8m11.2 0q1.05-.35 1.725-1.237T20 15.5t-.675-2.062T17.6 12.2q.425.725.663 1.563T18.5 15.5t-.238 1.738T17.6 18.8m-7.513 2.913q-.912-.288-1.687-.788q-.225.05-.45.063T7.475 21Q5.2 21 3.6 19.4T2 15.525Q2 13.35 3.45 11.8t3.575-1.725L3 2h7l2 4l2-4h7l-4 8.025q2.125.2 3.563 1.75T22 15.5q0 2.3-1.6 3.9T16.5 21q-.225 0-.462-.012t-.463-.063q-.775.5-1.675.788T12 22t-1.912-.288M9.075 9.7L6.25 4zm5.85 0l2.85-5.7zm-4.775 8.55l.7-2.275L9 14.65h2.275l.725-2.4l.725 2.4H15l-1.85 1.325l.7 2.275l-1.85-1.4z"
              />
            </svg>
            Leaderboard
          </h1>
          <p className="text-zinc-600 mt-4">
            See how members rank by total profit and loss. Open a profile for more detail.
          </p>
        </div>

        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-white border-2 border-black rounded-lg px-4 py-2 text-black placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-white border-2 border-black rounded-lg px-4 py-2 text-black focus:outline-none focus:border-[#ea580c]"
          >
            <option value="pnl">Sort by P&amp;L</option>
            <option value="trades">Sort by Trades</option>
            <option value="winrate">Sort by Win Rate</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        {filteredEntries.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-600 text-lg">No matches.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-white border-2 border-black rounded-lg p-6">
                <p className="text-zinc-600 text-sm mb-2">On leaderboard</p>
                <p className="text-3xl font-bold text-[#ea580c]">{entries.length}</p>
              </div>
              <div className="bg-white border-2 border-black rounded-lg p-6">
                <p className="text-zinc-600 text-sm mb-2">Total Trades Logged</p>
                <p className="text-3xl font-bold text-[#ea580c]">
                  {entries.reduce((sum, t) => sum + t.totalTrades, 0)}
                </p>
              </div>
              <div className="bg-white border-2 border-black rounded-lg p-6">
                <p className="text-zinc-600 text-sm mb-2">Community Net P&amp;L</p>
                <p
                  className={`text-3xl font-bold ${
                    entries.reduce((sum, t) => sum + t.totalPnl, 0) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {formatPnlCurrency(entries.reduce((sum, t) => sum + t.totalPnl, 0))}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEntries.map((entry, index) => {
                const pnlColor = entry.totalPnl >= 0 ? 'text-green-600' : 'text-red-600';

                return (
                  <div
                    key={entry.id}
                    className="bg-white border-2 border-black rounded-lg p-6 hover:border-[#ea580c] transition-colors group flex flex-col"
                  >
                    <div className="mb-4 pb-4 border-b-2 border-zinc-200">
                      <div className="flex items-center gap-2 min-h-[2.25rem]">
                        {index === 0 && (
                          <Image
                            src="/trophy-star.png"
                            alt="1st place"
                            width={36}
                            height={36}
                            className="h-9 w-9 shrink-0 object-contain"
                          />
                        )}
                        <h3 className="text-xl font-bold text-black group-hover:text-[#ea580c] transition-colors min-w-0">
                          {entry.username}
                        </h3>
                      </div>
                      <p className="text-zinc-500 text-xs mt-1">
                        Joined {formatDistanceToNow(new Date(entry.joinedAt), { addSuffix: true })}
                      </p>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div>
                        <p className="text-zinc-500 text-xs uppercase mb-1">Net P&amp;L</p>
                        <p className={`text-2xl font-bold ${pnlColor}`}>
                          {formatPnlCurrency(entry.totalPnl)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs uppercase mb-1">Total Trades</p>
                        <p className="text-2xl font-bold text-[#ea580c]">{entry.totalTrades}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500 text-xs uppercase mb-1">Win Rate</p>
                        <div className="flex items-center gap-3">
                          <p className="text-2xl font-bold text-black">{entry.winRate}%</p>
                          <div className="flex-1 bg-zinc-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-[#ea580c] h-full transition-all"
                              style={{ width: `${entry.winRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      {entry.bestAssetPair && (
                        <div>
                          <p className="text-zinc-500 text-xs uppercase mb-1">Best Asset Pair</p>
                          <p className="text-lg font-semibold text-black">{entry.bestAssetPair}</p>
                        </div>
                      )}
                    </div>

                    <Link
                      href={`/leaderboard/${entry.id}`}
                      className="block w-full mt-auto bg-[#ea580c] text-white font-bold py-2 px-4 rounded border-2 border-[#ea580c] hover:bg-zinc-950 transition-colors text-center"
                    >
                      View Profile
                    </Link>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {entries.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-600 text-lg">
              The leaderboard is empty. Be the first to log your trades!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
