import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { getSessionUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'

const FEATURES = [
  {
    color: '#64c6ff',
    iconColor: 'text-ink',
    title: 'Trade Log',
    body: 'Log every entry, exit, and outcome in seconds. Filter by asset, account, or result whenever you need to look back.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 48 48">
        <g fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="4">
          <path d="M13 10h28v34H13z" />
          <path strokeLinecap="round" d="M35 10V4H8a1 1 0 0 0-1 1v33h6m8-16h12m-12 8h12" />
        </g>
      </svg>
    ),
  },
  {
    color: '#00c978',
    iconColor: 'text-white',
    title: 'Analytics',
    body: 'Win rate, expectancy, profit factor, and equity curves — updated the moment you log a trade.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5">
          <path d="M7 18v-2m5 2v-3m5 3v-5M2.5 12c0-4.478 0-6.718 1.391-8.109S7.521 2.5 12 2.5c4.478 0 6.718 0 8.109 1.391S21.5 7.521 21.5 12c0 4.478 0 6.718-1.391 8.109S16.479 21.5 12 21.5c-4.478 0-6.718 0-8.109-1.391S2.5 16.479 2.5 12" />
          <path d="M5.992 11.486c2.155.072 7.042-.253 9.822-4.665m-1.822-.533l1.876-.302c.228-.029.564.152.647.367l.495 1.638" />
        </g>
      </svg>
    ),
  },
  {
    color: '#ffcd6c',
    iconColor: 'text-ink',
    title: 'Backtesting',
    body: 'Test a strategy against simulated trades before you risk real capital — kept completely separate from your live log.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    color: '#ff58ae',
    iconColor: 'text-white',
    title: 'Trading Accounts',
    body: 'Keep eval, funded, and live accounts separate so every P&L number reflects the account it actually happened in.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 48 48">
        <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3">
          <path d="M12.527 7c.551-2.024 2.29-3.486 4.473-3.643C19.556 3.173 23.335 3 28.5 3c5.133 0 8.897.171 11.452.354c2.558.182 4.512 2.136 4.694 4.694c.183 2.555.354 6.32.354 11.452c0 5.165-.173 8.944-.357 11.5c-.157 2.183-1.62 3.922-3.643 4.473" />
          <path d="M35.646 17.047c-.182-2.557-2.136-4.51-4.694-4.693C28.397 12.17 24.632 12 19.5 12c-5.133 0-8.897.171-11.452.354c-2.558.182-4.512 2.136-4.694 4.694C3.17 19.602 3 23.367 3 28.5s.171 8.897.354 11.453c.182 2.557 2.136 4.51 4.694 4.693c2.555.183 6.32.354 11.452.354c5.133 0 8.897-.171 11.452-.354c2.558-.182 4.512-2.136 4.694-4.694c.183-2.555.354-6.32.354-11.452c0-5.133-.171-8.897-.354-11.453" />
          <path d="M24.026 30.727a7 7 0 1 0-8.066-.01c-2.496.933-4.485 2.709-5.5 4.92c-.646 1.405.16 3.087 1.704 3.18l.044.003a150 150 0 0 0 7.77.18c3.309 0 5.874-.081 7.77-.18l.045-.003c1.543-.093 2.35-1.775 1.704-3.18c-1.012-2.203-2.989-3.974-5.471-4.91" />
        </g>
      </svg>
    ),
  },
  {
    color: '#9f4fff',
    iconColor: 'text-white',
    title: 'Leaderboard',
    body: 'See how your total P&L stacks up against the community, and open any profile for the full trade history.',
    icon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M15.188 18.688Q16.5 17.375 16.5 15.5t-1.312-3.187T12 11t-3.187 1.313T7.5 15.5t1.313 3.188T12 20t3.188-1.312M9.075 9.7q.5-.275 1.063-.437t1.137-.213L8.75 4h-2.5zm5.85 0l2.85-5.7H15.25l-2.125 4.25l.475.95q.35.1.675.213t.65.287M6.4 18.8q-.425-.725-.663-1.562T5.5 15.5t.238-1.737T6.4 12.2q-1.05.35-1.725 1.238T4 15.5t.675 2.063T6.4 18.8m11.2 0q1.05-.35 1.725-1.237T20 15.5t-.675-2.062T17.6 12.2q.425.725.663 1.563T18.5 15.5t-.238 1.738T17.6 18.8m-7.513 2.913q-.912-.288-1.687-.788q-.225.05-.45.063T7.475 21Q5.2 21 3.6 19.4T2 15.525Q2 13.35 3.45 11.8t3.575-1.725L3 2h7l2 4l2-4h7l-4 8.025q2.125.2 3.563 1.75T22 15.5q0 2.3-1.6 3.9T16.5 21q-.225 0-.462-.012t-.463-.063q-.775.5-1.675.788T12 22t-1.912-.288M9.075 9.7L6.25 4zm5.85 0l2.85-5.7zm-4.775 8.55l.7-2.275L9 14.65h2.275l.725-2.4l.725 2.4H15l-1.85 1.325l.7 2.275l-1.85-1.4z" />
      </svg>
    ),
  },
  {
    color: '#ffbb26',
    iconColor: 'text-ink',
    title: 'Screenshot Reference',
    body: 'Attach a chart screenshot to any trade or backtest so you can see exactly what you saw in the moment.',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <circle cx="12" cy="13" r="3.5" strokeWidth={2} />
      </svg>
    ),
  },
]

