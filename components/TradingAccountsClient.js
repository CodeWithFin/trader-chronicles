'use client'

import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'

const KINDS = [
  { id: 'eval',   label: 'Evaluation / challenge' },
  { id: 'funded', label: 'Funded / instant funded' },
  { id: 'live',   label: 'Live / real money' },
  { id: 'other',  label: 'Other' },
]

const PLATFORMS = [
  { id: 'mt5', label: 'MetaTrader 5' },
  { id: 'mt4', label: 'MetaTrader 4' },
]

const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

function CopyButton({ text, label = 'Copy' }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 text-xs px-2 py-1 rounded-[4px] font-semibold transition-colors"
      style={{ background: copied ? 'var(--grass)' : 'var(--stone)', color: copied ? '#fff' : 'var(--charcoal)' }}
    >
      {copied ? '✓ Copied' : label}
    </button>
  )
}

function SyncSetupPanel({ account, appUrl }) {
  const [showToken, setShowToken] = useState(false)
  const token = account.auth_token
  const platform = account.mt_platform || 'mt5'
  const eaFile = platform === 'mt4' ? 'TraderChroniclesEA.mq4' : 'TraderChroniclesEA.mq5'

  return (
    <div className="mt-3 rounded-[8px] border border-[var(--stone-border)] bg-[var(--sand)] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[var(--grass)] shrink-0" />
        <span className="text-sm font-semibold text-charcoal">Auto-sync ready</span>
        {account.last_synced_at && (
          <span className="text-xs text-muted ml-auto">
            Last sync: {new Date(account.last_synced_at).toLocaleString()}
          </span>
        )}
      </div>

      {/* Token */}
      <div>
        <p className="text-xs font-semibold text-muted uppercase mb-1">Your Sync Token</p>
        <div className="flex items-center gap-2 bg-white rounded-[6px] border border-[var(--stone-border)] px-3 py-2">
          <code className="text-xs text-charcoal flex-1 break-all font-mono">
            {showToken ? token : '•'.repeat(Math.min(token.length, 40))}
          </code>
          <button
            type="button"
            onClick={() => setShowToken(v => !v)}
            className="text-xs text-muted hover:text-charcoal shrink-0"
          >
            {showToken ? 'Hide' : 'Show'}
          </button>
          <CopyButton text={token} label="Copy token" />
        </div>
      </div>

      {/* Instructions */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted uppercase">Setup steps</p>
        <ol className="space-y-2 text-xs text-brown">
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--stone)] text-charcoal font-semibold flex items-center justify-center text-[10px]">1</span>
            <span>
              Download the Expert Advisor for your terminal:{' '}
              <a
                href={`${appUrl}/ea/${eaFile}`}
                download
                className="text-[var(--link)] font-semibold hover:underline"
              >
                {eaFile}
              </a>
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--stone)] text-charcoal font-semibold flex items-center justify-center text-[10px]">2</span>
            <span>
              In {platform === 'mt4' ? 'MT4' : 'MT5'} → <b>File → Open Data Folder → MQL{platform === 'mt4' ? '4' : '5'} → Experts</b>, paste the file there, then compile it in MetaEditor.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="shrink-0 w-5 h-5 rounded-full bg-[var(--stone)] text-charcoal font-semibold flex items-center justify-center text-[10px]">3</span>
            <span>
              Drag the EA onto any chart. In the Input Parameters, set:
            </span>
          </li>
        </ol>

        <div className="ml-7 space-y-2">
          <div>
            <p className="text-xs text-muted mb-1 font-semibold">SERVER_URL</p>
            <div className="flex items-center gap-2 bg-white rounded-[6px] border border-[var(--stone-border)] px-3 py-1.5">
              <code className="text-xs text-charcoal flex-1 font-mono">{appUrl}</code>
              <CopyButton text={appUrl} />
            </div>
          </div>
          <div>
            <p className="text-xs text-muted mb-1 font-semibold">SYNC_TOKEN</p>
            <div className="flex items-center gap-2 bg-white rounded-[6px] border border-[var(--stone-border)] px-3 py-1.5">
              <code className="text-xs text-charcoal flex-1 break-all font-mono">
                {showToken ? token : token.substring(0, 8) + '…'}
              </code>
              <CopyButton text={token} />
            </div>
          </div>
        </div>

        <p className="ml-7 text-xs text-muted">
          Also enable WebRequest for <b>{appUrl}</b> in {platform === 'mt4' ? 'MT4' : 'MT5'} → <b>Tools → Options → Expert Advisors</b>.
        </p>

        <div className="ml-7 bg-[var(--info-bg)] rounded-[6px] px-3 py-2 text-xs text-[var(--info-fg)]">
          Once attached, the EA syncs your closed trades automatically every 5 minutes. No manual entry needed.
        </div>
      </div>
    </div>
  )
}

