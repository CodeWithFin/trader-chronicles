'use client'

import { useState } from 'react'

const BROKERS = [
  {
    id: 'equity_edge',
    label: 'Equity Edge',
    suffix: '',
    note: 'Standard symbol names (e.g. EURUSD)',
  },
  {
    id: 'just_markets',
    label: 'Just Markets',
    suffix: '+',
    note: 'Symbols end with "+" (e.g. EURUSD+) — stripped automatically',
  },
  {
    id: 'valetax',
    label: 'Valetax',
    suffix: '.v',
    note: 'Symbols end with ".v" (e.g. EURUSD.v) — stripped automatically',
  },
]

export default function MT5SetupClient({ initialKey, serverUrl }) {
  const [apiKey, setApiKey] = useState(initialKey)
  const [copied, setCopied] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const [brokerId, setBrokerId] = useState('equity_edge')

  const broker = BROKERS.find((b) => b.id === brokerId) || BROKERS[0]

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

  const brokerEnumIndex = BROKERS.findIndex((b) => b.id === brokerId)
  const eaCode = `Broker    = ${broker.label}   ← select in dropdown
ApiKey    = ${apiKey ?? 'YOUR_API_KEY'}
ServerUrl = ${serverUrl}  ← do not change`

  return (
    <div className="fc-card p-6 space-y-6">
      <div>
        <h2 className="fc-heading text-xl mb-1">MT5 Auto-Import</h2>
        <p className="text-brown text-sm">
          Install the EA on your MT5 chart and every closed trade logs to your journal automatically.
        </p>
      </div>

      {/* Broker selector */}
      <div>
        <label className="fc-label mb-2 block">Select your broker</label>
        <div className="flex flex-wrap gap-2">
          {BROKERS.map((b) => (
            <button
              key={b.id}
              onClick={() => setBrokerId(b.id)}
              className={`px-4 py-2 rounded-[10px] text-sm font-semibold border transition-colors ${
                brokerId === b.id
                  ? 'bg-ink text-canvas border-ink'
                  : 'bg-canvas text-charcoal border-stone hover:bg-stone'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-brown mt-2">{broker.note}</p>
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

      {/* Steps */}
      <div className="space-y-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-brown">Setup Instructions</h3>

        <div className="space-y-3 text-sm">

          <div className="flex gap-3">
            <span className="fc-badge shrink-0 mt-0.5">1</span>
            <p>
              Download the EA file and place it in your MT5{' '}
              <code className="text-xs bg-stone px-1 rounded">MQL5/Experts/</code> folder.
              Then open MetaEditor (F7 in MT5) and compile it.
            </p>
          </div>

          <div className="flex gap-3 ml-8">
            <a
              href="/ea/TraderChronicles_Brokers.mq5"
              download="TraderChronicles_Brokers.mq5"
              className="fc-btn fc-btn-primary text-sm px-5 py-2.5"
            >
              ↓ Download EA — TraderChronicles_Brokers.mq5
            </a>
          </div>

          <div className="flex gap-3">
            <span className="fc-badge shrink-0 mt-0.5">2</span>
            <p>
              In MT5, go to <strong>Tools → Options → Expert Advisors</strong>, tick{' '}
              <em>"Allow WebRequest for listed URL"</em> and add:
            </p>
          </div>
          <div className="ml-8">
            <div className="relative">
              <pre className="bg-stone rounded-lg px-4 py-3 text-xs font-mono">{serverUrl}</pre>
              <button
                onClick={() => copy(serverUrl, 'url')}
                className="absolute top-1.5 right-2 fc-btn fc-btn-ghost text-xs px-2 py-1"
              >
                {copied === 'url' ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="fc-badge shrink-0 mt-0.5">3</span>
            <p>
              Attach <strong>TraderChronicles_Brokers</strong> to any chart. In the EA inputs, set these three values:
            </p>
          </div>
          <div className="ml-8">
            <div className="relative">
              <pre className="bg-stone rounded-lg p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap">{eaCode}</pre>
              <button
                onClick={() => copy(`${apiKey ?? ''}`, 'ea')}
                className="absolute top-2 right-2 fc-btn fc-btn-ghost text-xs px-2 py-1"
              >
                {copied === 'ea' ? 'Copied!' : 'Copy key'}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <span className="fc-badge shrink-0 mt-0.5">4</span>
            <p>
              Done. Every closed position is sent to your journal within seconds. No manual entry needed.
            </p>
          </div>
        </div>
      </div>

      {/* Troubleshooting */}
      <details className="text-sm">
        <summary className="cursor-pointer font-semibold text-brown hover:text-ink transition-colors">
          Troubleshooting
        </summary>
        <div className="mt-3 space-y-2 text-brown">
          <p><strong className="text-ink">Trades not appearing?</strong> Check the MT5 Experts tab for errors. Most common cause: the server URL is not in the WebRequest whitelist (Step 2).</p>
          <p><strong className="text-ink">Wrong symbol names?</strong> Make sure you selected the correct broker in the EA inputs — it auto-strips the broker suffix.</p>
          <p><strong className="text-ink">HTTP 401 errors?</strong> Your API key is wrong or empty. Copy it again from above.</p>
          <p><strong className="text-ink">Duplicate trades?</strong> The EA deduplicates by ticket number — duplicates are safe and ignored by the server.</p>
        </div>
      </details>
    </div>
  )
}
