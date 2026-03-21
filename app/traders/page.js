'use client';

import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import Navbar from '@/components/Navbar';
import Link from 'next/link';

export default function TradersPage() {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('trades');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchTraders = async () => {
      try {
        const res = await fetch('/api/traders');
        if (!res.ok) throw new Error('Failed to fetch traders');
        const data = await res.json();
        setTraders(data);
      } catch (error) {
        console.error('Error fetching traders:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTraders();
  }, []);

  // Sort traders based on selected criteria
  const sortedTraders = [...traders].sort((a, b) => {
    if (sortBy === 'trades') return b.totalTrades - a.totalTrades;
    if (sortBy === 'winrate') return b.winRate - a.winRate;
    if (sortBy === 'name') return a.username.localeCompare(b.username);
    return 0;
  });

  // Filter traders based on search query
  const filteredTraders = sortedTraders.filter((trader) =>
    trader.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-2 border-b-4 border-[#ea580c] pb-4 inline-block">
            Traders Directory
          </h1>
          <p className="text-zinc-400 mt-4">
            Discover and connect with other traders. View their performance metrics and message them for insights.
          </p>
        </div>

        {/* Search & Sort Bar */}
        <div className="mb-8 flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search traders by username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-zinc-900 border-2 border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:border-[#ea580c]"
          />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-zinc-900 border-2 border-zinc-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#ea580c]"
          >
            <option value="trades">Sort by Trades</option>
            <option value="winrate">Sort by Win Rate</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-[#ea580c] border-r-2"></div>
          </div>
        ) : filteredTraders.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-zinc-400 text-lg">No traders found.</p>
          </div>
        ) : (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-zinc-900 border-2 border-zinc-700 rounded-lg p-6">
                <p className="text-zinc-400 text-sm mb-2">Total Traders</p>
                <p className="text-3xl font-bold text-[#ea580c]">{traders.length}</p>
              </div>
              <div className="bg-zinc-900 border-2 border-zinc-700 rounded-lg p-6">
                <p className="text-zinc-400 text-sm mb-2">Total Trades Logged</p>
                <p className="text-3xl font-bold text-[#ea580c]">
                  {traders.reduce((sum, t) => sum + t.totalTrades, 0)}
                </p>
              </div>
              <div className="bg-zinc-900 border-2 border-zinc-700 rounded-lg p-6">
                <p className="text-zinc-400 text-sm mb-2">Avg Win Rate</p>
                <p className="text-3xl font-bold text-[#ea580c]">
                  {traders.length > 0
                    ? Math.round(traders.reduce((sum, t) => sum + t.winRate, 0) / traders.length)
                    : 0}
                  %
                </p>
              </div>
            </div>

            {/* Traders Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTraders.map((trader) => (
                <div
                  key={trader.id}
                  className="bg-zinc-900 border-2 border-zinc-700 rounded-lg p-6 hover:border-[#ea580c] transition-colors group"
                >
                  {/* Trader Header */}
                  <div className="mb-4 pb-4 border-b-2 border-zinc-700">
                    <h3 className="text-xl font-bold text-white group-hover:text-[#ea580c] transition-colors">
                      {trader.username}
                    </h3>
                    <p className="text-zinc-500 text-xs mt-1">
                      Joined {formatDistanceToNow(new Date(trader.joinedAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Stats Grid */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-zinc-500 text-xs uppercase mb-1">Total Trades</p>
                      <p className="text-2xl font-bold text-[#ea580c]">{trader.totalTrades}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 text-xs uppercase mb-1">Win Rate</p>
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-bold text-white">{trader.winRate}%</p>
                        <div className="flex-1 bg-zinc-800 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-[#ea580c] h-full transition-all"
                            style={{ width: `${trader.winRate}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {trader.bestAssetPair && (
                      <div>
                        <p className="text-zinc-500 text-xs uppercase mb-1">Best Asset Pair</p>
                        <p className="text-lg font-semibold text-white">{trader.bestAssetPair}</p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        /* TODO: View profile details */
                      }}
                      className="flex-1 bg-[#ea580c] text-white font-bold py-2 px-4 rounded border-2 border-[#ea580c] hover:bg-zinc-950 transition-colors"
                    >
                      View Profile
                    </button>
                    <button
                      onClick={() => {
                        /* TODO: Message trader */
                      }}
                      className="flex-1 bg-zinc-800 text-white font-bold py-2 px-4 rounded border-2 border-zinc-700 hover:border-[#ea580c] transition-colors"
                    >
                      Message
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && traders.length === 0 && (
          <div className="text-center py-16">
            <p className="text-zinc-400 text-lg">
              No traders yet. Be the first to start logging your trades!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
