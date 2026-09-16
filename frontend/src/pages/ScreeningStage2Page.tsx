/**
 * ScreeningStage2Page — the EPDS questions.
 *
 * Reachable only when Stage 1 indicated it. The server enforces that on every
 * Stage 2 route; this page's job is to tell her *which* refusal happened,
 * because "you have not finished the first questions" and "the first questions
 * did not lead here" mean quite different things and should not share a screen.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import type { SupportedLang } from '@/lib/i18n'
import { DevResetParticipant } from '@/components/screening/DevResetParticipant'
import { InstrumentRunner } from '@/components/screening/InstrumentRunner'
import { Loading } from '@/pages/ScreeningStage1Page'
import {
  answerStage2,
  completeStage2,
  fetchConsentContent,
  fetchConsentState,
  startStage2,
  type ConsentBundle,
  type InstrumentResult,
  type InstrumentStart,
} from '@/lib/screening'

/** Which refusal the server gave, so the copy can match it. */
type Blocked = 'stage1_required' | 'stage2_not_indicated' | 'unavailable'

export function ScreeningStage2Page() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [start, setStart] = useState<InstrumentStart | null>(null)
  const [done, setDone] = useState<InstrumentResult | null>(null)
  const [withdrawCopy, setWithdrawCopy] = useState<ConsentBundle['withdraw'] | null>(null)
  const [blocked, setBlocked] = useState<Blocked | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const language = (i18n.language?.split('-')[0] || 'en') as SupportedLang

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const state = await fetchConsentState().catch(() => null)
      if (cancelled) return
      if (!state || !state.can_screen) {
        navigate('/screening/consent', { replace: true })
        return
      }

      const lang = (state.language || language) as SupportedLang
      try {
        const [data, consent] = await Promise.all([
          startStage2(lang),
          fetchConsentContent(lang).catch(() => null),
        ])
        if (cancelled) return
        setWithdrawCopy(consent?.content.withdraw ?? null)
        if (data.completed) setDone(data.result)
        else setStart(data)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : String(err)
        // parseResponse surfaces the server's message; the code is what we
        // branch on, so match it out of the message it produced.
        if (/first/i.test(message) || /Stage 1 must be completed/i.test(message)) {
          setBlocked('stage1_required')
        } else if (/not indicated/i.test(message)) {
          setBlocked('stage2_not_indicated')
        } else {
          setBlocked('unavailable')
          console.error('[screening] stage 2 unavailable:', message)
          setError(message)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  if (loading) return <Loading label={t('common.loading', 'Loading')} />

  if (blocked) {
    const copy = {
      stage1_required: {
        title: t('screening.stage1FirstTitle', 'The first questions come first'),
        body: t('screening.stage1FirstBody',
                'These questions follow on from the first set. You can start there.'),
        to: '/screening/stage1',
        label: t('screening.stage1FirstAction', 'Go to the first questions'),
      },
      stage2_not_indicated: {
        title: t('screening.notIndicatedTitle', 'Nothing further to ask'),
        body: t('screening.notIndicatedBody',
                'Your answers did not lead to this second set. Everything else is still open to you.'),
        to: '/',
        label: t('screening.backHome', 'Back to home'),
      },
      unavailable: {
        title: t('screening.unavailableTitle', 'Not available yet'),
        body: t('screening.unavailableBody',
                'The questions are not ready in this language yet. Everything else is still open to you.'),
        to: '/',
        label: t('screening.backHome', 'Back to home'),
      },
    }[blocked]

    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <h1 className="text-2xl font-semibold text-text-primary">{copy.title}</h1>
        <p className="mt-4 leading-relaxed text-text-secondary">{copy.body}</p>
        <Link
          to={copy.to}
          className="mt-8 inline-flex items-center justify-center rounded-full bg-brand
                     px-6 py-3.5 font-medium text-white transition hover:bg-brand-dark"
        >
          {copy.label}
        </Link>
        <DevResetParticipant />
      </div>
    )
  }

  // She already finished the EPDS for this Stage 1 — show that result rather
  // than walking her through the same ten questions again.
  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
          {done.result?.title ?? t('screening.doneTitle', 'Thank you')}
        </h1>
        <p className="mt-4 leading-relaxed text-text-secondary">{done.result?.body ?? ''}</p>
        {done.safety_response && (
          <div className="mt-6 rounded-2xl border-2 border-brand-muted bg-white p-5">
            <h2 className="font-semibold text-text-primary">{done.safety_response.title}</h2>
            <p className="mt-2 text-text-secondary">{done.safety_response.body}</p>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event('crisis:open'))}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-brand
                         px-5 py-3 font-medium text-white hover:bg-brand-dark"
            >
              {done.safety_response.action_label}
            </button>
          </div>
        )}
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-brand
                     px-6 py-3.5 font-medium text-white transition hover:bg-brand-dark"
        >
          {t('screening.backHome', 'Back to home')}
        </Link>
      </div>
    )
  }

  if (!start) return null

  return (
    <InstrumentRunner
      start={start}
      withdrawCopy={withdrawCopy}
      answer={answerStage2}
      complete={completeStage2}
    />
  )
}
