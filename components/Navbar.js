'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Image from 'next/image'

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
    <nav className="w-full border-b-2 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2 group cursor-pointer" onClick={closeMobileMenu}>
          <div className="p-0.5 border-2 border-black rounded-sm bg-zinc-50 overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
            <Image src="/tagged.png" alt="Logo" width={28} height={28} className="block object-contain" />
          </div>
          <span className="text-xl font-bold tracking-tight">Trader Chronicles</span>
        </Link>

        <div className="flex items-center gap-4">
          {session ? (
            <div className="hidden md:flex items-center gap-4">
            <Link
              href="/trades/new"
              className="flex items-center gap-2 px-5 py-2 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Trade
            </Link>
            <Link
              href="/trades"
              className="flex items-center gap-2 px-5 py-2 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Trade Log
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-2 px-5 py-2 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Analytics
            </Link>
            <Link
              href="/traders"
              className="flex items-center gap-2 px-5 py-2 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 12H9m4 5h4m-11 2.476A13.026 13.026 0 001.5 15M3 21h18" />
              </svg>
              Traders
            </Link>
            <button
              onClick={handleLogout}
              className="inline-flex px-5 py-2 border-2 border-black bg-orange-600 text-white text-sm font-semibold hover:bg-orange-500 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              Logout
            </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login"
              className="px-5 py-2 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="px-5 py-2 border-2 border-black bg-orange-600 text-white text-sm font-semibold hover:bg-orange-500 transition-colors shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
            >
              Sign Up
            </Link>
            </div>
          )}

          <button
            type="button"
            className="md:hidden p-2 border-2 border-black bg-white hover:bg-zinc-100 transition-colors shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-[1px] active:translate-y-[1px]"
            onClick={() => setMenuOpen(prev => !prev)}
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
            className="absolute inset-0 bg-black/50"
            onClick={closeMobileMenu}
            aria-label="Close menu overlay"
          />

          <div
            id="mobile-menu"
            className="absolute top-0 right-0 h-full w-[85%] max-w-sm border-l-4 border-black bg-white p-6 overflow-y-auto shadow-[-8px_0px_0px_0px_rgba(0,0,0,1)]"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold uppercase">Menu</h2>
              <button
                type="button"
                onClick={closeMobileMenu}
                className="p-2 border-2 border-black bg-white hover:bg-zinc-100"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {session ? (
              <div className="flex flex-col gap-3">
                <Link
                  href="/trades/new"
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors"
                >
                  New Trade
                </Link>
                <Link
                  href="/trades"
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors"
                >
                  Trade Log
                </Link>
                <Link
                  href="/analytics"
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors"
                >
                  Analytics
                </Link>
                <Link
                  href="/traders"
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors"
                >
                  Traders
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-4 py-3 border-2 border-black bg-orange-600 text-white text-sm font-semibold hover:bg-orange-500 transition-colors text-left"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Link
                  href="/login"
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 border-2 border-black bg-white text-sm font-semibold hover:bg-zinc-100 transition-colors"
                >
                  Login
                </Link>
                <Link
                  href="/signup"
                  onClick={closeMobileMenu}
                  className="w-full px-4 py-3 border-2 border-black bg-orange-600 text-white text-sm font-semibold hover:bg-orange-500 transition-colors"
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
