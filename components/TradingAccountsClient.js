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
  const [migrationNotice, setMigrationNotice] = useState('')
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
      setMigrationNotice(data.migrationRequired ? data.migrationMessage || '' : '')
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
        <h1 className="text-4xl font-bold uppercase tracking-tight mb-2 inline-flex items-center gap-3">
          <svg className="w-9 h-9 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden>
            <path d="M0 0h48v48H0z" fill="none" />
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
              <path d="M12.527 7c.551-2.024 2.29-3.486 4.473-3.643C19.556 3.173 23.335 3 28.5 3c5.133 0 8.897.171 11.452.354c2.558.182 4.512 2.136 4.694 4.694c.183 2.555.354 6.32.354 11.452c0 5.165-.173 8.944-.357 11.5c-.157 2.183-1.62 3.922-3.643 4.473" />
              <path d="M35.646 17.047c-.182-2.557-2.136-4.51-4.694-4.693C28.397 12.17 24.632 12 19.5 12c-5.133 0-8.897.171-11.452.354c-2.558.182-4.512 2.136-4.694 4.694C3.17 19.602 3 23.367 3 28.5s.171 8.897.354 11.453c.182 2.557 2.136 4.51 4.694 4.693c2.555.183 6.32.354 11.452.354c5.133 0 8.897-.171 11.452-.354c2.558-.182 4.512-2.136 4.694-4.694c.183-2.555.354-6.32.354-11.452c0-5.133-.171-8.897-.354-11.453" />
              <path d="M24.026 30.727a7 7 0 1 0-8.066-.01c-2.496.933-4.485 2.709-5.5 4.92c-.646 1.405.16 3.087 1.704 3.18l.044.003a150 150 0 0 0 7.77.18c3.309 0 5.874-.081 7.77-.18l.045-.003c1.543-.093 2.35-1.775 1.704-3.18c-1.012-2.203-2.989-3.974-5.471-4.91" />
            </g>
          </svg>
          Trading accounts
        </h1>
        <div className="w-full h-1 bg-black mb-2" />
        <p className="text-zinc-600 mb-8 text-sm">
          Each trade is tagged to one account so analytics and P&amp;L stay separate (eval, funded, live, etc.).
        </p>

        {migrationNotice && (
          <div className="mb-6 border-4 border-black bg-amber-50 p-4 text-sm text-black shadow-brutal-md">
            <p className="font-bold uppercase mb-2">Database migration needed</p>
            <p className="leading-relaxed">{migrationNotice}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 border-2 border-black bg-red-50 text-red-900 text-sm">{error}</div>
        )}

        <div className="border-4 border-black bg-white p-6 shadow-brutal-xl mb-8">
          <h2 className="text-lg font-bold uppercase mb-4">Your accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-zinc-600 text-sm">
              {migrationNotice ? 'Run the migration above, then reload — your accounts will appear here.' : 'No accounts yet.'}
            </p>
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

        <div className={`border-4 border-black bg-white p-6 shadow-brutal-xl ${migrationNotice ? 'opacity-60 pointer-events-none' : ''}`}>
          <h2 className="text-lg font-bold uppercase mb-4">Add account</h2>
          {migrationNotice && (
            <p className="mb-4 text-xs font-bold uppercase text-zinc-500">Unavailable until the database migration is applied.</p>
          )}
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
              disabled={creating || !form.label.trim() || !!migrationNotice}
              className="px-6 py-3 border-4 border-black bg-orange-600 text-white font-bold hover:bg-orange-500 shadow-brutal-md disabled:opacity-50"
            >
              {creating ? 'Adding…' : 'Add account'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
