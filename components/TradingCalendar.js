'use client'

import { useMemo, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'

/** Short labels fit narrow screens; Sun starts week to match grid */
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function formatMoney(n) {
  const v = Number(n) || 0
  const abs = Math.abs(v).toFixed(2)
  if (v > 0) return `+$${abs}`
  if (v < 0) return `-$${abs}`
  return '$0.00'
}

export default function TradingCalendar({ dailyContribution = [] }) {
  const [cursorMonth, setCursorMonth] = useState(() => new Date())

  const byDate = useMemo(() => {
    const m = new Map()
    dailyContribution.forEach((d) => {
      if (!d?.date) return
      m.set(d.date, {
        trades: d.total ?? 0,
        pnl: typeof d.pnl === 'number' ? d.pnl : parseFloat(d.pnl) || 0,
      })
    })
    return m
  }, [dailyContribution])

  const weeks = useMemo(() => {
    const monthStart = startOfMonth(cursorMonth)
    const monthEnd = endOfMonth(cursorMonth)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
    const days = eachDayOfInterval({ start: gridStart, end: gridEnd })
    const rows = []
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7))
    }
    return rows
  }, [cursorMonth])

  const today = new Date()

  return (
    <div className="w-full max-w-full">
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch] sm:overflow-visible">
        <div className="min-w-[300px] border-4 border-black bg-white shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] sm:min-w-0">
          <div className="flex items-center justify-between gap-2 border-b-4 border-black bg-white px-2 py-3 sm:gap-4 sm:px-4 sm:py-4">
            <button
              type="button"
              onClick={() => setCursorMonth((d) => subMonths(d, 1))}
              className="flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center border-2 border-black bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              aria-label="Previous month"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="min-w-0 flex-1 text-center text-base font-bold tracking-tight text-black sm:text-xl">
              <span className="block truncate">{format(cursorMonth, 'MMMM yyyy')}</span>
            </h3>
            <button
              type="button"
              onClick={() => setCursorMonth((d) => addMonths(d, 1))}
              className="flex h-11 min-h-[44px] min-w-[44px] shrink-0 items-center justify-center border-2 border-black bg-white text-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-zinc-100 active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
              aria-label="Next month"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 border-b-4 border-black bg-zinc-50">
            {WEEKDAYS.map((label) => (
              <div
                key={label}
                className="border-r-2 border-black py-2 text-center text-[10px] font-bold uppercase tracking-wide text-black last:border-r-0 sm:text-xs"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="divide-y-2 divide-black">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 divide-x-2 divide-black">
                {week.map((day) => {
                  const key = format(day, 'yyyy-MM-dd')
                  const stats = byDate.get(key)
                  const inMonth = isSameMonth(day, cursorMonth)
                  const isToday = isSameDay(day, today)
                  const pnl = stats?.pnl ?? 0
                  const profitable = pnl > 0
                  const lossDay = pnl < 0

                  return (
                    <div
                      key={key}
                      className={[
                        'relative flex min-h-[76px] flex-col sm:min-h-[104px]',
                        !inMonth ? 'bg-zinc-100' : 'bg-white',
                        isToday ? 'ring-2 ring-orange-600 ring-inset z-[1]' : '',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute right-1 top-1 text-[10px] font-bold tabular-nums sm:right-2 sm:top-1.5 sm:text-xs',
                          inMonth ? 'text-black' : 'text-zinc-400',
                        ].join(' ')}
                      >
                        {format(day, 'd')}
                      </span>

                      {stats && stats.trades > 0 && (
                        <div
                          className={[
                            'mt-5 flex flex-1 flex-col justify-end gap-0.5 pl-1.5 pr-0.5 pb-1.5 sm:mt-7 sm:gap-1 sm:pl-2 sm:pr-1 sm:pb-2',
                            profitable
                              ? 'border-l-4 border-green-600'
                              : lossDay
                                ? 'border-l-4 border-red-600'
                                : 'border-l-4 border-zinc-400',
                          ].join(' ')}
                        >
                          <p className="text-[9px] leading-tight text-zinc-600 sm:text-xs">
                            <span className="font-normal">Trades </span>
                            <span className="font-bold text-black">{stats.trades}</span>
                          </p>
                          <p
                            className={[
                              'break-words text-[9px] font-bold leading-snug tabular-nums sm:text-xs',
                              profitable ? 'text-green-700' : lossDay ? 'text-red-700' : 'text-zinc-700',
                            ].join(' ')}
                          >
                            {formatMoney(pnl)}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
