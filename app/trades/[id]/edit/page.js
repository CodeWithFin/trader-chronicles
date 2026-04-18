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
        <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
          <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
            <p className="text-center">{checkingAuth ? 'Checking authentication...' : 'Loading trade...'}</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-8 md:py-16">
        <div className="border-4 border-black bg-white p-6 md:p-12 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight uppercase mb-2">Edit Trade</h1>
          <div className="w-full h-1 bg-black mb-8"></div>

          {error && (
            <div className="mb-6 p-4 border-2 border-black bg-red-50 text-red-900">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2 uppercase">Trading account</label>
              <select
                name="accountId"
                value={formData.accountId}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
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
              <h2 className="text-xl font-bold mb-4 uppercase">Trade Identification</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 uppercase">Start Date & Time</label>
                    <div className="grid grid-cols-2 gap-2">
                      <DatePicker
                        selected={formData.startDate}
                        onChange={handleStartDateChange}
                        dateFormat="MMMM d, yyyy"
                        className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                      />
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={handleStartTimeChange}
                        className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 uppercase">End Date & Time</label>
                    <div className="grid grid-cols-2 gap-2">
                      <DatePicker
                        selected={formData.endDate}
                        onChange={handleEndDateChange}
                        dateFormat="MMMM d, yyyy"
                        className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                      />
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={handleEndTimeChange}
                        className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Asset/Symbol</label>
                  <input
                    type="text"
                    name="assetPair"
                    value={formData.assetPair}
                    onChange={handleChange}
                    required
                    placeholder="e.g., AAPL, EUR/USD, Gold"
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                </div>
              </div>
            </div>

            {/* Execution Details */}
            <div>
              <h2 className="text-xl font-bold mb-4 uppercase">Execution Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Direction</label>
                  <select
                    name="direction"
                    value={formData.direction}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    <option value="Long">Long (Buy)</option>
                    <option value="Short">Short (Sell)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold mb-2 uppercase">Entry Price</label>
                    <input
                      type="number"
                      name="entryPrice"
                      value={formData.entryPrice}
                      onChange={handleChange}
                      step="0.0001"
                      min="0"
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold mb-2 uppercase">Exit Price</label>
                    <input
                      type="number"
                      name="exitPrice"
                      value={formData.exitPrice}
                      onChange={handleChange}
                      step="0.0001"
                      min="0"
                      required
                      placeholder="0.00"
                      className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Outcome */}
            <div>
              <h2 className="text-xl font-bold mb-4 uppercase">Outcome</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">P&L (Profit/Loss)</label>
                  <input
                    type="number"
                    name="pnlAbsolute"
                    value={formData.pnlAbsolute}
                    onChange={handleChange}
                    step="0.01"
                    required
                    placeholder="0.00"
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  />
                  <p className="text-xs text-gray-600 mt-1">
                    {formData.result === 'Win' 
                      ? 'Enter positive value for profit (will auto-adjust if negative)' 
                      : 'Enter negative value for loss (will auto-adjust if positive)'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold mb-2 uppercase">Win/Loss</label>
                  <select
                    name="result"
                    value={formData.result}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 border-2 border-black bg-white focus:outline-none focus:ring-2 focus:ring-orange-600"
                  >
                    <option value="Win">Win</option>
                    <option value="Loss">Loss</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-4 border-4 border-black bg-orange-600 text-white text-lg font-bold hover:bg-orange-500 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Updating...' : 'Update Trade'}
              </button>
              <Link
                href="/trades"
                className="px-6 py-4 border-4 border-black bg-white text-lg font-bold hover:bg-zinc-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

