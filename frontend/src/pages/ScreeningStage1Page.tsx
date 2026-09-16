/**
 * ScreeningStage1Page — the Stage 1 triage questions.
 *
 * Thin wrapper: loads the session and hands it to InstrumentRunner, which is
 * shared with Stage 2. The only Stage 1 specifics are which API functions to
 * call and what to offer at the end when the result indicates Stage 2.
 */

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { SupportedLang } from '@/lib/i18n'
import { DevResetParticipant } from '@/components/screening/DevResetParticipant'
import { InstrumentRunner } from '@/components/screening/InstrumentRunner'
import {
  answerStage1,
  completeStage1,
  fetchConsentContent,
  fetchConsentState,
  startStage1,
  type ConsentBundle,
  type InstrumentStart,
} from '@/lib/screening'

export function ScreeningStage1Page() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [start, setStart] = useState<InstrumentStart | null>(null)
  const [withdrawCopy, setWithdrawCopy] = useState<ConsentBundle['withdraw'] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const language = (i18n.language?.split('-')[0] || 'en') as SupportedLang

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      // The server gates this regardless; checking first only avoids flashing
      // a question screen that is about to 403.
      const state = await fetchConsentState().catch(() => null)
      if (cancelled) return
      if (!state || !state.can_screen) {
        navigate('/screening/consent', { replace: true })
        return
      }

      const lang = (state.language || language) as SupportedLang
      try {
        const [data, consent] = await Promise.all([
          startStage1(lang),
          fetchConsentContent(lang).catch(() => null),
        ])
        if (cancelled) return
        setStart(data)
        setWithdrawCopy(consent?.content.withdraw ?? null)
      } catch (err) {
        if (cancelled) return
        // Detail goes to the console, not to her — it names internal content
        // keys and languages.
        console.error('[screening] stage 1 unavailable:', err)
        setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate])

  if (loading) return <Loading label={t('common.loading', 'Loading')} />

  if (error || !start) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
        <h1 className="text-2xl font-semibold text-text-primary">
          {t('screening.unavailableTitle', 'Not available yet')}
        </h1>
        <p className="mt-4 leading-relaxed text-text-secondary">
          {t('screening.unavailableBody',
             'The questions are not ready in this language yet. Everything else is still open to you.')}
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-brand
                     px-6 py-3.5 font-medium text-white transition hover:bg-brand-dark"
        >
          {t('screening.backHome', 'Back to home')}
        </Link>
        <DevResetParticipant />
      </div>
    )
  }

  return (
    <InstrumentRunner
      start={start}
      withdrawCopy={withdrawCopy}
      answer={answerStage1}
      complete={completeStage1}
      renderResultExtra={(result) =>
        // `next` is the server's decision from the bundle's bands, not ours.
        result.next === 'stage2' ? (
          <div className="mt-6 rounded-2xl border-2 border-brand-muted bg-white p-5">
            <p className="text-text-secondary">
              {t('screening.stage2Invite',
                 'There is a second, longer set of questions we would like to ask.')}
            </p>
            <Link
              to="/screening/stage2"
              className="mt-4 inline-flex items-center justify-center rounded-full bg-brand
                         px-5 py-3 font-medium text-white transition hover:bg-brand-dark"
            >
              {t('screening.stage2Continue', 'Continue')}
            </Link>
          </div>
        ) : null
      }
    />
  )
}

export function Loading({ label }: { label: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden />
      <span className="sr-only">{label}</span>
    </div>
  )
}
