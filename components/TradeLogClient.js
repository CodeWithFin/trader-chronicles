'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import Navbar from '@/components/Navbar'
import Image from 'next/image'
import { formatDecimalTrim, formatPnlCurrency, roundPnl } from '@/lib/pnl-money'

export default function TradeLog({ initialTrades = [], session = null }) {
  const [trades, setTrades] = useState(initialTrades)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedTrade, setSelectedTrade] = useState(null)
  const [deletingTradeId, setDeletingTradeId] = useState(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [accounts, setAccounts] = useState([])
  const [filters, setFilters] = useState({
    assetPair: '',
    result: '',
    accountId: '',
    sortBy: 'date_time',
    sortOrder: 'desc'
  })

  useEffect(() => {
    fetch('/api/trading-accounts', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setAccounts(Array.isArray(d.accounts) ? d.accounts : []))
      .catch(() => setAccounts([]))
  }, [])

  useEffect(() => {
    fetchTrades()
  }, [filters])

  const fetchTrades = async (showLoading = true) => {
    try {
      if (showLoading) {
        setLoading(true)
      }
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value)
      })

      const response = await fetch(`/api/trades?${params.toString()}`)
      if (!response.ok) throw new Error('Failed to fetch trades')

      const data = await response.json()
      // Use startTransition for non-urgent state updates
      startTransition(() => {
        setTrades(data.trades || [])
        setError('')
      })
    } catch (err) {
      setError('Failed to fetch trades')
      console.error(err)
    } finally {
      if (showLoading) {
        setLoading(false)
      }
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    // Use startTransition for filter changes to keep UI responsive
    startTransition(() => {
      setFilters(prev => ({
        ...prev,
        [name]: value
      }))
    })
  }

  const handleSort = (field) => {
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: prev.sortBy === field && prev.sortOrder === 'asc' ? 'desc' : 'asc'
    }))
  }

  const getResultBadgeClass = (result) => {
    switch (result) {
      case 'Win': return 'fc-badge-win'
      case 'Loss': return 'fc-badge-loss'
      case 'Break Even': return 'fc-badge-neutral'
      default: return 'fc-badge-tag'
    }
  }

  const getCorrectedPnl = (trade) => {
    const base = roundPnl(trade.pnl_absolute ?? 0)
    if (!Number.isFinite(base)) return 0
    if (trade.result === 'Loss' && base > 0) return roundPnl(-Math.abs(base))
    if (trade.result === 'Win' && base < 0) return roundPnl(Math.abs(base))
    return base
  }

  const handleDelete = async (tradeId, e) => {
    e.stopPropagation() // Prevent opening the modal when clicking delete

    if (!confirm('Are you sure you want to delete this trade? This action cannot be undone.')) {
      return
    }

    // Optimistic update: Remove from UI immediately
    const tradeToDelete = trades.find(t => t.id === tradeId)
    setTrades(prevTrades => prevTrades.filter(trade => trade.id !== tradeId))

    // Close modal if the deleted trade was selected
    if (selectedTrade && selectedTrade.id === tradeId) {
      setSelectedTrade(null)
    }

    try {
      setDeletingTradeId(tradeId)
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete trade')
      }

      setError('')
    } catch (err) {
      // Rollback on error: Restore the trade
      if (tradeToDelete) {
        setTrades(prevTrades => {
          // Insert back in the correct position (sorted by date_time desc)
          const newTrades = [...prevTrades, tradeToDelete]
          return newTrades.sort((a, b) => {
            const dateA = new Date(a.date_time)
            const dateB = new Date(b.date_time)
            return filters.sortOrder === 'asc' ? dateA - dateB : dateB - dateA
          })
        })
      }
      setError(err.message || 'Failed to delete trade')
      console.error(err)
    } finally {
      setDeletingTradeId(null)
    }
  }

  const handleDeleteAll = async () => {
    // Double confirmation for safety
    const firstConfirm = confirm(
      `⚠️ WARNING: This will delete ALL ${trades.length} trades permanently!\n\n` +
      'This action CANNOT be undone. Are you absolutely sure?'
    )

    if (!firstConfirm) return

    const secondConfirm = confirm(
      'FINAL CONFIRMATION: You are about to delete ALL your trades.\n\n' +
      'Type "DELETE ALL" in the next prompt to confirm, or click Cancel to abort.'
    )

    if (!secondConfirm) return

    const typedConfirm = prompt(
      'Type "DELETE ALL" (in all caps) to confirm deletion of all trades:'
    )

    if (typedConfirm !== 'DELETE ALL') {
      alert('Deletion cancelled. The text did not match.')
      return
    }

    // Optimistic update: Clear UI immediately
    const tradesBackup = [...trades]
    const selectedTradeBackup = selectedTrade
    setTrades([])
    setSelectedTrade(null)

    try {
      setDeletingAll(true)
      setError('')

      const response = await fetch('/api/trades/delete-all', {
        method: 'DELETE',
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete all trades')
      }

      const result = await response.json()
      alert(`Successfully deleted ${result.deletedCount || tradesBackup.length} trades.`)
      setError('')
    } catch (err) {
      // Rollback on error: Restore all trades
      setTrades(tradesBackup)
      setSelectedTrade(selectedTradeBackup)
      setError(err.message || 'Failed to delete all trades')
      console.error(err)
      alert(`Error: ${err.message}`)
    } finally {
      setDeletingAll(false)
    }
  }


  // Show cached data while loading if available
  const displayTrades = trades.length > 0 ? trades : []

  if (loading && displayTrades.length === 0) {
    return (
      <>
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-16">
          <div className="text-center text-xl font-semibold text-brown">Loading trades...</div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">
        <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="fc-heading-lg text-4xl md:text-5xl inline-flex items-center gap-3">
              <svg className="w-9 h-9 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden>
                <path d="M0 0h48v48H0z" fill="none" />
                <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="4">
                  <path d="M13 10h28v34H13z" />
                  <path strokeLinecap="round" d="M35 10V4H8a1 1 0 0 0-1 1v33h6m8-16h12m-12 8h12" />
                </g>
              </svg>
              Trade Log
            </h1>
          </div>
          <div className="flex gap-3">
            <Link href="/trades/new" className="fc-btn fc-btn-primary">
              + New Trade
            </Link>
            {displayTrades.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="fc-btn fc-btn-danger"
              >
                {deletingAll ? 'Deleting...' : 'Delete All Trades'}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="fc-card p-6 mb-8">
          <h2 className="fc-heading text-lg mb-4">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="fc-label">Account</label>
              <select
                name="accountId"
                value={filters.accountId}
                onChange={handleFilterChange}
                className="fc-input fc-input-sm"
              >
                <option value="">All accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
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

        {(loading || isPending) && displayTrades.length > 0 && (
          <div className="fc-banner fc-banner-info mb-6">Refreshing trades...</div>
        )}

        {/* Trade List */}
        {displayTrades.length === 0 && !loading ? (
          <div className="fc-card p-8 text-center text-brown">
            No trades found. <Link href="/trades/new" className="text-[#ff3e00] font-semibold hover:underline">Create your first trade entry</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {displayTrades.map((trade) => {
              const pnlClass = getCorrectedPnl(trade) >= 0 ? 'fc-text-pos' : 'fc-text-neg'

              return (
                <div
                  key={trade.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTrade(trade)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setSelectedTrade(trade)
                    }
                  }}
                  className="fc-card fc-card-hover p-5 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-muted mb-2">
                        {format(new Date(trade.date_time), 'MMM d, yyyy HH:mm')}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {trade.account_label && (
                          <span className="fc-badge fc-badge-tag">{trade.account_label}</span>
                        )}
                        <p className="text-xl md:text-2xl font-semibold text-ink">{trade.asset_pair}</p>
                        <span className={`fc-badge ${trade.direction === 'Long' ? 'fc-badge-win' : 'fc-badge-loss'}`}>
                          {trade.direction}
                        </span>
                        <p className={`text-lg md:text-xl font-semibold ${pnlClass}`}>
                          {formatPnlCurrency(getCorrectedPnl(trade))}
                        </p>
                      </div>

                      <div>
                        <span className="text-xs font-semibold text-muted mr-2">Result</span>
                        <span className={`fc-badge ${getResultBadgeClass(trade.result)}`}>
                          {trade.result}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => handleDelete(trade.id, e)}
                      disabled={deletingTradeId === trade.id}
                      className="fc-btn fc-btn-danger fc-btn-sm"
                    >
                      {deletingTradeId === trade.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Trade Detail Modal */}
        {selectedTrade && (
          <div className="fixed inset-0 bg-[var(--overlay)] flex items-center justify-center p-4 z-50" onClick={() => setSelectedTrade(null)}>
            <div className="fc-card p-4 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                <h2 className="fc-heading text-2xl md:text-3xl leading-none">Trade Details</h2>
                <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:gap-2">
                  <Link
                    href={`/trades/${selectedTrade.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="fc-btn fc-btn-primary fc-btn-sm text-center"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(selectedTrade.id, e)
                    }}
                    disabled={deletingTradeId === selectedTrade.id}
                    className="fc-btn fc-btn-danger fc-btn-sm"
                  >
                    {deletingTradeId === selectedTrade.id ? 'Deleting...' : 'Delete Trade'}
                  </button>
                  <button
                    onClick={() => setSelectedTrade(null)}
                    className="fc-btn fc-btn-secondary fc-btn-sm"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="space-y-6">
                {/* Trade Identification */}
                <div>
                  <h3 className="fc-heading text-base mb-4">Trade Identification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Start Date/Time</p>
                      <p className="text-base font-medium text-charcoal">{format(new Date(selectedTrade.date_time), 'MMMM d, yyyy HH:mm')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">End Date/Time</p>
                      <p className="text-base font-medium text-charcoal">
                        {selectedTrade.end_date
                          ? format(new Date(selectedTrade.end_date), 'MMMM d, yyyy HH:mm')
                          : format(new Date(selectedTrade.date_time), 'MMMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    {selectedTrade.account_label && (
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-muted uppercase">Trading account</p>
                        <p className="text-base font-medium text-charcoal">{selectedTrade.account_label}</p>
                      </div>
                    )}
                    <div className="col-span-2">
                      <p className="text-xs font-semibold text-muted uppercase">Asset/Pair</p>
                      <p className="text-base font-medium text-charcoal">{selectedTrade.asset_pair}</p>
                    </div>
                  </div>
                </div>

                {/* Execution Details */}
                <div>
                  <h3 className="fc-heading text-base mb-4">Execution Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Direction</p>
                      <p className="text-base font-medium text-charcoal">{selectedTrade.direction}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Entry Price</p>
                      <p className="text-base font-medium text-charcoal">{formatDecimalTrim(selectedTrade.entry_price)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Exit Price</p>
                      <p className="text-base font-medium text-charcoal">{formatDecimalTrim(selectedTrade.exit_price)}</p>
                    </div>
                  </div>
                </div>

                {/* Outcome */}
                <div>
                  <h3 className="fc-heading text-base mb-4">Outcome</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">P&amp;L</p>
                      <p
                        className={`text-base font-semibold ${
                          getCorrectedPnl(selectedTrade) >= 0 ? 'fc-text-pos' : 'fc-text-neg'
                        }`}
                      >
                        {formatPnlCurrency(getCorrectedPnl(selectedTrade))}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-muted uppercase">Result</p>
                      <p className={`text-base font-semibold ${selectedTrade.result === 'Win' ? 'fc-text-pos' : 'fc-text-neg'}`}>
                        {selectedTrade.result}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedTrade.screenshot_url && (
                  <div>
                    <h3 className="fc-heading text-base mb-4">Screenshot Reference</h3>
                    <a
                      href={selectedTrade.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="fc-badge fc-badge-tag mb-3 hover:bg-stone-border"
                    >
                      Open Full Image
                    </a>
                    <div className="fc-surface p-2 overflow-hidden">
                      <Image
                        src={selectedTrade.screenshot_url}
                        alt="Trade screenshot"
                        width={600}
                        height={400}
                        unoptimized={selectedTrade.screenshot_url?.startsWith?.('data:')}
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
