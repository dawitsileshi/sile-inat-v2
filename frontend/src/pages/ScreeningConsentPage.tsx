/**
 * ScreeningConsentPage — language choice, then the consent gate.
 *
 * Every word she reads on this page comes from the server as versioned content
 * (`ScreeningContentVersion`), because `consent_version` on her consent record
 * has to mean something. Only chrome — the language question, loading and error
 * states — comes from the i18n bundle.
 *
 * This screen does not decide whether she may be screened. It shows her the
 * text and reports her decision. The server enforces the gate on every request.
 */

import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Check, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n'
import { DevResetParticipant } from '@/components/screening/DevResetParticipant'
import {
  fetchConsentContent,
  fetchConsentState,
  submitConsent,
  type ConsentContentResponse,
  type ConsentState,
} from '@/lib/screening'
import { cn } from '@/lib/utils'

type View = 'language' | 'consent' | 'declined' | 'withdrawn'

/** Language names are written in their own language, never translated. */
const LANGUAGE_LABELS: Record<SupportedLang, string> = {
  en: 'English',
  am: 'አማርኛ',
}

export function ScreeningConsentPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()

  const [view, setView] = useState<View>('language')
  const [language, setLanguage] = useState<SupportedLang | null>(null)
  const [bundle, setBundle] = useState<ConsentContentResponse | null>(null)
  const [checked, setChecked] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkboxHint, setCheckboxHint] = useState(false)

  // On arrival, ask the server what this browser's state already is. A mother
  // who declined or withdrew earlier should land on that answer, not be asked
  // again as though nothing happened.
  useEffect(() => {
    let cancelled = false
    fetchConsentState()
      .then((state: ConsentState | null) => {
        if (cancelled || !state) return
        if (state.status === 'accepted') navigate('/screening/stage1', { replace: true })
        else if (state.status === 'declined') setView('declined')
        else if (state.status === 'withdrawn') setView('withdrawn')
        if (state.language) setLanguage(state.language as SupportedLang)
      })
      .catch(() => { /* no usable state; start at the language question */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [navigate])

  const chooseLanguage = useCallback(async (lang: SupportedLang) => {
    setError(null)
    setLoading(true)
    setLanguage(lang)
    // Switch the app chrome too, so the page around the consent text matches
    // the language the consent text is written in.
    void i18n.changeLanguage(lang)
    try {
      const content = await fetchConsentContent(lang)
      setBundle(content)
      setView('consent')
    } catch (err) {
      // No fallback language by design: we would rather say "not available"
      // than show her a consent she may not be able to read.
      console.error('[screening] consent content failed:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [i18n])

  const decide = useCallback(async (decision: 'accepted' | 'declined') => {
    if (!bundle || !language) return
    if (decision === 'accepted' && !checked) {
      setCheckboxHint(true)
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const result = await submitConsent({
        decision,
        language,
        agreed: decision === 'accepted' ? checked : false,
        consentVersion: bundle.consent_version,
      })
      // The server tells us where to go. A client that ignored this could not
      // reach screening anyway; the gate is server-side.
      if (result.next === 'stage1') navigate('/screening/stage1')
      else setView('declined')
    } catch (err) {
      console.error('[screening] consent decision failed:', err)
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSubmitting(false)
    }
  }, [bundle, language, checked, navigate])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden />
        <span className="sr-only">{t('common.loading', 'Loading')}</span>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <AnimatePresence mode="wait">
        {view === 'language' && (
          <Panel key="language">
            <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
              {t('screening.languageTitle', 'Which language would you like?')}
            </h1>
            <p className="mt-3 text-text-secondary">
              {t('screening.languageHelp', 'You can change this later.')}
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              {SUPPORTED_LANGS.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => chooseLanguage(lang)}
                  className="rounded-2xl border-2 border-brand-muted bg-white px-6 py-5 text-lg
                             font-medium text-text-primary transition
                             hover:border-brand hover:bg-brand-light
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>
            {error && <ErrorNote message={t('errors.generic')} />}
          </Panel>
        )}

        {view === 'consent' && bundle && (
          <Panel key="consent">
            <button
              type="button"
              onClick={() => { setView('language'); setChecked(false); setCheckboxHint(false) }}
              className="mb-6 inline-flex items-center gap-1.5 text-sm text-text-secondary
                         hover:text-text-primary focus:outline-none focus-visible:ring-2
                         focus-visible:ring-brand rounded"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              {t('screening.changeLanguage', 'Change language')}
            </button>

            <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">
              {bundle.content.title}
            </h1>
            <p className="mt-4 text-text-secondary">{bundle.content.intro}</p>

            <div className="mt-8 space-y-6">
              {bundle.content.sections.map((section) => (
                <section key={section.id}>
                  <h2 className="text-base font-semibold text-text-primary">
                    {section.heading}
                  </h2>
                  <p className="mt-1.5 leading-relaxed text-text-secondary">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>

            <label
              className={cn(
                'mt-9 flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition',
                checked ? 'border-brand bg-brand-light' : 'border-brand-muted bg-white',
              )}
            >
              <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => { setChecked(e.target.checked); setCheckboxHint(false) }}
                  className="peer h-5 w-5 appearance-none rounded border-2 border-brand-muted
                             bg-white checked:border-brand checked:bg-brand
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                />
                <Check
                  className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100"
                  aria-hidden
                />
              </span>
              <span className="text-text-primary">{bundle.content.checkbox_label}</span>
            </label>

            {checkboxHint && (
              <p className="mt-2 text-sm text-text-secondary">
                {bundle.content.checkbox_required_message}
              </p>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={submitting}
                onClick={() => decide('accepted')}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full
                           bg-brand px-6 py-3.5 font-medium text-white transition
                           hover:bg-brand-dark disabled:opacity-60
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {bundle.content.agree_label}
              </button>
              {/* Declining is a normal, respected choice — styled as a calm
                  alternative, never as a warning. No red anywhere on this page. */}
              <button
                type="button"
                disabled={submitting}
                onClick={() => decide('declined')}
                className="inline-flex flex-1 items-center justify-center rounded-full
                           border-2 border-brand-muted bg-white px-6 py-3.5 font-medium
                           text-text-primary transition hover:border-brand
                           disabled:opacity-60 focus:outline-none
                           focus-visible:ring-2 focus-visible:ring-brand"
              >
                {bundle.content.decline_label}
              </button>
            </div>

            {error && <ErrorNote message={t('errors.generic')} />}

            {bundle.review_required && (
              <p className="mt-8 rounded-xl bg-stone-100 px-4 py-3 text-xs text-text-secondary">
                {/* Visible only until the Amharic copy is signed off. */}
                Draft translation — pending native Amharic review before the pilot.
              </p>
            )}
          </Panel>
        )}

        {view === 'declined' && (
          <Outcome
            key="declined"
            title={bundle?.content.decline.title ?? t('screening.declinedTitle', 'That is completely fine')}
            body={bundle?.content.decline.body ?? t('screening.declinedBody', 'Everything else is still open to you.')}
            primary={{ to: '/', label: bundle?.content.decline.primary_label ?? t('screening.backHome', 'Back to home') }}
            secondary={{ to: '/ai-assistant', label: bundle?.content.decline.secondary_label ?? t('screening.talk', 'Talk to the companion') }}
          />
        )}

        {view === 'withdrawn' && (
          <Outcome
            key="withdrawn"
            title={bundle?.content.withdraw.confirmed_title ?? t('screening.withdrawnTitle', 'You have withdrawn')}
            body={bundle?.content.withdraw.confirmed_body ?? t('screening.withdrawnBody', 'Nothing further will be asked.')}
            primary={{ to: '/', label: t('screening.backHome', 'Back to home') }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  )
}

function ErrorNote({ message }: { message: string }) {
  // Errors direct, they do not apologise — and never in red.
  return (
    <p className="mt-5 rounded-xl bg-stone-100 px-4 py-3 text-sm text-text-secondary">
      {message}
    </p>
  )
}

function Outcome({
  title, body, primary, secondary,
}: {
  title: string
  body: string
  primary: { to: string; label: string }
  secondary?: { to: string; label: string }
}) {
  return (
    <Panel>
      <h1 className="text-2xl font-semibold text-text-primary sm:text-3xl">{title}</h1>
      <p className="mt-4 leading-relaxed text-text-secondary">{body}</p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          to={primary.to}
          className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3.5
                     font-medium text-white transition hover:bg-brand-dark
                     focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          {primary.label}
        </Link>
        {secondary && (
          <Link
            to={secondary.to}
            className="inline-flex items-center justify-center rounded-full border-2
                       border-brand-muted bg-white px-6 py-3.5 font-medium text-text-primary
                       transition hover:border-brand focus:outline-none
                       focus-visible:ring-2 focus-visible:ring-brand"
          >
            {secondary.label}
          </Link>
        )}
      </div>
      <DevResetParticipant />
    </Panel>
  )
}
