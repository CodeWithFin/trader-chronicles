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
        <div className="min-w-[300px] fc-card overflow-hidden sm:min-w-0">
          <div className="flex items-center justify-between gap-2 fc-surface px-2 py-3 sm:gap-4 sm:px-4 sm:py-4">
            <button
              type="button"
              onClick={() => setCursorMonth((d) => subMonths(d, 1))}
              className="flex h-10 min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-full text-charcoal hover:bg-stone transition-colors"
              aria-label="Previous month"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="fc-heading min-w-0 flex-1 text-center text-base sm:text-xl">
              <span className="block truncate">{format(cursorMonth, 'MMMM yyyy')}</span>
            </h3>
            <button
              type="button"
              onClick={() => setCursorMonth((d) => addMonths(d, 1))}
              className="flex h-10 min-h-[40px] min-w-[40px] shrink-0 items-center justify-center rounded-full text-charcoal hover:bg-stone transition-colors"
              aria-label="Next month"
            >
              <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-7 shadow-[inset_0_-1px_0_0_var(--stone)]">
            {WEEKDAYS.map((label) => (
              <div
                key={label}
                className="py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-xs"
              >
                {label}
              </div>
            ))}
          </div>

          <div>
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7">
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
                        'relative flex min-h-[76px] flex-col shadow-[inset_-1px_-1px_0_0_var(--stone)] sm:min-h-[104px]',
                        !inMonth ? 'bg-[var(--stone)]/40' : 'bg-white',
                        isToday ? 'shadow-[inset_0_0_0_2px_#ff3e00]' : '',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'absolute right-1 top-1 text-[10px] font-semibold tabular-nums sm:right-2 sm:top-1.5 sm:text-xs',
                          inMonth ? 'text-charcoal' : 'text-muted',
                        ].join(' ')}
                      >
                        {format(day, 'd')}
                      </span>

                      {stats && stats.trades > 0 && (
                        <div
                          className={[
                            'mt-5 flex flex-1 flex-col justify-end gap-0.5 pl-1.5 pr-0.5 pb-1.5 sm:mt-7 sm:gap-1 sm:pl-2 sm:pr-1 sm:pb-2 border-l-4',
                            profitable
                              ? 'border-[#00ca48]'
                              : lossDay
                                ? 'border-[#ff2b3a]'
                                : 'border-[var(--stone-border)]',
                          ].join(' ')}
                        >
                          <p className="text-[9px] leading-tight text-muted sm:text-xs">
                            <span className="font-normal">Trades </span>
                            <span className="font-semibold text-charcoal">{stats.trades}</span>
                          </p>
                          <p
                            className={[
                              'break-words text-[9px] font-semibold leading-snug tabular-nums sm:text-xs',
                              profitable ? 'fc-text-pos' : lossDay ? 'fc-text-neg' : 'text-brown',
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