const emptyForm = {
  label: '',
  kind: 'other',
  startingBalance: '10000',
  mtAccountNumber: '',
  mtBrokerServer: '',
  mtPassword: '',
  mtPlatform: 'mt5',
}

export default function TradingAccountsClient({ session = null }) {
  const [accounts, setAccounts]           = useState([])
  const [migrationNotice, setMigrationNotice] = useState('')
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')
  const [creating, setCreating]           = useState(false)
  const [editingId, setEditingId]         = useState(null)
  const [editForm, setEditForm]           = useState({})
  const [newAccount, setNewAccount]       = useState(null)   // account returned after create
  const [form, setForm]                   = useState(emptyForm)
  const [appUrl, setAppUrl]               = useState('')

  useEffect(() => { setAppUrl(window.location.origin) }, [])

  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/trading-accounts', { credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load')
      setAccounts(data.accounts || [])
      setMigrationNotice(data.migrationRequired ? data.migrationMessage || '' : '')
      setError('')
    } catch (e) {
      setError(e.message || 'Failed to load trading accounts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e) => {
    e.preventDefault()
    const label = form.label.trim()
    if (!label) return
    setCreating(true)
    setError('')
    try {
      const res  = await fetch('/api/trading-accounts', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label,
          kind:             form.kind,
          startingBalance:  parseFloat(form.startingBalance) || 10000,
          mtAccountNumber:  form.mtAccountNumber  || undefined,
          mtBrokerServer:   form.mtBrokerServer   || undefined,
          mtPassword:       form.mtPassword       || undefined,
          mtPlatform:       form.mtPlatform       || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      setForm(emptyForm)
      if (data.auth_token) setNewAccount(data)   // show setup panel for new account
      await load()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (account) => {
    setEditingId(account.id)
    setEditForm({
      label:           account.label,
      kind:            account.kind,
      startingBalance: String(account.starting_balance),
      mtAccountNumber: account.mt_account_number || '',
      mtBrokerServer:  account.mt_broker_server  || '',
      mtPassword:      '',
      mtPlatform:      account.mt_platform       || 'mt5',
      auth_token:      account.auth_token        || null,
    })
  }

  const handleCancelEdit = () => { setEditingId(null); setEditForm({}) }

  const handleSaveEdit = async (id) => {
    const label = editForm.label.trim()
    if (!label) return
    try {
      const body = {
        label,
        kind:            editForm.kind,
        startingBalance: parseFloat(editForm.startingBalance) || 10000,
        mtAccountNumber: editForm.mtAccountNumber || undefined,
        mtBrokerServer:  editForm.mtBrokerServer  || undefined,
        mtPlatform:      editForm.mtPlatform      || undefined,
      }
      if (editForm.mtPassword) body.mtPassword = editForm.mtPassword
      const res  = await fetch(`/api/trading-accounts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Update failed')
      setEditingId(null)
      setEditForm({})
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this trading account? It must have zero trades.')) return
    try {
      const res  = await fetch(`/api/trading-accounts/${id}`, { method: 'DELETE', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleGenerateToken = async (id) => {
    if (!confirm('Generate a new sync token? This will invalidate any existing token.')) return
    try {
      const res  = await fetch(`/api/trading-accounts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ generateAuthToken: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate token')
      setEditForm(prev => ({ ...prev, auth_token: data.auth_token }))
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleRevokeToken = async (id) => {
    if (!confirm('Revoke the sync token? The EA will stop syncing until you generate a new one.')) return
    try {
      const res  = await fetch(`/api/trading-accounts/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revokeAuthToken: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to revoke token')
      setEditForm(prev => ({ ...prev, auth_token: null }))
      await load()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <>
        <Navbar initialSession={session} />
        <div className="max-w-3xl mx-auto px-4 py-16 text-center font-semibold text-brown">Loading…</div>
      </>
    )
  }

  return (
    <>
      <Navbar initialSession={session} />
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
        <h1 className="fc-heading-lg text-4xl mb-2 inline-flex items-center gap-3">
          <svg className="w-8 h-8 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden>
            <path d="M0 0h48v48H0z" fill="none" />
            <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
              <path d="M12.527 7c.551-2.024 2.29-3.486 4.473-3.643C19.556 3.173 23.335 3 28.5 3c5.133 0 8.897.171 11.452.354c2.558.182 4.512 2.136 4.694 4.694c.183 2.555.354 6.32.354 11.452c0 5.165-.173 8.944-.357 11.5c-.157 2.183-1.62 3.922-3.643 4.473" />
              <path d="M35.646 17.047c-.182-2.557-2.136-4.51-4.694-4.693C28.397 12.17 24.632 12 19.5 12c-5.133 0-8.897.171-11.452.354c-2.558.182-4.512 2.136-4.694 4.694C3.17 19.602 3 23.367 3 28.5s.171 8.897.354 11.453c.182 2.557 2.136 4.51 4.694 4.693c2.555.183 6.32.354 11.452.354c5.133 0 8.897-.171 11.452-.354c2.558-.182 4.512-2.136 4.694-4.694c.183-2.555.354-6.32.354-11.452c0-5.133-.171-8.897-.354-11.453" />
              <path d="M24.026 30.727a7 7 0 1 0-8.066-.01c-2.496.933-4.485 2.709-5.5 4.92c-.646 1.405.16 3.087 1.704 3.18l.044.003a150 150 0 0 0 7.77.18c3.309 0 5.874-.081 7.77-.18l.045-.003c1.543-.093 2.35-1.775 1.704-3.18c-1.012-2.203-2.989-3.974-5.471-4.91" />
            </g>
          </svg>
          Trading accounts
        </h1>
        <p className="text-brown mb-8 text-sm">
          Add your MT4/MT5 credentials and install the EA to automatically sync all closed trades — no manual entry needed.
        </p>

        {migrationNotice && (
          <div className="mb-6 fc-banner fc-banner-warn">
            <p className="font-semibold uppercase mb-2 text-xs">Database migration needed</p>
            <p className="leading-relaxed">{migrationNotice}</p>
          </div>
        )}

        {/* New-account sync setup banner */}
        {newAccount && (
          <div className="mb-6 fc-card p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <h2 className="fc-heading text-base">Account created — set up auto-sync</h2>
              <button
                type="button"
                onClick={() => setNewAccount(null)}
                className="text-muted hover:text-charcoal text-lg leading-none"
                aria-label="Dismiss"
              >×</button>
            </div>
            <SyncSetupPanel account={newAccount} appUrl={appUrl} />
          </div>
        )}

        {error && <div className="mb-6 fc-banner fc-banner-error">{error}</div>}

        {/* Accounts list */}
        <div className="fc-card p-6 mb-8">
          <h2 className="fc-heading text-lg mb-4">Your accounts</h2>
          {accounts.length === 0 ? (
            <p className="text-brown text-sm">
              {migrationNotice ? 'Run the migration above, then reload.' : 'No accounts yet.'}
            </p>
          ) : (
            <ul className="space-y-4">
              {accounts.map((a) => (
                <li key={a.id} className="fc-surface px-4 py-3">
                  {editingId === a.id ? (
                    /* ─── Edit mode ─── */
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="fc-label">Label</label>
                          <input value={editForm.label} onChange={e => setEditForm(f => ({ ...f, label: e.target.value }))} className="fc-input" maxLength={80} />
                        </div>
                        <div>
                          <label className="fc-label">Type</label>
                          <select value={editForm.kind} onChange={e => setEditForm(f => ({ ...f, kind: e.target.value }))} className="fc-input">
                            {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="fc-label">Starting balance</label>
                          <input type="number" min="0" step="0.01" value={editForm.startingBalance} onChange={e => setEditForm(f => ({ ...f, startingBalance: e.target.value }))} className="fc-input" />
                        </div>
                        <div>
                          <label className="fc-label">Platform</label>
                          <select value={editForm.mtPlatform} onChange={e => setEditForm(f => ({ ...f, mtPlatform: e.target.value }))} className="fc-input">
                            {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="fc-label">Account Number</label>
                          <input type="text" value={editForm.mtAccountNumber} onChange={e => setEditForm(f => ({ ...f, mtAccountNumber: e.target.value }))} placeholder="e.g., 12345678" className="fc-input" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="fc-label">Broker Server</label>
                          <input type="text" value={editForm.mtBrokerServer} onChange={e => setEditForm(f => ({ ...f, mtBrokerServer: e.target.value }))} placeholder="e.g., JustMarkets-Live2" className="fc-input" />
                        </div>
                        <div className="md:col-span-2">
                          <label className="fc-label">MT Trading Password</label>
                          <input type="password" value={editForm.mtPassword} onChange={e => setEditForm(f => ({ ...f, mtPassword: e.target.value }))} placeholder="Leave blank to keep current password" className="fc-input" />
                          <p className="text-xs text-muted mt-1">The trading/investor password, not your broker website password.</p>
                        </div>
                      </div>

                      {/* Token management */}
                      <div className="border-t border-[var(--stone)] pt-3">
                        <p className="text-xs font-semibold text-muted uppercase mb-2">Sync Token</p>
                        {editForm.auth_token ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 bg-white rounded-[6px] border border-[var(--stone-border)] px-3 py-2">
                              <code className="text-xs text-charcoal flex-1 break-all font-mono">{editForm.auth_token}</code>
                              <CopyButton text={editForm.auth_token} />
                            </div>
                            <button type="button" onClick={() => handleRevokeToken(a.id)} className="fc-btn fc-btn-danger fc-btn-sm">Revoke token</button>
                          </div>
                        ) : (
                          <button type="button" onClick={() => handleGenerateToken(a.id)} className="fc-btn fc-btn-primary fc-btn-sm">Generate sync token</button>
                        )}
                      </div>

                      <div className="flex gap-3 pt-1">
                        <button type="button" onClick={() => handleSaveEdit(a.id)} className="fc-btn fc-btn-primary">Save</button>
                        <button type="button" onClick={handleCancelEdit} className="fc-btn fc-btn-secondary">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    /* ─── View mode ─── */
                    <div>
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-charcoal">{a.label}</p>
                          <p className="text-xs text-muted uppercase">
                            {KINDS.find(k => k.id === a.kind)?.label || a.kind} · $
                            {Number(a.starting_balance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {(a.mt_account_number || a.mt_broker_server) && (
                            <p className="text-xs text-[var(--link)] mt-0.5 font-mono">
                              {a.mt_platform?.toUpperCase() || 'MT5'} · {a.mt_account_number} · {a.mt_broker_server}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button type="button" onClick={() => handleEdit(a)} className="fc-btn fc-btn-ghost fc-btn-sm">Edit</button>
                          <button type="button" onClick={() => handleDelete(a.id)} className="fc-btn fc-btn-danger fc-btn-sm">Delete</button>
                        </div>
                      </div>

                      {/* Sync setup panel for accounts with token */}
                      {a.auth_token && (
                        <SyncSetupPanel account={a} appUrl={appUrl} />
                      )}

                      {/* Generate token CTA for accounts with MT credentials but no token */}
                      {!a.auth_token && a.mt_account_number && a.mt_broker_server && (
                        <div className="mt-3 flex items-center gap-3 p-3 rounded-[6px] bg-[var(--info-bg)]">
                          <p className="text-xs text-[var(--info-fg)] flex-1">
                            Generate a sync token to enable the auto-sync EA for this account.
                          </p>
                          <button
                            type="button"
                            onClick={async () => {
                              await fetch(`/api/trading-accounts/${a.id}`, {
                                method: 'PATCH', credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ generateAuthToken: true }),
                              })
                              await load()
                            }}
                            className="fc-btn fc-btn-primary fc-btn-sm shrink-0"
                          >
                            Generate token
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add account form */}
        <div className={`fc-card p-6 ${migrationNotice ? 'opacity-60 pointer-events-none' : ''}`}>
          <h2 className="fc-heading text-lg mb-1">Add account</h2>
          <p className="text-xs text-muted mb-4">
            Enter your MT4/MT5 credentials to enable automatic trade sync. A sync token will be generated for you.
          </p>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="fc-label">Label</label>
                <input
                  value={form.label}
                  onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  placeholder="e.g. Apex 50k eval"
                  className="fc-input"
                  maxLength={80}
                />
              </div>
              <div>
                <label className="fc-label">Account type</label>
                <select value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))} className="fc-input">
                  {KINDS.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>
              <div>
                <label className="fc-label">Starting balance</label>
                <input type="number" min="0" step="0.01" value={form.startingBalance} onChange={e => setForm(f => ({ ...f, startingBalance: e.target.value }))} className="fc-input" />
              </div>
            </div>

            <div className="border-t border-[var(--stone)] pt-4">
              <h3 className="fc-heading text-sm mb-3">MT4/MT5 Connection</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="fc-label">Platform</label>
                  <select value={form.mtPlatform} onChange={e => setForm(f => ({ ...f, mtPlatform: e.target.value }))} className="fc-input">
                    {PLATFORMS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="fc-label">Account Number</label>
                  <input type="text" value={form.mtAccountNumber} onChange={e => setForm(f => ({ ...f, mtAccountNumber: e.target.value }))} placeholder="e.g. 12345678" className="fc-input" />
                </div>
                <div>
                  <label className="fc-label">Broker Server</label>
                  <input type="text" value={form.mtBrokerServer} onChange={e => setForm(f => ({ ...f, mtBrokerServer: e.target.value }))} placeholder="e.g. JustMarkets-Live2" className="fc-input" />
                </div>
                <div>
                  <label className="fc-label">Trading Password</label>
                  <input type="password" value={form.mtPassword} onChange={e => setForm(f => ({ ...f, mtPassword: e.target.value }))} placeholder="MT4/MT5 sub-account password" className="fc-input" />
                </div>
              </div>
              <p className="text-xs text-muted mt-2">
                This is the password specific to this MT4/MT5 sub-account — not your broker website login.
              </p>
            </div>

            <button
              type="submit"
              disabled={creating || !form.label.trim() || !!migrationNotice}
              className="fc-btn fc-btn-primary"
            >
              {creating ? 'Adding…' : 'Add account'}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
