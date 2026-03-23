'use client';

import { formatDistanceToNow } from 'date-fns';
import Navbar from '@/components/Navbar';

export default function TraderProfileClient({ profile, session = null }) {
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

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar initialSession={session} />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="mb-8 border-b-2 border-zinc-200 pb-6">
          <h1 className="text-4xl font-bold mb-2 uppercase tracking-tight">{profile.username}</h1>
          <p className="text-zinc-600 text-sm mb-2">
            Joined {formatDistanceToNow(new Date(profile.joinedAt), { addSuffix: true })}
          </p>
          <div className="flex gap-6 mt-4">
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
          </div>
        </div>
        {/* Future content could go here */}
        <div className="p-8 border-4 border-black bg-zinc-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
           <p className="text-zinc-500 font-bold uppercase text-xs mb-2">Public Feed</p>
           <p className="text-zinc-400 italic">No public trade logs shared by this trader yet.</p>
        </div>
      </div>
    </div>
  );
}