const HIGHLIGHTS = [
  { color: '#0090ff', title: 'Log a trade in under a minute', body: 'A short form built around the fields that actually matter.' },
  { color: '#9f4fff', title: 'Know your win rate at a glance', body: 'Expectancy, profit factor, and equity — always current.' },
  { color: '#00ca48', title: 'Backtest without the risk', body: 'Simulated trades stay fully separate from your live results.' },
  { color: '#ff58ae', title: 'See where you stand', body: 'A public leaderboard ranked by total P&L, not trade count.' },
]

function IllustrationCluster({ flip = false }) {
  return (
    <svg
      viewBox="0 0 220 320"
      className={`w-full h-auto max-w-[220px] ${flip ? 'scale-x-[-1]' : ''}`}
      aria-hidden="true"
    >
      {/* soft blob */}
      <path
        d="M60 40c28-14 58 2 62 30 4 26-14 40-38 46-26 6-52-6-56-32-4-24 8-32 32-44z"
        fill="#64c6ff"
        stroke="#343433"
        strokeWidth="1.5"
      />
      {/* coin */}
      <circle cx="150" cy="60" r="24" fill="#ffcd6c" stroke="#343433" strokeWidth="1.5" />
      <path d="M142 60h16M150 52v16" stroke="#343433" strokeWidth="1.5" strokeLinecap="round" />
      {/* candlestick trend */}
      <g stroke="#343433" strokeWidth="1.5" strokeLinecap="round">
        <line x1="40" y1="190" x2="40" y2="230" />
        <rect x="32" y="196" width="16" height="24" rx="3" fill="#00c978" />
        <line x1="80" y1="170" x2="80" y2="220" />
        <rect x="72" y="178" width="16" height="28" rx="3" fill="#00c978" />
        <line x1="120" y1="140" x2="120" y2="196" />
        <rect x="112" y="150" width="16" height="30" rx="3" fill="#ff58ae" />
      </g>
      {/* star confetti */}
      <path
        d="M182 150l6 13 14 2-10 10 2 14-12-7-12 7 2-14-10-10 14-2z"
        fill="#ff3e00"
        stroke="#343433"
        strokeWidth="1.2"
      />
      {/* rounded square */}
      <rect x="20" y="250" width="46" height="46" rx="16" fill="#9f4fff" stroke="#343433" strokeWidth="1.5" />
      {/* heart */}
      <path
        d="M170 250c0-10-8-16-16-16-6 0-10 3-12 8-2-5-6-8-12-8-8 0-16 6-16 16 0 14 20 28 28 32 8-4 28-18 28-32z"
        fill="#ff2b3a"
        opacity="0.85"
        transform="translate(0,-2) scale(0.55) translate(72,60)"
        stroke="#343433"
        strokeWidth="1.5"
      />
      {/* small dots */}
      <circle cx="190" cy="230" r="5" fill="#00b2ff" stroke="#343433" strokeWidth="1" />
      <circle cx="24" cy="140" r="4" fill="#ffbb26" stroke="#343433" strokeWidth="1" />
    </svg>
  )
}

