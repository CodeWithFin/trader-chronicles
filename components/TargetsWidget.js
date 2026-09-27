'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { formatPnlCurrency } from '@/lib/pnl-money'

function formatAmount(n) {
  return `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

function ProgressRow({ label, period, targetPercent }) {
  if (!period) return null
  const pct = Math.min(period.progressPercent, 100)

  return (
    <div className="mb-5 last:mb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-charcoal text-sm">{label}</span>
          <span className="text-xs text-muted">{targetPercent}% target</span>
          {period.hit && (
            <span className="inline-flex items-center gap-1 fc-badge fc-badge-win">
              <Image src="/trophy-star.png" alt="" width={14} height={14} />
              Target hit
            </span>
          )}
        </div>
        <span className="text-sm font-semibold text-charcoal">
          {formatPnlCurrency(period.pnl)} / {formatAmount(period.targetAmount)}
        </span>
      </div>
      <div className="fc-progress-track">
        <div
          className={`fc-progress-fill ${period.hit ? 'fc-progress-fill-hit' : ''}`}
          style={{ width: `${pct}%` }}
        />
        {[25, 50, 75].map((m) => (
          <div key={m} className="fc-progress-tick" style={{ left: `${m}%` }} />
        ))}
      </div>
    </div>
  )
}

export default function TargetsWidget() {
  const [accounts, setAccounts] = useState([])
  const [accountId, setAccountId] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ weeklyTargetPercent: '', monthlyTargetPercent: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/trading-accounts', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        const list = Array.isArray(d.accounts) ? d.accounts : []
        setAccounts(list)
        if (list.length) {
          setAccountId(list[0].id)
        } else {
          setLoading(false)
        }
      })
      .catch(() => setLoading(false))
  }, [])

  const load = async (id) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/trading-accounts/${id}/targets`, { credentials: 'include' })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Failed to load targets')
      setData(d)
      if (!d.migrationRequired) {
        setForm({
          weeklyTargetPercent: String(d.weeklyTargetPercent),
          monthlyTargetPercent: String(d.monthlyTargetPercent),
        })
      }
      setError('')
    } catch (e) {
      setError(e.message || 'Failed to load targets')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (accountId) load(accountId)
  }, [accountId])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/trading-accounts/${accountId}/targets`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weeklyTargetPercent: parseFloat(form.weeklyTargetPercent),
          monthlyTargetPercent: parseFloat(form.monthlyTargetPercent),
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Save failed')
      setEditing(false)
      await load(accountId)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/trading-accounts/${accountId}/targets`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Reset failed')
      await load(accountId)
    } catch (e) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) {
    return <div className="fc-card p-6 mb-10 text-sm text-brown">Loading targets…</div>
  }

  if (!accounts.length) return null

  if (data?.migrationRequired) {
    return (
      <div className="fc-banner fc-banner-warn mb-10">
        <p className="font-semibold uppercase mb-2 text-xs">Database migration needed</p>
        <p className="leading-relaxed">{data.migrationMessage}</p>
      </div>
    )
  }

  return (
    <div className="fc-card p-6 mb-10">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="fc-heading text-lg">Targets</h2>
        {accounts.length > 1 && (
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="fc-input fc-input-sm w-auto"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && <div className="fc-banner fc-banner-error mb-4">{error}</div>}

      {data && (
        <>
          <ProgressRow label="This week" period={data.weekly} targetPercent={data.weeklyTargetPercent} />
          <ProgressRow label="This month" period={data.monthly} targetPercent={data.monthlyTargetPercent} />
        </>
      )}

      <div className="mt-5 pt-5 border-t border-stone-border">
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)} className="fc-btn fc-btn-ghost fc-btn-sm">
            Edit targets
          </button>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="fc-label">Weekly target %</label>
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={form.weeklyTargetPercent}
                  onChange={(e) => setForm((f) => ({ ...f, weeklyTargetPercent: e.target.value }))}
                  className="fc-input"
                />
              </div>
              <div>
                <label className="fc-label">Monthly target %</label>
                <input
                  type="number"
                  min="0.1"
                  max="100"
                  step="0.1"
                  value={form.monthlyTargetPercent}
                  onChange={(e) => setForm((f) => ({ ...f, monthlyTargetPercent: e.target.value }))}
                  className="fc-input"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={saving} className="fc-btn fc-btn-primary fc-btn-sm">
                {saving ? 'Saving…' : 'Save'}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="fc-btn fc-btn-secondary fc-btn-sm"
              >
                Reset to suggested
              </button>
              <button type="button" onClick={() => setEditing(false)} className="fc-btn fc-btn-ghost fc-btn-sm">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
