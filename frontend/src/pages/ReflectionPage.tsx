import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowRight, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { API_URL, parseResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

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
  week_start: string
  week_end: string
  check_in_count: number
  summary: string
  quotes: Quote[]
  patterns: string[]
  callout: Callout | null
}

export function ReflectionPage() {
  const { t } = useTranslation()
  const [data, setData] = useState<Reflection | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})

  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setError('Sign in to see your weekly reflection.')
      return
    }
    let cancelled = false
    fetch(`${API_URL}/reflection/weekly`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => parseResponse<Reflection>(r))
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'Could not load this week.'))
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <p className="text-sm text-text-secondary">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto flex max-w-2xl items-center justify-center px-6 py-24 text-text-muted">
        <Loader2 className="h-5 w-5 animate-spin" />
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
            {t('reflection.headline', 'How this week has felt')}
          </h1>
          <p className="mt-3 text-sm text-text-secondary">
            {formatWeekRange(data.week_start, data.week_end)}
          </p>
        </header>

        {/* Summary paragraph */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-10 rounded-2xl bg-cream-card px-6 py-8 sm:px-8 sm:py-10"
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
              {t('reflection.quotesHeading', 'What you wrote this week')}
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
              {t('reflection.patternsHeading', 'Patterns this week')}
            </h2>
            <ul className="mt-4 space-y-3">
              {data.patterns.map((p, i) => (
                <motion.li
                  key={i}
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
      </div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWeekRange(startIso: string, endIso: string): string {
  // "Mon, Jun 8 – Sun, Jun 14" — kept short so it lives on one line on mobile.
  const start = new Date(startIso)
  const end = new Date(endIso)
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${fmt(start)} — ${fmt(end)}`
}
