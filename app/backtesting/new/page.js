'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

export default function NewBacktestForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [knownStrategies, setKnownStrategies] = useState([])
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState(null)
  const [uploadingScreenshot, setUploadingScreenshot] = useState(false)

  useEffect(() => {
    if (!screenshotFile) {
      setScreenshotPreviewUrl(null)
      return undefined
    }
    const url = URL.createObjectURL(screenshotFile)
    setScreenshotPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [screenshotFile])

  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const combineDateTime = (date, time) => {
    const [hours, minutes] = time.split(':').map(Number)
    const combined = new Date(date)
    combined.setHours(hours || 0, minutes || 0, 0, 0)
    return combined
  }

  const now = new Date()
  const [formData, setFormData] = useState({
    strategyName: '',
    startDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    startTime: formatTime(now),
    endDate: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    endTime: formatTime(now),
    assetPair: '',
    direction: 'Long',
    entryPrice: '',
    exitPrice: '',
    result: 'Win',
    pnlAbsolute: '',
  })

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' })
        const data = await res.json()
        if (!data.user) {
          router.push('/login')
          return
        }
        setCheckingAuth(false)
      } catch (err) {
        console.error('Auth check failed:', err)
        router.push('/login')
      }
    }
    checkAuth()
  }, [router])

  useEffect(() => {
    if (checkingAuth) return
    fetch('/api/backtests?limit=1', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setKnownStrategies(Array.isArray(d.strategies) ? d.strategies : []))
      .catch(() => setKnownStrategies([]))
  }, [checkingAuth])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const updated = { ...prev, [name]: value }
      if (name === 'result') {
        const pnlValue = parseFloat(prev.pnlAbsolute)
        if (!isNaN(pnlValue) && pnlValue !== 0) {
          if (value === 'Loss' && pnlValue > 0) updated.pnlAbsolute = (-Math.abs(pnlValue)).toString()
          else if (value === 'Win' && pnlValue < 0) updated.pnlAbsolute = Math.abs(pnlValue).toString()
        }
      }
      if (name === 'pnlAbsolute') {
        const pnlValue = parseFloat(value)
        if (!isNaN(pnlValue)) {
          if (pnlValue < 0 && prev.result === 'Win') updated.result = 'Loss'
          else if (pnlValue > 0 && prev.result === 'Loss') updated.result = 'Win'
        }
      }
      return updated
    })
  }

  const handleStartDateChange = (date) => setFormData((prev) => ({ ...prev, startDate: date }))
  const handleStartTimeChange = (e) => setFormData((prev) => ({ ...prev, startTime: e.target.value }))
  const handleEndDateChange = (date) => setFormData((prev) => ({ ...prev, endDate: date }))
  const handleEndTimeChange = (e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))
  const handleScreenshotChange = (e) => setScreenshotFile(e.target.files?.[0] || null)

  const uploadScreenshot = async () => {
    if (!screenshotFile) return ''
    const maxFileSize = 5 * 1024 * 1024
    const looksLikeImage =
      screenshotFile.type.startsWith('image/') || /\.(png|jpe?g|jfif|webp)$/i.test(screenshotFile.name)
    if (!looksLikeImage) throw new Error('Screenshot must be an image file')
    if (screenshotFile.size > maxFileSize) throw new Error('Screenshot must be 5MB or smaller')

    setUploadingScreenshot(true)
    try {
      const body = new FormData()
      body.append('file', screenshotFile)
      const res = await fetch('/api/uploads/screenshot', { method: 'POST', credentials: 'include', body })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to upload screenshot')
      return data.url || ''
    } finally {
      setUploadingScreenshot(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!formData.strategyName || !formData.strategyName.trim()) throw new Error('Strategy name is required')
      if (!formData.assetPair || !formData.assetPair.trim()) throw new Error('Asset/Symbol is required')
      if (!formData.entryPrice || isNaN(parseFloat(formData.entryPrice))) throw new Error('Valid entry price is required')
      if (!formData.exitPrice || isNaN(parseFloat(formData.exitPrice))) throw new Error('Valid exit price is required')
      if (!formData.pnlAbsolute || isNaN(parseFloat(formData.pnlAbsolute))) throw new Error('Valid P&L amount is required')

      const dateTime = combineDateTime(formData.startDate, formData.startTime)
      const endDateTime = combineDateTime(formData.endDate, formData.endTime)
      const screenshotUrl = await uploadScreenshot()

      const payload = {
        strategyName: formData.strategyName.trim(),
        dateTime: dateTime.toISOString(),
        endDate: endDateTime.toISOString(),
        assetPair: formData.assetPair.trim(),
        direction: formData.direction,
        entryPrice: parseFloat(formData.entryPrice),
        exitPrice: parseFloat(formData.exitPrice),
        result: formData.result,
        pnlAbsolute: formData.pnlAbsolute.trim(),
        stopLossPrice: 0,
        riskPerTrade: 0,
        rMultiple: 0,
        setupTags: [],
        notes: '',
        screenshotUrl,
      }

      const response = await fetch('/api/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const responseData = await response.json()
      if (!response.ok) throw new Error(responseData.error || `Failed to create backtest entry (${response.status})`)

      router.push('/backtesting')
    } catch (err) {
      console.error('Form submission error:', err)
      setError(err.message || 'Failed to create backtest entry')
    } finally {
      setLoading(false)
      setUploadingScreenshot(false)
    }
  }

  if (checkingAuth) {
    return (
      <>
        <Navbar />
        <div className="mx-auto min-w-0 max-w-2xl px-4 py-8 md:py-16">
          <div className="min-w-0 max-w-full fc-card p-4 sm:p-6 md:p-12">
            <p className="text-center text-brown">Checking authentication...</p>
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
          <h1 className="fc-heading-lg text-3xl sm:text-4xl md:text-5xl mb-2">New Backtest Entry</h1>
          <p className="text-sm text-brown mb-8">
            Simulated trades logged here stay separate from your live Trade Log.
          </p>

          {error && <div className="fc-banner fc-banner-error mb-6">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="fc-label">Strategy Name</label>
              <input
                type="text"
                name="strategyName"
                value={formData.strategyName}
                onChange={handleChange}
                required
                list="known-strategies"
                placeholder="e.g., Breakout Retest, London ORB"
                className="fc-input"
              />
              <datalist id="known-strategies">
                {knownStrategies.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p className="text-xs text-muted mt-1">Group entries under a strategy to measure its win rate.</p>
            </div>

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

            <div>
              <h2 className="fc-heading text-xl mb-4">Screenshot (Optional)</h2>
              <div>
                <label className="fc-label">Attach Chart Screenshot</label>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/jfif,.jfif"
                  onChange={handleScreenshotChange}
                  className="fc-input"
                />
                <p className="text-xs text-muted mt-1">PNG, JPG, WEBP, or JFIF. Max 5MB.</p>
                {screenshotFile && (
                  <>
                    <p className="text-xs text-brown mt-2">Selected: {screenshotFile.name}</p>
                    {screenshotPreviewUrl && (
                      <div className="mt-4 fc-surface p-3">
                        <p className="text-xs font-semibold uppercase mb-2 text-muted">Preview</p>
                        {/* eslint-disable-next-line @next/next/no-img-element -- blob URLs are client-only */}
                        <img
                          src={screenshotPreviewUrl}
                          alt="Screenshot preview"
                          className="max-h-72 w-full object-contain rounded-[10px] bg-white shadow-card"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading || uploadingScreenshot}
                className="fc-btn fc-btn-primary flex-1 text-base py-3.5"
              >
                {uploadingScreenshot ? 'Uploading Screenshot...' : loading ? 'Saving...' : 'Save Backtest'}
              </button>
              <Link href="/backtesting" className="fc-btn fc-btn-secondary text-base py-3.5">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}
