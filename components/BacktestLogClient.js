'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import Navbar from '@/components/Navbar'
import Image from 'next/image'
import { formatDecimalTrim, formatPnlCurrency, roundPnl } from '@/lib/pnl-money'

export default function BacktestLog({ initialEntries = [], session = null }) {
  const [entries, setEntries] = useState(initialEntries)
  const [strategies, setStrategies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [filters, setFilters] = useState({
    strategyName: '',
    assetPair: '',
    result: '',
    sortBy: 'date_time',
    sortOrder: 'desc',
  })

  useEffect(() => {
    fetchEntries()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters])

  const fetchEntries = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true)
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/backtests?${params.toString()}`, { credentials: 'include' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch backtests')

      startTransition(() => {
        setEntries(data.entries || [])
        setStrategies(Array.isArray(data.strategies) ? data.strategies : [])
        setError('')
      })
    } catch (err) {
      setError(err.message || 'Failed to fetch backtests')
      console.error(err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    startTransition(() => {
      setFilters((prev) => ({ ...prev, [name]: value }))
    })
  }

  const getResultBadgeClass = (result) => {
    switch (result) {
      case 'Win':
        return 'fc-badge-win'
      case 'Loss':
        return 'fc-badge-loss'
      default:
        return 'fc-badge-tag'
    }
  }

  const getCorrectedPnl = (entry) => {
    const base = roundPnl(entry.pnl_absolute ?? 0)
    if (!Number.isFinite(base)) return 0
    if (entry.result === 'Loss' && base > 0) return roundPnl(-Math.abs(base))
    if (entry.result === 'Win' && base < 0) return roundPnl(Math.abs(base))
    return base
  }

  const handleDelete = async (entryId, e) => {
    e.stopPropagation()
    if (!confirm('Delete this backtest entry? This action cannot be undone.')) return

    const backup = entries.find((t) => t.id === entryId)
    setEntries((prev) => prev.filter((t) => t.id !== entryId))
    if (selectedEntry && selectedEntry.id === entryId) setSelectedEntry(null)

    try {
      setDeletingId(entryId)
      const response = await fetch(`/api/backtests/${entryId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete entry')
      }
      setError('')
    } catch (err) {
      if (backup) setEntries((prev) => [...prev, backup])
      setError(err.message || 'Failed to delete entry')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDeleteAll = async () => {
    const scoped = filters.strategyName
    const label = scoped ? `all backtest entries for "${scoped}"` : `ALL ${entries.length} backtest entries`
    if (!confirm(`WARNING: This will permanently delete ${label}.\n\nThis cannot be undone. Continue?`)) return

    const typed = prompt('Type "DELETE" to confirm:')
    if (typed !== 'DELETE') {
      alert('Deletion cancelled.')
      return
    }

    const backup = [...entries]
    setEntries([])
    setSelectedEntry(null)

    try {
      setDeletingAll(true)
      setError('')
      const qs = scoped ? `?strategyName=${encodeURIComponent(scoped)}` : ''
      const response = await fetch(`/api/backtests/delete-all${qs}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete entries')
      }
      const result = await response.json()
      alert(`Deleted ${result.deletedCount || backup.length} backtest entries.`)
      fetchEntries(false)
    } catch (err) {
      setEntries(backup)
      setError(err.message || 'Failed to delete entries')
      alert(`Error: ${err.message}`)
    } finally {
      setDeletingAll(false)
    }
  }

  const totalTrades = entries.length
  const wins = entries.filter((t) => t.result === 'Win').length
  const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0
  const netPnl = entries.reduce((sum, t) => sum + getCorrectedPnl(t), 0)

  if (loading && entries.length === 0) {
    return (
      <>
        <Navbar initialSession={session} />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center text-xl font-semibold text-brown">Loading backtests...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar initialSession={session} />
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="fc-heading-lg text-4xl md:text-5xl mb-2">Backtesting</h1>
            <p className="text-sm text-brown max-w-xl">
              Test strategies with simulated trades. These records are kept completely separate from your live Trade Log.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/backtesting/new" className="fc-btn fc-btn-primary">
              + New Backtest
            </Link>
            <Link href="/backtesting/analytics" className="fc-btn fc-btn-secondary">
              View Analytics
            </Link>
            {entries.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="fc-btn fc-btn-danger"
              >
                {deletingAll ? 'Deleting...' : filters.strategyName ? 'Delete Strategy' : 'Delete All'}
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="fc-card p-4">
            <p className="text-xs font-semibold text-muted uppercase mb-1">Entries</p>
            <p className="text-2xl font-semibold text-ink">{totalTrades}</p>
          </div>
          <div className="fc-card p-4">
            <p className="text-xs font-semibold text-muted uppercase mb-1">Win Rate</p>
            <p className="text-2xl font-semibold fc-text-pos">{winRate.toFixed(1)}%</p>
          </div>
          <div className="fc-card p-4">
            <p className="text-xs font-semibold text-muted uppercase mb-1">Wins</p>
            <p className="text-2xl font-semibold text-ink">{wins}</p>
          </div>
          <div className="fc-card p-4">
            <p className="text-xs font-semibold text-muted uppercase mb-1">Net P&amp;L</p>
            <p className={`text-2xl font-semibold ${netPnl >= 0 ? 'fc-text-pos' : 'fc-text-neg'}`}>
              {formatPnlCurrency(netPnl)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="fc-card p-6 mb-8">
          <h2 className="fc-heading text-lg mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="fc-label">Strategy</label>
              <select
                name="strategyName"
                value={filters.strategyName}
                onChange={handleFilterChange}
                className="fc-input fc-input-sm"
              >
                <option value="">All strategies</option>
                {strategies.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="fc-label">Asset/Pair</label>
              <input
                type="text"
                name="assetPair"
                value={filters.assetPair}
                onChange={handleFilterChange}
                placeholder="Filter by asset..."
                className="fc-input fc-input-sm"
              />
            </div>
            <div>
              <label className="fc-label">Result</label>
              <select
                name="result"
                value={filters.result}
                onChange={handleFilterChange}
                className="fc-input fc-input-sm"
              >
                <option value="">All</option>
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
              </select>
            </div>
          </div>
        </div>

        {error && <div className="fc-banner fc-banner-error mb-6">{error}</div>}

        {(loading || isPending) && entries.length > 0 && (
          <div className="fc-banner fc-banner-info mb-6">Refreshing...</div>
        )}

        {/* Entry List */}
        {entries.length === 0 && !loading ? (
          <div className="fc-card p-8 text-center text-brown">
            No backtest entries yet.{' '}
            <Link href="/backtesting/new" className="text-[#ff3e00] font-semibold hover:underline">
              Add your first backtest trade
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const pnlClass = getCorrectedPnl(entry) >= 0 ? 'fc-text-pos' : 'fc-text-neg'
              return (
                <div
                  key={entry.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedEntry(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedEntry(entry)
                    }
                  }}
                  className="fc-card fc-card-hover p-5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-muted mb-2">
                        {format(new Date(entry.date_time), 'MMM d, yyyy HH:mm')}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {entry.strategy_name && (
                          <span className="fc-badge fc-badge-accent">{entry.strategy_name}</span>
                        )}
                        <p className="text-xl md:text-2xl font-semibold text-ink">{entry.asset_pair}</p>
                        <span className={`fc-badge ${entry.direction === 'Long' ? 'fc-badge-win' : 'fc-badge-loss'}`}>
                          {entry.direction}
                        </span>
                        <p className={`text-lg md:text-xl font-semibold ${pnlClass}`}>
                          {formatPnlCurrency(getCorrectedPnl(entry))}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-muted mr-2">Result</span>
                        <span className={`fc-badge ${getResultBadgeClass(entry.result)}`}>
                          {entry.result}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      disabled={deletingId === entry.id}
                      className="fc-btn fc-btn-danger fc-btn-sm"
                    >
                      {deletingId === entry.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Detail Modal */}
        {selectedEntry && (
          <div
            className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEntry(null)}
          >
            <div
              className="fc-card p-4 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                <h2 className="fc-heading text-2xl md:text-3xl leading-none">Backtest Details</h2>
                <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:gap-2">
                  <Link
                    href={`/backtesting/${selectedEntry.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="fc-btn fc-btn-primary fc-btn-sm text-center"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(selectedEntry.id, e)
                    }}
                    disabled={deletingId === selectedEntry.id}
                    className="fc-btn fc-btn-danger fc-btn-sm"
                  >
                    {deletingId === selectedEntry.id ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="fc-btn fc-btn-secondary fc-btn-sm"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="fc-heading text-base mb-4">Strategy &amp; Identification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-muted uppercase">Strategy</p>
                      <p className="text-base font-medium text-charcoal">{selectedEntry.strategy_name}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Start Date/Time</p>
                      <p className="text-base font-medium text-charcoal">
                        {format(new Date(selectedEntry.date_time), 'MMMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">End Date/Time</p>
                      <p className="text-base font-medium text-charcoal">
                        {selectedEntry.end_date
                          ? format(new Date(selectedEntry.end_date), 'MMMM d, yyyy HH:mm')
                          : format(new Date(selectedEntry.date_time), 'MMMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-muted uppercase">Asset/Pair</p>
                      <p className="text-base font-medium text-charcoal">{selectedEntry.asset_pair}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="fc-heading text-base mb-4">Execution Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Direction</p>
                      <p className="text-base font-medium text-charcoal">{selectedEntry.direction}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Entry Price</p>
                      <p className="text-base font-medium text-charcoal">{formatDecimalTrim(selectedEntry.entry_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Exit Price</p>
                      <p className="text-base font-medium text-charcoal">{formatDecimalTrim(selectedEntry.exit_price)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="fc-heading text-base mb-4">Outcome</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">P&amp;L</p>
                      <p
                        className={`text-base font-semibold ${
                          getCorrectedPnl(selectedEntry) >= 0 ? 'fc-text-pos' : 'fc-text-neg'
                        }`}
                      >
                        {formatPnlCurrency(getCorrectedPnl(selectedEntry))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Result</p>
                      <p
                        className={`text-base font-semibold ${
                          selectedEntry.result === 'Win' ? 'fc-text-pos' : 'fc-text-neg'
                        }`}
                      >
                        {selectedEntry.result}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedEntry.screenshot_url && (
                  <div>
                    <h3 className="fc-heading text-base mb-4">Screenshot Reference</h3>
                    <a
                      href={selectedEntry.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fc-badge fc-badge-tag mb-3 hover:bg-stone-border"
                    >
                      Open Full Image
                    </a>
                    <div className="fc-surface p-2 overflow-hidden">
                      <Image
                        src={selectedEntry.screenshot_url}
                        alt="Backtest screenshot"
                        width={600}
                        height={400}
                        unoptimized={selectedEntry.screenshot_url?.startsWith?.('data:')}
                        className="max-h-96 w-full object-contain rounded-[10px]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
