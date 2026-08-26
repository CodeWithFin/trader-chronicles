'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'

const NAV_LINKS = [
  {
    href: '/trades',
    label: 'Trade Log',
    icon: (
      <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden>
        <path d="M0 0h48v48H0z" fill="none" />
        <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="4">
          <path d="M13 10h28v34H13z" />
          <path strokeLinecap="round" d="M35 10V4H8a1 1 0 0 0-1 1v33h6m8-16h12m-12 8h12" />
        </g>
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden>
        <path d="M0 0h24v24H0z" fill="none" />
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
          <path d="M7 18v-2m5 2v-3m5 3v-5M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12" />
          <path d="M5.992 11.486c2.155.072 7.042-.253 9.822-4.665m-1.822-.533l1.876-.302c.228-.029.564.152.647.367l.495 1.638" />
        </g>
      </svg>
    ),
  },
  {
    href: '/backtesting',
    label: 'Backtesting',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/trading-accounts',
    label: 'Accounts',
    icon: (
      <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" aria-hidden>
        <path d="M0 0h48v48H0z" fill="none" />
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
          <path d="M12.527 7c.551-2.024 2.29-3.486 4.473-3.643C19.556 3.173 23.335 3 28.5 3c5.133 0 8.897.171 11.452.354c2.558.182 4.512 2.136 4.694 4.694c.183 2.555.354 6.32.354 11.452c0 5.165-.173 8.944-.357 11.5c-.157 2.183-1.62 3.922-3.643 4.473" />
          <path d="M35.646 17.047c-.182-2.557-2.136-4.51-4.694-4.693C28.397 12.17 24.632 12 19.5 12c-5.133 0-8.897.171-11.452.354c-2.558.182-4.512 2.136-4.694 4.694C3.17 19.602 3 23.367 3 28.5s.171 8.897.354 11.453c.182 2.557 2.136 4.51 4.694 4.693c2.555.183 6.32.354 11.452.354c5.133 0 8.897-.171 11.452-.354c2.558-.182 4.512-2.136 4.694-4.694c.183-2.555.354-6.32.354-11.452c0-5.133-.171-8.897-.354-11.453" />
          <path d="M24.026 30.727a7 7 0 1 0-8.066-.01c-2.496.933-4.485 2.709-5.5 4.92c-.646 1.405.16 3.087 1.704 3.18l.044.003a150 150 0 0 0 7.77.18c3.309 0 5.874-.081 7.77-.18l.045-.003c1.543-.093 2.35-1.775 1.704-3.18c-1.012-2.203-2.989-3.974-5.471-4.91" />
        </g>
      </svg>
    ),
  },
  {
    href: '/leaderboard',
    label: 'Leaderboard',
    icon: (
      <svg className="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden>
        <path d="M0 0h24v24H0z" fill="none" />
        <path
          fill="currentColor"
          d="M15.188 18.688Q16.5 17.375 16.5 15.5t-1.312-3.187T12 11t-3.187 1.313T7.5 15.5t1.313 3.188T12 20t3.188-1.312M9.075 9.7q.5-.275 1.063-.437t1.137-.213L8.75 4h-2.5zm5.85 0l2.85-5.7H15.25l-2.125 4.25l.475.95q.35.1.675.213t.65.287M6.4 18.8q-.425-.725-.663-1.562T5.5 15.5t.238-1.737T6.4 12.2q-1.05.35-1.725 1.238T4 15.5t.675 2.063T6.4 18.8m11.2 0q1.05-.35 1.725-1.237T20 15.5t-.675-2.062T17.6 12.2q.425.725.663 1.563T18.5 15.5t-.238 1.738T17.6 18.8m-7.513 2.913q-.912-.288-1.687-.788q-.225.05-.45.063T7.475 21Q5.2 21 3.6 19.4T2 15.525Q2 13.35 3.45 11.8t3.575-1.725L3 2h7l2 4l2-4h7l-4 8.025q2.125.2 3.563 1.75T22 15.5q0 2.3-1.6 3.9T16.5 21q-.225 0-.462-.012t-.463-.063q-.775.5-1.675.788T12 22t-1.912-.288M9.075 9.7L6.25 4zm5.85 0l2.85-5.7zm-4.775 8.55l.7-2.275L9 14.65h2.275l.725-2.4l.725 2.4H15l-1.85 1.325l.7 2.275l-1.85-1.4z"
        />
      </svg>
    ),
  },
]

export default function Navbar({ initialSession = null }) {
  const router = useRouter()
  const [session, setSession] = useState(initialSession)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (initialSession) {
      setSession(initialSession)
      return
    }

    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        setSession(data.user ? { user: data.user } : null)
      })
      .catch(() => setSession(null))
  }, [initialSession])

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    setSession(null)
    setMenuOpen(false)
    router.push('/login')
  }

  const closeMobileMenu = () => {
    setMenuOpen(false)
  }

  return (
    <nav className="w-full bg-canvas sticky top-0 z-50 shadow-[inset_0_-1px_0_0_var(--stone)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer shrink-0" onClick={closeMobileMenu}>
          <div className="logo-chip p-0.5 rounded-[10px] overflow-hidden flex items-center justify-center shrink-0">
            <Image src="/tagged.png" alt="Logo" width={28} height={28} className="block object-contain" />
          </div>
          <span className="fc-heading text-xl whitespace-nowrap">Trader Chronicles</span>
        </Link>

        <div className="flex items-center gap-4 ml-6 md:ml-10">
          {session ? (
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="fc-btn fc-btn-ghost fc-btn-sm text-charcoal"
                >
                  {link.icon}
                  {link.label}
                </Link>
              ))}
              <Link href="/trades/new" className="fc-btn fc-btn-primary fc-btn-sm ml-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Trade
              </Link>
              <button onClick={handleLogout} className="fc-btn fc-btn-ghost fc-btn-sm">
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="fc-btn fc-btn-ghost">
                Login
              </Link>
              <Link href="/signup" className="fc-btn fc-btn-primary">
                Sign Up
              </Link>
            </div>
          )}

          <button
            type="button"
            className="md:hidden p-2 rounded-[10px] text-charcoal hover:bg-stone transition-colors"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden fixed inset-0 z-50" aria-hidden={!menuOpen}>
          <button
            type="button"
            className="absolute inset-0 bg-[var(--overlay)]"
            onClick={closeMobileMenu}
            aria-label="Close menu overlay"
          />

          <div
            id="mobile-menu"
            className="absolute top-0 right-0 h-full w-[85%] max-w-sm bg-canvas p-6 overflow-y-auto shadow-[inset_1px_0_0_0_var(--stone),-24px_0_40px_-20px_rgba(0,0,0,0.15)]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="fc-heading text-lg">Menu</h2>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 rounded-[10px] text-charcoal hover:bg-stone"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {session ? (
              <div className="flex flex-col gap-2">
                <Link
                  href="/trades/new"
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 rounded-[10px] bg-ink text-canvas text-sm font-semibold text-center"
                >
                  New Trade
                </Link>
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={closeMobileMenu}
                    className="w-full px-4 py-3 rounded-[10px] text-sm font-semibold text-charcoal hover:bg-stone transition-colors inline-flex items-center gap-2"
                  >
                    {link.icon}
                    {link.label}
                  </Link>
                ))}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-3 rounded-[10px] bg-alert text-white text-sm font-semibold text-left mt-2"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 rounded-[10px] text-sm font-semibold text-charcoal hover:bg-stone transition-colors text-center"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 rounded-[10px] bg-ink text-canvas text-sm font-semibold text-center"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
