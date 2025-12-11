export const dynamic = 'force-dynamic'

import Link from 'next/link'
import Navbar from '@/components/Navbar'

export default function Dashboard() {
  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 py-16 md:py-24">
        <section className="w-full relative mb-20">
          <div className="w-full border-4 border-black bg-white p-6 md:p-16 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
              <svg className="w-64 h-64" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>

            <div className="relative z-10">
              <h1 className="text-6xl md:text-9xl font-bold tracking-tighter uppercase mb-2">Trader Chronicles</h1>
              <div className="w-full h-1 bg-black mb-8"></div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                <div className="max-w-xl">
                  <h2 className="text-3xl md:text-5xl font-semibold tracking-tight uppercase mb-4">
                    Backtesting Strategy Log
                  </h2>
                  <p className="text-lg md:text-xl text-zinc-600 leading-relaxed font-medium">
                    Track, analyze, and fine-tune your trading strategies with comprehensive backtesting data visualization and analytics.
                  </p>
                </div>

                <div className="inline-flex items-center gap-3 bg-black text-white px-6 py-3 border-2 border-black shadow-[4px_4px_0px_0px_#ea580c] transform -rotate-1 hover:rotate-0 transition-transform cursor-default">
                  <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="text-sm font-semibold tracking-wide">POWERED BY SUPABASE</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="w-full grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-6">
          <Link href="/trades/new" className="group relative">
            <div className="absolute -top-3 -left-3 bg-white border-2 border-black px-2 py-1 z-20 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              ACTION 01
            </div>
            <div className="h-full border-2 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all group-hover:-translate-y-1 group-hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <div className="mb-6 p-3 bg-zinc-50 border-2 border-black w-fit">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-4">New Trade Entry</h3>
              <div className="h-0.5 w-12 bg-black mb-4"></div>
              <p className="text-base text-zinc-600 leading-relaxed flex-grow">
                Log a new backtest trade with all the details including entry, exit, stop loss, and strategy information.
              </p>
            </div>
          </Link>

          <Link href="/trades" className="group relative md:-mt-4">
            <div className="absolute -top-3 -left-3 bg-black text-white border-2 border-black px-2 py-1 z-20 text-xs font-bold shadow-[2px_2px_0px_0px_#ea580c]">
              ACTION 02
            </div>
            <div className="h-full border-2 border-black bg-orange-600 text-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all group-hover:-translate-y-1 group-hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-20">
                <svg className="w-24 h-24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="relative z-10">
                <div className="mb-6 p-3 bg-black border-2 border-white w-fit text-white">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold tracking-tight mb-4">Trade Log</h3>
                <div className="h-0.5 w-12 bg-white mb-4"></div>
                <p className="text-base text-orange-50 leading-relaxed font-medium">
                  View, search, and filter all your backtest entries. Sort by date, asset, strategy, or result.
                </p>
              </div>
            </div>
          </Link>

          <Link href="/analytics" className="group relative">
            <div className="absolute -top-3 -left-3 bg-white border-2 border-black px-2 py-1 z-20 text-xs font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              ACTION 03
            </div>
            <div className="h-full border-2 border-black bg-white p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all group-hover:-translate-y-1 group-hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <div className="mb-6 p-3 bg-zinc-50 border-2 border-black w-fit">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-4">Analytics</h3>
              <div className="h-0.5 w-12 bg-black mb-4"></div>
              <p className="text-base text-zinc-600 leading-relaxed flex-grow">
                Analyze your strategy performance with win rates, R-multiple distributions, equity curves, and more.
              </p>
            </div>
          </Link>
        </section>

        <section className="w-full flex justify-center mt-20 pb-8">
          <Link href="/trades/new" className="group relative w-full max-w-2xl">
            <div className="absolute inset-0 bg-black translate-x-3 translate-y-3"></div>
            <div className="relative border-4 border-black bg-orange-600 px-8 py-6 flex items-center justify-center gap-4 hover:-translate-y-1 hover:-translate-x-1 transition-transform duration-100 active:translate-x-1 active:translate-y-1">
              <span className="text-3xl font-bold text-white tracking-tight">LOG NEW TRADE</span>
              <svg className="w-8 h-8 text-white group-hover:animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </Link>
        </section>
      </div>
    </>
  )
}

