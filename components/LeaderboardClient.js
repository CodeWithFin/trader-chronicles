'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function LeaderboardClient({ initialEntries = [], session = null }) {
  const [entries] = useState(initialEntries);
  const [sortBy, setSortBy] = useState('trades');
  const [searchQuery, setSearchQuery] = useState('');

  const sortedEntries = [...entries].sort((a, b) => {
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
          <h1 className="text-4xl md:text-5xl font-bold mb-2 border-b-4 border-[#ea580c] pb-4 inline-block">
            Leaderboard
          </h1>
          <p className="text-zinc-600 mt-4">
            See how members rank by activity and win rate. Open a profile for more detail.
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
                <p className="text-zinc-600 text-sm mb-2">Avg Win Rate</p>
                <p className="text-3xl font-bold text-[#ea580c]">
                  {entries.length > 0
                    ? Math.round(entries.reduce((sum, t) => sum + t.winRate, 0) / entries.length)
                    : 0}
                  %
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEntries.map((entry, index) => (
                <div
                  key={entry.id}
                  className="bg-white border-2 border-black rounded-lg p-6 hover:border-[#ea580c] transition-colors group"
                >
                  <div className="mb-4 pb-4 border-b-2 border-zinc-200">
                    <div className="flex items-center gap-2">
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
                    className="block w-full bg-[#ea580c] text-white font-bold py-2 px-4 rounded border-2 border-[#ea580c] hover:bg-zinc-950 transition-colors text-center"
                  >
                    View Profile
                  </Link>
                </div>
              ))}
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
