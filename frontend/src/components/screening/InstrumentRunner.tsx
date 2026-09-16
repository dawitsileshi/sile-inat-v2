/**
 * InstrumentRunner — the shared question runner for Stage 1 and Stage 2.
 *
 * The two stages present identically: one question per screen, an answer
 * posted the moment she taps it, an immediate response if she discloses
 * self-harm, and a result built from bundle copy. Only the API calls differ,
 * so those are injected and everything else lives here once.
 *
 * This component computes nothing. It does not total a score, decide a band,
 * or decide what follows. The server does all three from the versioned content
 * bundle and hands back the outcome.
 */

import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'
import { WithdrawControl } from '@/components/screening/WithdrawControl'
import type {
  ConsentBundle,
  InstrumentAnswerResult,
  InstrumentResult,
  InstrumentStart,
  SafetyResponseCopy,
} from '@/lib/screening'

type View = 'questions' | 'safety' | 'result'

export function InstrumentRunner({
  start,
  withdrawCopy,
  answer,
  complete,
  renderResultExtra,
}: {
  start: InstrumentStart
  withdrawCopy: ConsentBundle['withdraw'] | null
  answer: (itemCode: string, value: number) => Promise<InstrumentAnswerResult>
  complete: () => Promise<InstrumentResult>
  /** Stage-specific footer on the result screen (e.g. the link onward). */
  renderResultExtra?: (result: InstrumentResult) => React.ReactNode
}) {
  const { t } = useTranslation()

  const items = start.content.items
  const [answers, setAnswers] = useState<Record<string, number>>(start.progress.answers || {})
  const [index, setIndex] = useState(() => {
    const firstUnanswered = items.findIndex(
      (item) => !(item.code in (start.progress.answers || {})),
    )
    return firstUnanswered === -1 ? Math.max(items.length - 1, 0) : firstUnanswered
  })
  const [view, setView] = useState<View>('questions')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [safety, setSafety] = useState<SafetyResponseCopy | null>(null)
  const [result, setResult] = useState<InstrumentResult | null>(null)

  const current = items[index]
  const answeredCount = Object.keys(answers).length

  const finish = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      setResult(await complete())
      setView('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setView('questions')
    } finally {
      setBusy(false)
    }
  }, [complete])

  const advance = useCallback((from: number) => {
    if (from < items.length - 1) {
      setIndex(from + 1)
      setView('questions')
    } else {
      void finish()
    }
  }, [items.length, finish])

  const choose = useCallback(async (value: number) => {
    if (!current || busy) return
    const at = index
    setBusy(true)
    setError(null)
    try {
      const res = await answer(current.code, value)
      setAnswers((prev) => ({ ...prev, [current.code]: value }))

      if (res.safety_triggered && res.safety_response) {
        // Shown straight away. She should not have to finish a questionnaire
        // to be met after saying this.
        setSafety(res.safety_response)
        setView('safety')
        return
      }
      advance(at)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }, [current, busy, index, answer, advance])

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <AnimatePresence mode="wait">
        {view === 'questions' && current && (
          <motion.div
            key={current.code}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">
                {t('screening.progress', '{{current}} of {{total}}', {
                  current: index + 1, total: items.length,
                })}
              </span>
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-1.5 rounded text-sm text-text-secondary
                             hover:text-text-primary focus:outline-none focus-visible:ring-2
                             focus-visible:ring-brand"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  {start.content.back_label || t('screening.back', 'Back')}
                </button>
              )}
            </div>

            {/* Brand green, never a warning colour — how far through she is
                carries no risk meaning. */}
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
              <div
                className="h-full rounded-full bg-brand transition-all duration-300"
                style={{ width: `${(answeredCount / Math.max(items.length, 1)) * 100}%` }}
              />
            </div>

            {index === 0 && start.content.instruction && (
              <p className="mt-6 text-text-secondary">{start.content.instruction}</p>
            )}

            <h1 className="mt-6 text-xl font-semibold leading-snug text-text-primary sm:text-2xl">
              {current.text}
            </h1>

            <div className="mt-6 space-y-3">
              {current.options.map((option) => {
                const selected = answers[current.code] === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    disabled={busy}
                    onClick={() => choose(option.value)}
                    className={cn(
                      'w-full rounded-2xl border-2 px-5 py-4 text-left transition',
                      'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                      'disabled:opacity-60',
                      selected
                        ? 'border-brand bg-brand-light text-text-primary'
                        : 'border-brand-muted bg-white text-text-primary hover:border-brand',
                    )}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            {error && <Note>{error}</Note>}

            {/* A validated instrument's licence requires its source on every
                reproduced copy. The citation text comes from the bundle. */}
            {start.content.attribution && (
              <p className="mt-8 text-xs leading-relaxed text-text-secondary">
                {start.content.attribution}
              </p>
            )}
          </motion.div>
        )}

        {view === 'safety' && safety && (
          <motion.div key="safety" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h1 className="text-2xl font-semibold text-text-primary">{safety.title}</h1>
            <p className="mt-4 leading-relaxed text-text-secondary">{safety.body}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                // Opens the existing crisis hub, which holds the verified
                // contacts. No phone number is ever rendered from here.
                onClick={() => window.dispatchEvent(new Event('crisis:open'))}
                className="inline-flex flex-1 items-center justify-center rounded-full bg-brand
                           px-6 py-3.5 font-medium text-white transition hover:bg-brand-dark"
              >
                {safety.action_label}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => advance(index)}
                className="inline-flex flex-1 items-center justify-center rounded-full border-2
                           border-brand-muted bg-white px-6 py-3.5 font-medium text-text-primary
                           transition hover:border-brand disabled:opacity-60"
              >
                {start.content.continue_label || t('screening.continue', 'Continue')}
              </button>
            </div>
          </motion.div>
        )}

        {view === 'result' && result && (
          <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
              {result.result?.title ?? t('screening.doneTitle', 'Thank you')}
            </h1>
            <p className="mt-4 leading-relaxed text-text-secondary">
              {result.result?.body ?? ''}
            </p>

            {result.safety_response && (
              <div className="mt-6 rounded-2xl border-2 border-brand-muted bg-white p-5">
                <h2 className="font-semibold text-text-primary">
                  {result.safety_response.title}
                </h2>
                <p className="mt-2 text-text-secondary">{result.safety_response.body}</p>
                <button
                  type="button"
                  onClick={() => window.dispatchEvent(new Event('crisis:open'))}
                  className="mt-4 inline-flex items-center justify-center rounded-full bg-brand
                             px-5 py-3 font-medium text-white hover:bg-brand-dark"
                >
                  {result.safety_response.action_label}
                </button>
              </div>
            )}

            {renderResultExtra?.(result)}

            <div className="mt-8">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full bg-brand
                           px-6 py-3.5 font-medium text-white transition hover:bg-brand-dark"
              >
                {t('screening.backHome', 'Back to home')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available from the moment screening starts, on every view, per the
          clinical spec. Wording comes from the consent bundle. */}
      {withdrawCopy && (
        <div className="mt-12 border-t border-brand-muted pt-6">
          <WithdrawControl copy={withdrawCopy} />
        </div>
      )}

      {start.review_required && (
        <p className="mt-6 rounded-xl bg-stone-100 px-4 py-3 text-xs text-text-secondary">
          Placeholder content — not the agreed instrument. Pending review before the pilot.
        </p>
      )}
    </div>
  )
}

export function Note({ children }: { children: React.ReactNode }) {
  // Errors direct, never in red.
  return (
    <p className="mt-5 rounded-xl bg-stone-100 px-4 py-3 text-sm text-text-secondary">
      {children}
    </p>
  )
}
