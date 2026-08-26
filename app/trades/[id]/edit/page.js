'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export default function EditTradeForm() {
  const router = useRouter()
  const params = useParams()
  const tradeId = params.id
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [accounts, setAccounts] = useState([])
  // Helper to format time as HH:mm
  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  // Helper to combine date and time
  const combineDateTime = (date, time) => {
    const [hours, minutes] = time.split(':').map(Number)
    const combined = new Date(date)
    combined.setHours(hours || 0, minutes || 0, 0, 0)
    return combined
  }

  const [formData, setFormData] = useState({
    startDate: new Date(),
    startTime: '00:00',
    endDate: new Date(),
    endTime: '00:00',
    assetPair: '',
    direction: 'Long',
    entryPrice: '',
    exitPrice: '',
    result: 'Win',
    pnlAbsolute: '',
    accountId: '',
  })

  // Helper to correct P&L for display
  const getCorrectedPnl = (trade) => {
    if (trade.result === 'Loss' && trade.pnl_absolute > 0) {
      return -Math.abs(trade.pnl_absolute)
    } else if (trade.result === 'Win' && trade.pnl_absolute < 0) {
      return Math.abs(trade.pnl_absolute)
    }
    return trade.pnl_absolute
  }

  // Check authentication and fetch trade data
  useEffect(() => {
    const checkAuthAndFetch = async () => {
      try {
        const authRes = await fetch('/api/auth/session', { credentials: 'include' })
        const authData = await authRes.json()
        if (!authData.user) {
          router.push('/login')
          return
        }
        setCheckingAuth(false)

        // Fetch trade data
        const response = await fetch(`/api/trades/${tradeId}`, {
          credentials: 'include'
        })

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Trade not found')
          }
          throw new Error('Failed to fetch trade')
        }

        const trade = await response.json()

        // Pre-populate form with trade data (using corrected P&L)
        const correctedPnl = getCorrectedPnl(trade)
        const startDateTime = new Date(trade.date_time)
        const endDateTime = trade.end_date ? new Date(trade.end_date) : new Date(trade.date_time)
        setFormData({
          startDate: new Date(startDateTime.getFullYear(), startDateTime.getMonth(), startDateTime.getDate()),
          startTime: formatTime(startDateTime),
          endDate: new Date(endDateTime.getFullYear(), endDateTime.getMonth(), endDateTime.getDate()),
          endTime: formatTime(endDateTime),
          assetPair: trade.asset_pair || '',
          direction: trade.direction || 'Long',
          entryPrice: trade.entry_price?.toString() || '',
          exitPrice: trade.exit_price?.toString() || '',
          result: trade.result || 'Win',
          pnlAbsolute: correctedPnl.toString(),
          accountId: trade.account_id || '',
        })
        const accRes = await fetch('/api/trading-accounts', { credentials: 'include' })
        const accData = await accRes.json()
        setAccounts(Array.isArray(accData.accounts) ? accData.accounts : [])
        setFetching(false)
      } catch (err) {
        console.error('Error:', err)
        setError(err.message || 'Failed to load trade')
        setFetching(false)
        setCheckingAuth(false)
      }
    }
    checkAuthAndFetch()
  }, [tradeId, router])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => {
      const updated = {
        ...prev,
        [name]: value
      }

      // Auto-adjust P&L sign based on Win/Loss selection
      if (name === 'result') {
        const pnlValue = parseFloat(prev.pnlAbsolute)
        if (!isNaN(pnlValue) && pnlValue !== 0) {
          if (value === 'Loss' && pnlValue > 0) {
            updated.pnlAbsolute = (-Math.abs(pnlValue)).toString()
          } else if (value === 'Win' && pnlValue < 0) {
            updated.pnlAbsolute = Math.abs(pnlValue).toString()
          }
        }
      }

      // Auto-adjust Win/Loss based on P&L sign
      if (name === 'pnlAbsolute') {
        const pnlValue = parseFloat(value)
        if (!isNaN(pnlValue)) {
          if (pnlValue < 0 && prev.result === 'Win') {
            updated.result = 'Loss'
          } else if (pnlValue > 0 && prev.result === 'Loss') {
            updated.result = 'Win'
          }
        }
      }

      return updated
    })
  }

  const handleStartDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      startDate: date
    }))
  }

  const handleStartTimeChange = (e) => {
    setFormData(prev => ({
      ...prev,
      startTime: e.target.value
    }))
  }

  const handleEndDateChange = (date) => {
    setFormData(prev => ({
      ...prev,
      endDate: date
    }))
  }

  const handleEndTimeChange = (e) => {
    setFormData(prev => ({
      ...prev,
      endTime: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate required fields
      if (!formData.assetPair || !formData.assetPair.trim()) {
        throw new Error('Asset/Symbol is required')
      }
      if (!formData.entryPrice || isNaN(parseFloat(formData.entryPrice))) {
        throw new Error('Valid entry price is required')
      }
      if (!formData.exitPrice || isNaN(parseFloat(formData.exitPrice))) {
        throw new Error('Valid exit price is required')
      }
      if (!formData.pnlAbsolute || isNaN(parseFloat(formData.pnlAbsolute))) {
        throw new Error('Valid P&L amount is required')
      }

      // Combine date and time
      const dateTime = combineDateTime(formData.startDate, formData.startTime)
      const endDateTime = combineDateTime(formData.endDate, formData.endTime)

      const payload = {
        dateTime: dateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        assetPair: formData.assetPair.trim(),
        direction: formData.direction,
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: parseFloat(formData.exitPrice),
        result: formData.result,
        pnlAbsolute: formData.pnlAbsolute.trim(),
        accountId: formData.accountId,
      }

      console.log('Updating trade:', payload)

      const response = await fetch(`/api/trades/${tradeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error('API Error:', responseData)
        throw new Error(responseData.error || `Failed to update trade (${response.status})`)
      }

      console.log('Trade updated successfully:', responseData)
      router.push('/trades')
    } catch (err) {
      console.error('Form submission error:', err)
      setError(err.message || 'Failed to update trade')
      setLoading(false)
    }
  }

  if (checkingAuth || fetching) {
    return (
      <>
        <Navbar />
        <div className="mx-auto min-w-0 max-w-2xl px-4 py-8 md:py-16">
          <div className="min-w-0 max-w-full fc-card p-4 sm:p-6 md:p-12">
            <p className="text-center text-brown">{checkingAuth ? 'Checking authentication...' : 'Loading trade...'}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto min-w-0 max-w-2xl px-4 py-8 md:py-16">
        <div className="min-w-0 max-w-full fc-card p-4 sm:p-6 md:p-12">
          <h1 className="fc-heading-lg text-3xl sm:text-4xl md:text-5xl mb-8">Edit Trade</h1>

          {error && <div className="fc-banner fc-banner-error mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="fc-label">Trading account</label>
              <select
                name="accountId"
                value={formData.accountId}
                onChange={handleChange}
                required
                className="fc-input"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Trade Identification */}
            <div>
              <h2 className="fc-heading text-xl mb-4">Trade Identification</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="fc-label">Start Date &amp; Time</label>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-2 [&>*]:min-w-0">
                      <div className="min-w-0">
                        <DatePicker
                          selected={formData.startDate}
                          onChange={handleStartDateChange}
                          dateFormat="MMM d, yyyy"
                          className="fc-input min-w-0 max-w-full"
                        />
                      </div>
                      <div className="min-w-0">
                        <input
                          type="time"
                          value={formData.startTime}
                          onChange={handleStartTimeChange}
                          className="fc-input max-w-full min-w-0"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="fc-label">End Date &amp; Time</label>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-2 [&>*]:min-w-0">
                      <div className="min-w-0">
                        <DatePicker
                          selected={formData.endDate}
                          onChange={handleEndDateChange}
                          dateFormat="MMM d, yyyy"
                          className="fc-input min-w-0 max-w-full"
                        />
                      </div>
                      <div className="min-w-0">
                        <input
                          type="time"
                          value={formData.endTime}
                          onChange={handleEndTimeChange}
                          className="fc-input max-w-full min-w-0"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="fc-label">Asset/Symbol</label>
                  <input
                    type="text"
                    name="assetPair"
                    value={formData.assetPair}
                    onChange={handleChange}
                    required
                    placeholder="e.g., AAPL, EUR/USD, Gold"
                    className="fc-input"
                  />
                </div>
              </div>
            </div>

            {/* Execution Details */}
            <div>
              <h2 className="fc-heading text-xl mb-4">Execution Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="fc-label">Direction</label>
                  <select
                    name="direction"
                    value={formData.direction}
                    onChange={handleChange}
                    required
                    className="fc-input"
                  >
                    <option value="Long">Long (Buy)</option>
                    <option value="Short">Short (Sell)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="fc-label">Entry Price</label>
                    <input
                      type="number"
                      name="entryPrice"
                      value={formData.entryPrice}
                      onChange={handleChange}
                      step="0.0001"
                      min="0"
                      required
                      placeholder="0.00"
                      className="fc-input"
                    />
                  </div>

                  <div>
                    <label className="fc-label">Exit Price</label>
                    <input
                      type="number"
                      name="exitPrice"
                      value={formData.exitPrice}
                      onChange={handleChange}
                      step="0.0001"
                      min="0"
                      required
                      placeholder="0.00"
                      className="fc-input"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Outcome */}
            <div>
              <h2 className="fc-heading text-xl mb-4">Outcome</h2>
              <div className="space-y-4">
                <div>
                  <label className="fc-label">P&amp;L (Profit/Loss)</label>
                  <input
                    type="number"
                    name="pnlAbsolute"
                    value={formData.pnlAbsolute}
                    onChange={handleChange}
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="fc-input"
                  />
                  <p className="text-xs text-muted mt-1">
                    {formData.result === 'Win'
                      ? 'Enter positive value for profit (will auto-adjust if negative)'
                      : 'Enter negative value for loss (will auto-adjust if positive)'}
                  </p>
                </div>

                <div>
                  <label className="fc-label">Win/Loss</label>
                  <select
                    name="result"
                    value={formData.result}
                    onChange={handleChange}
                    required
                    className="fc-input"
                  >
                    <option value="Win">Win</option>
                    <option value="Loss">Loss</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="fc-btn fc-btn-primary flex-1 text-base py-3.5"
              >
                {loading ? 'Updating...' : 'Update Trade'}
              </button>
              <Link href="/trades" className="fc-btn fc-btn-secondary text-base py-3.5">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
