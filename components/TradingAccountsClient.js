'use client'

import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'

const KINDS = [
  { id: 'eval',   label: 'Evaluation / challenge' },
  { id: 'funded', label: 'Funded / instant funded' },
  { id: 'live',   label: 'Live / real money' },
  { id: 'other',  label: 'Other' },
]

const emptyForm = {
  label: '',
  kind: 'other',
  startingBalance: '10000',
}

export default function TradingAccountsClient({ session = null }) {
  const [accounts, setAccounts]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [creating, setCreating]   = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm]   = useState({})
  const [form, setForm]           = useState(emptyForm)

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/trading-accounts', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setAccounts(data.accounts || [])
      setError('')
    } catch (e) {
      setError(e.message || 'Failed to load trading accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    const label = form.label.trim()
    if (!label) return
    setCreating(true)
    setError('')
    try {
      const res  = await fetch('/api/trading-accounts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          kind:            form.kind,
          startingBalance: parseFloat(form.startingBalance) || 10000,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setForm(emptyForm)
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (account) => {
    setEditingId(account.id)
    setEditForm({
      label:           account.label,
      kind:            account.kind,
      startingBalance: String(account.starting_balance),
    })
  }

  const handleCancelEdit = () => { setEditingId(null); setEditForm({}) }

  const handleSaveEdit = async (id) => {
    const label = editForm.label.trim()
    if (!label) return
    try {
      const res  = await fetch(`/api/trading-accounts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          kind:            editForm.kind,
          startingBalance: parseFloat(editForm.startingBalance) || 10000,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setEditingId(null)
      setEditForm({})
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this trading account?')) return
    try {
      const res  = await fetch(`/api/trading-accounts/${id}`, { method: 'DELETE', credentials: 'include' })
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
        <div className="max-w-3xl mx-auto px-4 py-16 text-center font-semibold text-brown">Loading…</div>
      </>
    )
  }

  return (
    <>
      <Navbar initialSession={session} />
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
        <h1 className="fc-heading-lg text-4xl mb-2 inline-flex items-center gap-3">
          <svg className="w-8 h-8 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden>
            <path d="M0 0h48v48H0z" fill="none" />
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
              <path d="M12.527 7c.551-2.024 2.29-3.486 4.473-3.643C19.556 3.173 23.335 3 28.5 3c5.133 0 8.897.171 11.452.354c2.558.182 4.512 2.136 4.694 4.694c.183 2.555.354 6.32.354 11.452c0 5.165-.173 8.944-.357 11.5c-.157 2.183-1.62 3.922-3.643 4.473" />
              <path d="M35.646 17.047c-.182-2.557-2.136-4.51-4.694-4.693C28.397 12.17 24.632 12 19.5 12c-5.133 0-8.897.171-11.452.354c-2.558.182-4.512 2.136-4.694 4.694C3.17 19.602 3 23.367 3 28.5s.171 8.897.354 11.453c.182 2.557 2.136 4.51 4.694 4.693c2.555.183 6.32.354 11.452.354c5.133 0 8.897-.171 11.452-.354c2.558-.182 4.512-2.136 4.694-4.694c.183-2.555.354-6.32.354-11.452c0-5.133-.171-8.897-.354-11.453" />
              <path d="M24.026 30.727a7 7 0 1 0-8.066-.01c-2.496.933-4.485 2.709-5.5 4.92c-.646 1.405.16 3.087 1.704 3.18l.044.003a150 150 0 0 0 7.77.18c3.309 0 5.874-.081 7.77-.18l.045-.003c1.543-.093 2.35-1.775 1.704-3.18c-1.012-2.203-2.989-3.974-5.471-4.91" />
            </g>
          </svg>
          Trading accounts
        </h1>
        <p className="text-brown mb-8 text-sm">
          Add accounts to track performance separately — Equity Edge, Just Markets, Valetax, or any other.
          Trades are linked automatically via the MT5 EA on your <a href="/settings" className="text-[#ff3e00] hover:underline">Settings</a> page.
        </p>

        {error && <div className="mb-6 fc-banner fc-banner-error">{error}</div>}

        {/* Accounts list */}
        <div className="fc-card p-6 mb-8">
          <h2 className="fc-heading text-lg mb-4">Your accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-brown text-sm">No accounts yet — add one below.</p>
          ) : (
            <ul className="space-y-3">
              {accounts.map((a) => (
                <li key={a.id} className="fc-surface px-4 py-3">
                  {editingId === a.id ? (
                    /* ─── Edit mode ─── */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <label className="fc-label">Label</label>
                          <input
                            value={editForm.label}
                            onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))}
                            className="fc-input"
                            maxLength={80}
                          />
                        </div>
                        <div>
                          <label className="fc-label">Account type</label>
                          <select
                            value={editForm.kind}
                            onChange={e => setEditForm(f => ({ ...f, kind: e.target.value }))}
                            className="fc-input"
                          >
                            {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="fc-label">Starting balance ($)</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editForm.startingBalance}
                            onChange={e => setEditForm(f => ({ ...f, startingBalance: e.target.value }))}
                            className="fc-input"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => handleSaveEdit(a.id)} className="fc-btn fc-btn-primary">Save</button>
                        <button type="button" onClick={handleCancelEdit} className="fc-btn fc-btn-secondary">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* ─── View mode ─── */
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-charcoal">{a.label}</p>
                        <p className="text-xs text-brown uppercase">
                          {KINDS.find(k => k.id === a.kind)?.label || a.kind} · $
                          {Number(a.starting_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => handleEdit(a)} className="fc-btn fc-btn-ghost fc-btn-sm">Edit</button>
                        <button type="button" onClick={() => handleDelete(a.id)} className="fc-btn fc-btn-danger fc-btn-sm">Delete</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add account form */}
        <div className="fc-card p-6">
          <h2 className="fc-heading text-lg mb-1">Add account</h2>
          <p className="text-xs text-brown mb-4">
            Give it a name, pick a type, and set your starting balance. That&apos;s it.
          </p>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="fc-label">Label</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Just Markets 10k Funded"
                  className="fc-input"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="fc-label">Account type</label>
                <select
                  value={form.kind}
                  onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}
                  className="fc-input"
                >
                  {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>
              <div>
                <label className="fc-label">Starting balance ($)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.startingBalance}
                  onChange={e => setForm(f => ({ ...f, startingBalance: e.target.value }))}
                  className="fc-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={creating || !form.label.trim()}
              className="fc-btn fc-btn-primary"
            >
              {creating ? 'Adding…' : 'Add account'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
