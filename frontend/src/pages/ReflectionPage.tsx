import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowRight, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { API_URL, parseResponse } from '@/lib/api'
import { cn } from '@/lib/utils'
import { useIsAuthenticated } from '@/lib/useIsAuthenticated'
import { SignInPrompt } from '@/components/SignInPrompt'

interface Quote {
  log_id: number
  log_date: string
  weekday_label: string
  snippet: string
  is_full: boolean
}

interface Callout {
  prose: string
  action: { label: string; to: string } | null
}

interface Reflection {
  period: 'week' | 'month'
  range_start: string
  range_end: string
  check_in_count: number
  summary: string
  quotes: Quote[]
  patterns: string[]
  callout: Callout | null
}

type Period = 'week' | 'month'

export function ReflectionPage() {
  const { t, i18n } = useTranslation()
  const isSignedIn = useIsAuthenticated()
  const [period, setPeriod] = useState<Period>('week')
  // When `period === 'month'`, this controls which calendar month the
  // backend is asked to summarise. Null means "current rolling 28 days"
  // (the default). Format: 'YYYY-MM'.
  const [monthCursor, setMonthCursor] = useState<string | null>(null)
  const [data, setData] = useState<Reflection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  useEffect(() => {
    if (!isSignedIn) return
    const token = localStorage.getItem('auth_token')!
    let cancelled = false
    setData(null)
    setError(null)
    const lang = i18n.language?.split('-')[0] || 'en'
    // Backend routes are /weekly and /monthly, not /week and /month.
    const endpoint = period === 'week' ? 'weekly' : 'monthly'
    const params = new URLSearchParams({ lang })
    if (period === 'month' && monthCursor) params.set('month', monthCursor)
    fetch(`${API_URL}/reflection/${endpoint}?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => parseResponse<Reflection>(r))
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load.'))
    return () => {
      cancelled = true
    }
  }, [period, monthCursor, i18n.language, isSignedIn])

  if (!isSignedIn) {
    return (
      <SignInPrompt
        title="Sign in to see your reflection"
        body="Your weekly look-back is built from your own check-ins. Sign in to see it."
      />
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    )
  }

  return (
    <div className="px-6 pb-24 pt-12">
      <div className="mx-auto max-w-2xl">
        {/* Page header */}
        <header>
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">
            {t('reflection.eyebrow', 'A look back')}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
            {period === 'week'
              ? t('reflection.headlineWeek', 'How this week has felt')
              : t('reflection.headlineMonth', 'How this month has felt')}
          </h1>
          {data && (
            <p className="mt-3 text-sm text-text-secondary">
              {formatRange(data.range_start, data.range_end, i18n.language)}
            </p>
          )}
        </header>

        {/* Period toggle */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-full bg-cream-dark/60 p-1">
            <ToggleButton
              active={period === 'week'}
              onClick={() => {
                setPeriod('week')
                setMonthCursor(null)
              }}
            >
              {t('reflection.toggleWeek', 'Week')}
            </ToggleButton>
            <ToggleButton
              active={period === 'month'}
              onClick={() => setPeriod('month')}
            >
              {t('reflection.toggleMonth', 'Month')}
            </ToggleButton>
          </div>

          {period === 'month' && (
            <MonthNavigator
              cursor={monthCursor}
              onChange={setMonthCursor}
              locale={i18n.language}
              currentLabel={t('reflection.currentMonth', 'Current month')}
            />
          )}
        </div>

        {/* Body */}
        {!data ? (
          <div className="flex items-center justify-center py-24 text-text-muted">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            {/* Summary paragraph */}
            <motion.div
              key={`summary-${period}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-8 rounded-2xl px-6 py-8 sm:px-8 sm:py-10"
              style={{ backgroundColor: '#FAF7F2' }}
            >
              <p className="font-serif text-lg leading-relaxed text-text-primary sm:text-xl">
                {data.summary}
              </p>
            </motion.div>

            {/* Section 1 — quotes */}
            {data.quotes.length > 0 && (
              <section className="mt-12">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {period === 'week'
                    ? t('reflection.quotesHeadingWeek', 'What you wrote this week')
                    : t('reflection.quotesHeadingMonth', 'What you wrote this month')}
                </h2>
                <ul className="mt-4 space-y-3">
                  {data.quotes.map((q) => (
                    <li
                      key={q.log_id}
                      className="rounded-xl bg-white p-4 ring-1 ring-black/[0.04]"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((m) => ({ ...m, [q.log_id]: !m[q.log_id] }))
                        }
                        className="w-full text-left"
                        aria-expanded={!!expanded[q.log_id]}
                      >
                        <p className="text-xs text-text-muted">{q.weekday_label}</p>
                        <p className="mt-1 text-sm leading-relaxed text-text-primary">
                          &ldquo;{q.snippet}&rdquo;
                        </p>
                        {!q.is_full && (
                          <span className="mt-2 inline-flex items-center gap-1 text-xs text-text-muted">
                            <ChevronDown
                              className={cn(
                                'h-3.5 w-3.5 transition-transform',
                                expanded[q.log_id] && 'rotate-180'
                              )}
                            />
                            {t('reflection.openInJournal', 'Open in journal')}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/journal"
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-brand hover:underline"
                >
                  {t('reflection.seeJournal', 'See full journal')}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </section>
            )}

            {/* Section 2 — patterns */}
            {data.patterns.length > 0 && (
              <section className="mt-12">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {period === 'week'
                    ? t('reflection.patternsHeadingWeek', 'Patterns this week')
                    : t('reflection.patternsHeadingMonth', 'Patterns this month')}
                </h2>
                <ul className="mt-4 space-y-3">
                  {data.patterns.map((p, i) => (
                    <motion.li
                      key={`${period}-${i}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.08 }}
                      className="font-serif italic leading-relaxed text-text-secondary"
                    >
                      {p}
                    </motion.li>
                  ))}
                </ul>
              </section>
            )}

            {/* Section 3 — callout */}
            <AnimatePresence>
              {data.callout && (
                <motion.section
                  key={`callout-${period}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-12 rounded-2xl bg-brand-light/40 px-6 py-6 ring-1 ring-brand/15"
                >
                  <p className="text-sm leading-relaxed text-text-primary">
                    {data.callout.prose}
                  </p>
                  {data.callout.action && (
                    <Link
                      to={data.callout.action.to}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
                    >
                      {data.callout.action.label}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </motion.section>
              )}
            </AnimatePresence>

            {/* Quiet footer */}
            <p className="mt-16 text-center text-xs text-text-muted">
              {t(
                'reflection.footer',
                'This page reads back your own check-ins. Nothing here is a diagnosis.',
              )}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function MonthNavigator({
  cursor, onChange, locale, currentLabel,
}: {
  cursor: string | null  // 'YYYY-MM' or null = current month
  onChange: (next: string | null) => void
  locale: string
  currentLabel: string
}) {
  // The "effective" month we're showing. When cursor is null, treat as
  // the current calendar month so the arrows always have a stable anchor.
  const now = new Date()
  const effective = cursor
    ? parseMonthString(cursor)
    : { year: now.getFullYear(), month: now.getMonth() + 1 }
  const isCurrent = !cursor

  function step(delta: number) {
    let { year, month } = effective
    month += delta
    while (month > 12) { month -= 12; year += 1 }
    while (month < 1)  { month += 12; year -= 1 }
    const next = `${year}-${String(month).padStart(2, '0')}`
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    onChange(next === thisMonth ? null : next)
  }

  // Don't let the visitor navigate into the future.
  const atCurrentMonth =
    effective.year === now.getFullYear() && effective.month === now.getMonth() + 1

  const label = formatMonthLabel(effective.year, effective.month, locale)

  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-cream-dark/60 p-1">
      <button
        type="button"
        onClick={() => step(-1)}
        aria-label="Previous month"
        className="rounded-full p-1.5 text-text-secondary transition-colors hover:text-text-primary"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[7rem] text-center text-sm font-medium text-text-primary">
        {label}
        {isCurrent && (
          <span className="ml-1 text-[10px] font-normal uppercase tracking-wider text-text-muted">
            · {currentLabel}
          </span>
        )}
      </span>
      <button
        type="button"
        onClick={() => step(1)}
        disabled={atCurrentMonth}
        aria-label="Next month"
        className="rounded-full p-1.5 text-text-secondary transition-colors hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

function parseMonthString(s: string): { year: number; month: number } {
  const [y, m] = s.split('-').map(Number)
  return { year: y, month: m }
}

function formatMonthLabel(year: number, month: number, locale: string): string {
  const loc = locale.startsWith('am') ? 'am-ET' : undefined
  return new Date(year, month - 1, 1).toLocaleDateString(loc, {
    month: 'long',
    year: 'numeric',
  })
}

function ToggleButton({
  active, onClick, children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-white text-text-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary',
      )}
    >
      {children}
    </button>
  )
}

function formatRange(startIso: string, endIso: string, lang: string): string {
  const locale = lang.startsWith('am') ? 'am-ET' : undefined
  const start = new Date(startIso)
  const end = new Date(endIso)
  const fmt = (d: Date) =>
    d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
  return `${fmt(start)} — ${fmt(end)}`
}
