'use client'

import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import Link from 'next/link'

const STATUS_LABELS = {
  active: { label: 'Active', cls: 'fc-badge-neutral' },
  closed: { label: 'TP Hit', cls: 'fc-badge-win' },
  stopped: { label: 'SL Hit', cls: 'fc-badge-loss' },
  cancelled: { label: 'Cancelled', cls: 'fc-badge-tag' },
}

const DIRECTION_CLS = {
  Long: 'fc-text-pos',
  Short: 'fc-text-neg',
}

function SignalCard({ signal, currentUserId, onStatusChange, onDelete }) {
  const [updating, setUpdating] = useState(false)
  const isOwner = currentUserId && signal.user_id === currentUserId
  const statusMeta = STATUS_LABELS[signal.status] || STATUS_LABELS.active

  const handleStatus = async (status) => {
    setUpdating(true)
    try {
      const res = await fetch(`/api/signals/${signal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      })
      if (res.ok) onStatusChange(signal.id, status)
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this signal?')) return
    setUpdating(true)
    try {
      const res = await fetch(`/api/signals/${signal.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (res.ok) onDelete(signal.id)
    } finally {
      setUpdating(false)
    }
  }

  return (
    <div className="fc-card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-lg ${DIRECTION_CLS[signal.direction]}`}>
            {signal.direction === 'Long' ? '▲' : '▼'} {signal.asset_pair}
          </span>
          <span className={`fc-badge ${statusMeta.cls}`}>{statusMeta.label}</span>
          <span className={`fc-badge ${signal.direction === 'Long' ? 'fc-badge-win' : 'fc-badge-loss'}`}>
            {signal.direction}
          </span>
        </div>
        <span className="text-xs text-muted">
          {formatDistanceToNow(new Date(signal.created_at), { addSuffix: true })}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-sm">
        {signal.entry_price != null && (
          <div>
            <span className="text-muted text-xs uppercase mr-1">Entry</span>
            <span className="font-semibold text-ink">{signal.entry_price}</span>
          </div>
        )}
        {signal.stop_loss != null && (
          <div>
            <span className="text-muted text-xs uppercase mr-1">SL</span>
            <span className="font-semibold text-[var(--alert)]">{signal.stop_loss}</span>
          </div>
        )}
        {signal.take_profit != null && (
          <div>
            <span className="text-muted text-xs uppercase mr-1">TP</span>
            <span className="font-semibold text-[var(--mint)]">{signal.take_profit}</span>
          </div>
        )}
      </div>

      {signal.notes && (
        <p className="text-sm text-brown leading-relaxed">{signal.notes}</p>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
        <Link href={`/leaderboard/${signal.user_id}`} className="text-xs text-muted hover:text-charcoal transition-colors font-semibold">
          @{signal.username}
        </Link>

        {isOwner && signal.status === 'active' && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleStatus('closed')}
              disabled={updating}
              className="fc-btn fc-btn-sm fc-btn-secondary text-[var(--mint)] text-xs"
            >
              TP Hit
            </button>
            <button
              onClick={() => handleStatus('stopped')}
              disabled={updating}
              className="fc-btn fc-btn-sm fc-btn-secondary text-[var(--alert)] text-xs"
            >
              SL Hit
            </button>
            <button
              onClick={() => handleStatus('cancelled')}
              disabled={updating}
              className="fc-btn fc-btn-sm fc-btn-secondary text-xs"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={updating}
              className="fc-btn fc-btn-sm fc-btn-ghost text-xs text-[var(--alert)]"
            >
              Delete
            </button>
          </div>
        )}
        {isOwner && signal.status !== 'active' && (
          <button
            onClick={handleDelete}
            disabled={updating}
            className="fc-btn fc-btn-sm fc-btn-ghost text-xs text-[var(--alert)]"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

export default function SignalFeedClient({ initialSignals = [], currentUserId = null }) {
  const [signals, setSignals] = useState(initialSignals)
  const [filter, setFilter] = useState('all')

  const filtered = filter === 'all' ? signals : signals.filter((s) => s.status === filter)

  const handleStatusChange = (id, status) => {
    setSignals((prev) => prev.map((s) => s.id === id ? { ...s, status } : s))
  }

  const handleDelete = (id) => {
    setSignals((prev) => prev.filter((s) => s.id !== id))
  }

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'active', label: 'Active' },
    { key: 'closed', label: 'TP Hit' },
    { key: 'stopped', label: 'SL Hit' },
  ]

  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-6">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`fc-btn fc-btn-sm ${filter === f.key ? 'fc-btn-primary' : 'fc-btn-secondary'}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="fc-card p-12 text-center text-muted">
          No signals yet. Be the first to post one.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((signal) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              currentUserId={currentUserId}
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
