'use client'

import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'

const KINDS = [
  { id: 'eval', label: 'Evaluation / challenge' },
  { id: 'funded', label: 'Funded / instant funded' },
  { id: 'live', label: 'Live / real money' },
  { id: 'other', label: 'Other' },
]

export default function TradingAccountsClient({ session = null }) {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    label: '',
    kind: 'other',
    startingBalance: '10000',
  })

  const load = async () => {
    try {
      const res = await fetch('/api/trading-accounts', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setAccounts(data.accounts || [])
      setError('')
    } catch (e) {
      setError(e.message || 'Failed to load trading accounts')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    const label = form.label.trim()
    if (!label) return
    setCreating(true)
    try {
      const res = await fetch('/api/trading-accounts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          kind: form.kind,
          startingBalance: parseFloat(form.startingBalance) || 10000,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setForm({ label: '', kind: 'other', startingBalance: '10000' })
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this trading account? It must have zero trades.')) return
    try {
      const res = await fetch(`/api/trading-accounts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar initialSession={session} />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center font-bold">Loading…</div>
      </>
    )
  }

  return (
    <>
      <Navbar initialSession={session} />
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
        <h1 className="text-4xl font-bold uppercase tracking-tight mb-2">Trading accounts</h1>
        <div className="w-full h-1 bg-black mb-2" />
        <p className="text-zinc-600 mb-8 text-sm">
          Each trade is tagged to one account so analytics and P&amp;L stay separate (eval, funded, live, etc.).
        </p>

        {error && (
          <div className="mb-6 p-4 border-2 border-black bg-red-50 text-red-900 text-sm">{error}</div>
        )}

        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] mb-8">
          <h2 className="text-lg font-bold uppercase mb-4">Your accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-zinc-600 text-sm">No accounts yet.</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-2 border-black px-4 py-3 bg-zinc-50"
                >
                  <div>
                    <p className="font-bold">{a.label}</p>
                    <p className="text-xs text-zinc-600 uppercase">
                      {KINDS.find((k) => k.id === a.kind)?.label || a.kind} · Starting balance $
                      {Number(a.starting_balance).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="text-xs font-bold uppercase px-3 py-1 border-2 border-black bg-white hover:bg-red-50"
                  >
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-4 border-black bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
          <h2 className="text-lg font-bold uppercase mb-4">Add account</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Label</label>
              <input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Apex 50k eval"
                className="w-full px-3 py-2 border-2 border-black bg-white"
                maxLength={80}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Type</label>
              <select
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-black bg-white"
              >
                {KINDS.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase mb-1">Starting balance (chart baseline)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.startingBalance}
                onChange={(e) => setForm((f) => ({ ...f, startingBalance: e.target.value }))}
                className="w-full px-3 py-2 border-2 border-black bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={creating || !form.label.trim()}
              className="px-6 py-3 border-4 border-black bg-orange-600 text-white font-bold hover:bg-orange-500 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50"
            >
              {creating ? 'Adding…' : 'Add account'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
