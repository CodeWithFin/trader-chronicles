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

  const getResultColor = (result) => {
    switch (result) {
      case 'Win':
        return 'bg-green-100 text-green-900 border-green-600'
      case 'Loss':
        return 'bg-red-100 text-red-900 border-red-600'
      default:
        return 'bg-zinc-100 text-zinc-900 border-zinc-600'
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
          <div className="text-center text-xl font-bold">Loading backtests...</div>
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
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-2">Backtesting</h1>
            <div className="w-full h-1 bg-black"></div>
            <p className="text-sm text-zinc-600 mt-3 max-w-xl">
              Test strategies with simulated trades. These records are kept completely separate from your live Trade Log.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/backtesting/new"
              className="px-6 py-3 border-4 border-black bg-orange-600 text-white font-bold hover:bg-orange-500 transition-colors shadow-brutal-md active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              + New Backtest
            </Link>
            <Link
              href="/backtesting/analytics"
              className="px-6 py-3 border-4 border-black bg-white text-black font-bold hover:bg-zinc-100 transition-colors shadow-brutal-md active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              View Analytics
            </Link>
            {entries.length > 0 && (
              <button
                onClick={handleDeleteAll}
                disabled={deletingAll}
                className="px-6 py-3 border-4 border-black bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-brutal-md active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deletingAll ? 'Deleting...' : filters.strategyName ? 'Delete Strategy' : 'Delete All'}
              </button>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="border-2 border-black bg-white p-4 shadow-brutal-md">
            <p className="text-xs font-bold text-zinc-600 uppercase mb-1">Entries</p>
            <p className="text-3xl font-bold">{totalTrades}</p>
          </div>
          <div className="border-2 border-black bg-white p-4 shadow-brutal-md">
            <p className="text-xs font-bold text-zinc-600 uppercase mb-1">Win Rate</p>
            <p className="text-3xl font-bold text-green-600">{winRate.toFixed(1)}%</p>
          </div>
          <div className="border-2 border-black bg-white p-4 shadow-brutal-md">
            <p className="text-xs font-bold text-zinc-600 uppercase mb-1">Wins</p>
            <p className="text-3xl font-bold">{wins}</p>
          </div>
          <div className="border-2 border-black bg-white p-4 shadow-brutal-md">
            <p className="text-xs font-bold text-zinc-600 uppercase mb-1">Net P&L</p>
            <p className={`text-3xl font-bold ${netPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPnlCurrency(netPnl)}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="border-4 border-black bg-white p-6 mb-8 shadow-brutal-xl">
          <h2 className="text-xl font-bold mb-4 uppercase">Filters</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase">Strategy</label>
              <select
                name="strategyName"
                value={filters.strategyName}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
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
              <label className="block text-sm font-bold mb-2 uppercase">Asset/Pair</label>
              <input
                type="text"
                name="assetPair"
                value={filters.assetPair}
                onChange={handleFilterChange}
                placeholder="Filter by asset..."
                className="w-full px-4 py-2 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 uppercase">Result</label>
              <select
                name="result"
                value={filters.result}
                onChange={handleFilterChange}
                className="w-full px-4 py-2 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
              >
                <option value="">All</option>
                <option value="Win">Win</option>
                <option value="Loss">Loss</option>
              </select>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 border-2 border-black bg-red-50 text-red-900">{error}</div>
        )}

        {(loading || isPending) && entries.length > 0 && (
          <div className="mb-6 p-3 border-2 border-black bg-blue-50 text-blue-900 text-sm">Refreshing...</div>
        )}

        {/* Entry List */}
        {entries.length === 0 && !loading ? (
          <div className="border-4 border-black bg-white p-8 text-center text-zinc-600 shadow-brutal-xl">
            No backtest entries yet.{' '}
            <Link href="/backtesting/new" className="text-orange-600 font-bold hover:underline">
              Add your first backtest trade
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => {
              const pnlColor = getCorrectedPnl(entry) >= 0 ? 'text-green-600' : 'text-red-600'
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
                  className="border-4 border-black bg-white p-5 shadow-brutal-lg hover:-translate-y-[1px] hover:shadow-brutal-xl transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs uppercase font-bold text-zinc-500 mb-2">
                        {format(new Date(entry.date_time), 'MMM d, yyyy HH:mm')}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        {entry.strategy_name && (
                          <span className="px-2 py-1 border-2 border-black bg-orange-100 text-orange-900 text-xs font-bold uppercase">
                            {entry.strategy_name}
                          </span>
                        )}
                        <p className="text-xl md:text-2xl font-bold tracking-tight uppercase">{entry.asset_pair}</p>
                        <span
                          className={`px-2 py-1 border-2 ${
                            entry.direction === 'Long'
                              ? 'border-green-600 bg-green-100 text-green-900'
                              : 'border-red-600 bg-red-100 text-red-900'
                          } font-bold text-xs`}
                        >
                          {entry.direction}
                        </span>
                        <p className={`text-lg md:text-xl font-bold ${pnlColor}`}>
                          {formatPnlCurrency(getCorrectedPnl(entry))}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs font-bold uppercase text-zinc-600 mr-2">Result</span>
                        <span className={`px-2 py-1 border-2 ${getResultColor(entry.result)} font-bold text-xs`}>
                          {entry.result}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(entry.id, e)}
                      disabled={deletingId === entry.id}
                      className="px-3 py-2 border-2 border-black bg-red-600 text-white text-xs md:text-sm font-bold hover:bg-red-500 transition-colors shadow-brutal-sm active:shadow-none active:translate-x-[1px] active:translate-y-[1px] disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedEntry(null)}
          >
            <div
              className="border-4 border-black bg-white p-4 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-brutal-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-6">
                <h2 className="text-3xl font-bold uppercase leading-none">Backtest Details</h2>
                <div className="grid grid-cols-3 gap-2 w-full md:w-auto md:flex md:gap-2">
                  <Link
                    href={`/backtesting/${selectedEntry.id}/edit`}
                    onClick={(e) => e.stopPropagation()}
                    className="px-3 md:px-4 py-2 border-2 border-black bg-orange-600 text-white font-bold text-center hover:bg-orange-500 transition-colors shadow-brutal-sm"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(selectedEntry.id, e)
                    }}
                    disabled={deletingId === selectedEntry.id}
                    className="px-3 md:px-4 py-2 border-2 border-black bg-red-600 text-white font-bold hover:bg-red-500 transition-colors shadow-brutal-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deletingId === selectedEntry.id ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setSelectedEntry(null)}
                    className="px-3 md:px-4 py-2 border-2 border-black bg-zinc-600 text-white font-bold hover:bg-zinc-500 transition-colors shadow-brutal-sm"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold uppercase mb-4">Strategy & Identification</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-sm font-bold text-zinc-600 uppercase">Strategy</p>
                      <p className="text-lg font-semibold">{selectedEntry.strategy_name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-600 uppercase">Start Date/Time</p>
                      <p className="text-lg font-semibold">
                        {format(new Date(selectedEntry.date_time), 'MMMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-600 uppercase">End Date/Time</p>
                      <p className="text-lg font-semibold">
                        {selectedEntry.end_date
                          ? format(new Date(selectedEntry.end_date), 'MMMM d, yyyy HH:mm')
                          : format(new Date(selectedEntry.date_time), 'MMMM d, yyyy HH:mm')}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm font-bold text-zinc-600 uppercase">Asset/Pair</p>
                      <p className="text-lg font-semibold">{selectedEntry.asset_pair}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold uppercase mb-4">Execution Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-bold text-zinc-600 uppercase">Direction</p>
                      <p className="text-lg font-semibold">{selectedEntry.direction}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-600 uppercase">Entry Price</p>
                      <p className="text-lg font-semibold">{formatDecimalTrim(selectedEntry.entry_price)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-600 uppercase">Exit Price</p>
                      <p className="text-lg font-semibold">{formatDecimalTrim(selectedEntry.exit_price)}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-bold uppercase mb-4">Outcome</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-bold text-zinc-600 uppercase">P&L</p>
                      <p
                        className={`text-lg font-semibold ${
                          getCorrectedPnl(selectedEntry) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatPnlCurrency(getCorrectedPnl(selectedEntry))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-600 uppercase">Result</p>
                      <p
                        className={`text-lg font-semibold ${
                          selectedEntry.result === 'Win' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {selectedEntry.result}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedEntry.screenshot_url && (
                  <div>
                    <h3 className="text-lg font-bold uppercase mb-4">Screenshot Reference</h3>
                    <a
                      href={selectedEntry.screenshot_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block border-2 border-black bg-zinc-100 px-3 py-1 text-xs font-bold uppercase hover:bg-zinc-200 mb-3"
                    >
                      Open Full Image
                    </a>
                    <div className="border-2 border-black bg-zinc-50 p-2 overflow-hidden">
                      <Image
                        src={selectedEntry.screenshot_url}
                        alt="Backtest screenshot"
                        width={600}
                        height={400}
                        unoptimized={selectedEntry.screenshot_url?.startsWith?.('data:')}
                        className="max-h-96 w-full object-contain"
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
