'use client'

import { useState } from 'react'

export default function MT5SetupClient({ initialKey, serverUrl }) {
  const [apiKey, setApiKey] = useState(initialKey)
  const [copied, setCopied] = useState('')
  const [regenerating, setRegenerating] = useState(false)

  const copy = (text, label) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  const regenerate = async () => {
    if (!confirm('This will invalidate your current key. Update the EA inputs after regenerating.')) return
    setRegenerating(true)
    try {
      const res = await fetch('/api/mt5/key', { method: 'POST' })
      const data = await res.json()
      setApiKey(data.key)
    } finally {
      setRegenerating(false)
    }
  }

  const eaCode = `input string ApiKey    = "${apiKey ?? ''}";
input string ServerUrl = "${serverUrl}";`

  return (
    <div className="fc-card p-6 space-y-6">
      <div>
        <h2 className="fc-heading text-xl mb-1">MT5 Auto-Import</h2>
        <p className="text-brown text-sm">
          Install the EA on your MT5 chart and it will automatically log every closed trade to your journal.
        </p>
      </div>

      {/* API Key */}
      <div>
        <label className="fc-label">Your API Key</label>
        <div className="flex gap-2 items-center mt-1">
          <input
            readOnly
            value={apiKey ?? '—'}
            className="fc-input font-mono text-sm flex-1"
          />
          <button
            onClick={() => copy(apiKey, 'key')}
            className="fc-btn fc-btn-secondary text-sm px-4 py-2 shrink-0"
          >
            {copied === 'key' ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="fc-btn fc-btn-ghost text-sm px-4 py-2 shrink-0"
          >
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </button>
        </div>
        <p className="text-xs text-brown mt-1">Keep this private — anyone with it can write trades to your journal.</p>
      </div>

      {/* Step by step */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-brown">Setup Instructions</h3>

        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <span className="fc-badge shrink-0 mt-0.5">1</span>
            <p>Download <strong>TraderChronicles.mq5</strong> from the repo (<code className="text-xs bg-stone px-1 rounded">mt5/TraderChronicles.mq5</code>) and place it in your MT5 <code className="text-xs bg-stone px-1 rounded">MQL5/Experts/</code> folder. Compile it in MetaEditor (F7).</p>
          </div>

          <div className="flex gap-3">
            <span className="fc-badge shrink-0 mt-0.5">2</span>
            <p>In MT5, go to <strong>Tools → Options → Expert Advisors</strong> and tick <em>"Allow WebRequest for listed URL"</em>, then add <code className="text-xs bg-stone px-1 rounded">{serverUrl}</code>.</p>
          </div>

          <div className="flex gap-3">
            <span className="fc-badge shrink-0 mt-0.5">3</span>
            <p>Attach <strong>TraderChronicles</strong> to any chart. In the EA inputs, paste your key and server URL:</p>
          </div>
        </div>

        <div className="relative">
          <pre className="bg-stone rounded-lg p-4 text-xs font-mono overflow-x-auto">{eaCode}</pre>
          <button
            onClick={() => copy(eaCode, 'ea')}
            className="absolute top-2 right-2 fc-btn fc-btn-ghost text-xs px-2 py-1"
          >
            {copied === 'ea' ? 'Copied!' : 'Copy'}
          </button>
        </div>

        <div className="flex gap-3 text-sm">
          <span className="fc-badge shrink-0 mt-0.5">4</span>
          <p>That's it. Every time a position closes, the EA sends it to your journal automatically. Trades appear in your <a href="/trades" className="text-[#ff3e00] hover:underline">Trade Log</a> within seconds.</p>
        </div>
      </div>
    </div>
  )
}
