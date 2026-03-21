'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { formatDistanceToNow } from 'date-fns';

export default function TraderProfilePage() {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/traders/${id}`);
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || 'Failed to load profile');
        }
        setProfile(await res.json());
      } catch (e) {
        setError(e.message || 'Could not load profile');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-12">
        {loading ? (
          <div className="text-center py-16">Loading...</div>
        ) : error ? (
          <div className="text-center py-16 text-red-600">{error}</div>
        ) : profile ? (
          <>
            <div className="mb-8 border-b-2 border-zinc-200 pb-6">
              <h1 className="text-4xl font-bold mb-2">{profile.username}</h1>
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
            {/* Future: Add trade history, charts, messaging, etc. */}
          </>
        ) : null}
      </div>
    </div>
  );
}