export default async function Home() {
  const cookieStore = await cookies()
  const user = await getSessionUser(cookieStore)

  if (user) {
    redirect('/dashboard')
  }

  return (
    <div className="bg-canvas">
      <Navbar initialSession={null} />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 pt-14 pb-16 md:pt-20 md:pb-24">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_minmax(0,640px)_1fr] items-center gap-6">
            <div className="hidden md:flex justify-end">
              <IllustrationCluster />
            </div>

            <div className="text-center">
              <h1 className="fc-display text-5xl sm:text-6xl md:text-7xl mb-6">
                Every trade. <span className="text-[#ff3e00]">Every edge.</span> One journal.
              </h1>
              <p className="text-lg md:text-xl text-brown leading-relaxed max-w-xl mx-auto mb-8">
                Log your trades, backtest strategies, and see your win rate in black and white — so you
                trade your plan, not your feelings.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/signup" className="fc-btn fc-btn-primary text-base px-8 py-3.5 w-full sm:w-auto">
                  Get Started
                </Link>
                <Link href="/login" className="fc-btn fc-btn-secondary text-base px-8 py-3.5 w-full sm:w-auto">
                  Login
                </Link>
              </div>
            </div>

            <div className="hidden md:flex justify-start">
              <IllustrationCluster flip />
            </div>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section className="max-w-7xl mx-auto px-4 pb-20 md:pb-28">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="fc-heading-lg text-3xl md:text-4xl mb-3">Everything a trading journal should do</h2>
          <p className="text-brown text-lg">
            One place to log, review, and prove your edge — without spreadsheets.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="fc-card fc-card-hover p-8 flex flex-col">
              <div
                className={`mb-6 w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${f.iconColor}`}
                style={{ background: f.color }}
              >
                {f.icon}
              </div>
              <h3 className="fc-heading text-xl mb-2">{f.title}</h3>
              <p className="text-[15px] text-brown leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dark highlight panel */}
      <section className="max-w-7xl mx-auto px-4 pb-20 md:pb-28">
        <div className="fc-card-dark p-8 md:p-12 grid grid-cols-1 md:grid-cols-[1fr_1.2fr] gap-10 items-center">
          <div>
            <h2 className="fc-heading-lg text-3xl md:text-4xl text-white mb-4">Trade with your eyes open</h2>
            <p className="text-white/60 text-base leading-relaxed">
              Trader Chronicles keeps the numbers honest — every entry, exit, and outcome logged the moment it
              happens, so review day never turns into guesswork.
            </p>
          </div>
          <div className="flex flex-col gap-1">
            {HIGHLIGHTS.map((h) => (
              <div key={h.title} className="flex items-start gap-4 py-3">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: h.color }}
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
                <div>
                  <p className="text-white font-semibold text-[15px]">{h.title}</p>
                  <p className="text-white/60 text-[13px] mt-0.5">{h.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-4 pb-24 text-center">
        <h2 className="fc-heading-lg text-3xl md:text-4xl mb-4">Start your trading journal today</h2>
        <p className="text-brown text-lg mb-8">Free to use. No credit card, no catches.</p>
        <Link href="/signup" className="fc-btn fc-btn-primary text-base px-10 py-4 inline-flex">
          Create your account
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--stone)]">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="fc-heading text-base">Trader Chronicles</span>
          <p className="text-muted text-sm">© {new Date().getFullYear()} Trader Chronicles. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
