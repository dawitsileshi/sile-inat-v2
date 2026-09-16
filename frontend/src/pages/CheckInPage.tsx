import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Frown, Meh, Smile, Laugh, Heart as HeartIcon, Zap, Moon,
  SmilePlus, ArrowRight,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { cn } from '@/lib/utils'
import { useIsAuthenticated } from '@/lib/useIsAuthenticated'
import { SignInPrompt } from '@/components/SignInPrompt'
import { VoiceMemo } from '@/components/VoiceMemo'
import { useDispatch, useSelector } from 'react-redux'
import {
  submitDailyLog, ensureAuth, fetchLogs, getStoredUser,
  type DailyLog,
} from '@/store/trackerSlice'
import type { AppDispatch, RootState } from '@/store/store'

type MoodValue = 'rough' | 'low' | 'okay' | 'good' | 'great'
type SupportValue = 'yes' | 'somewhat' | 'no'

// Mood labels live under checkIn.moods.<value> in the locale files.
interface MoodOption {
  value: MoodValue
  Icon: typeof Frown
  color: string
}

const MOODS: MoodOption[] = [
  { value: 'rough', Icon: Frown, color: 'text-[#c4456b]' },
  { value: 'low',   Icon: Frown, color: 'text-[#c98a1f]' },
  { value: 'okay',  Icon: Meh,   color: 'text-[#d6a02f]' },
  { value: 'good',  Icon: Smile, color: 'text-[#5a9d6a]' },
  { value: 'great', Icon: Laugh, color: 'text-brand' },
]

// Maps the friendlier MoodValue to the API's mood_score (1=calm/best, 5=anxious/worst).
const MOOD_TO_API: Record<MoodValue, number> = {
  rough: 5,
  low: 4,
  okay: 3,
  good: 2,
  great: 1,
}

// Maps the friendlier MoodValue to the 1–5 "Surviving → Felt like myself" scale
// used for the response messages.
const MOOD_TO_DISPLAY: Record<MoodValue, 1 | 2 | 3 | 4 | 5> = {
  rough: 1,
  low: 2,
  okay: 3,
  good: 4,
  great: 5,
}

function energyToSymptomScore(energy: number): number {
  if (energy < 20) return 5
  if (energy < 40) return 4
  if (energy < 60) return 3
  if (energy < 80) return 2
  return 1
}

const CRISIS_PHRASES = [
  'want to disappear',
  "don't want to be here",
  'do not want to be here',
  'hurt myself',
  "can't do this anymore",
  'cannot do this anymore',
  'give up',
]

function containsCrisisLanguage(text: string): boolean {
  const t = text.toLowerCase()
  return CRISIS_PHRASES.some((p) => t.includes(p))
}

function weeksPostpartum(birthIso: string | null): number | null {
  if (!birthIso) return null
  const birth = new Date(birthIso + 'T00:00:00')
  if (Number.isNaN(birth.getTime())) return null
  const days = Math.floor((Date.now() - birth.getTime()) / 86_400_000)
  if (days < 0) return null
  return Math.floor(days / 7)
}

function stageMessageKey(weeks: number): string {
  if (weeks <= 2) return 'checkIn.stage.firstDays'
  if (weeks <= 6) return 'checkIn.stage.firstWeeks'
  if (weeks <= 12) return 'checkIn.stage.pastEarliest'
  if (weeks <= 26) return 'checkIn.stage.threeToSix'
  if (weeks <= 52) return 'checkIn.stage.halfYear'
  return 'checkIn.stage.yearIn'
}

function moodLabelFromApi(score: number, t: TFunction): string {
  // Reverse MOOD_TO_API
  const match = (Object.entries(MOOD_TO_API) as [MoodValue, number][])
    .find(([, v]) => v === score)
  if (!match) return t('checkIn.checkedIn')
  return t(`checkIn.moods.${match[0]}`)
}

function formatLogDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
      month: 'short', day: 'numeric',
    })
  } catch {
    return iso
  }
}

export function CheckInPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { status, error, logs } = useSelector((state: RootState) => state.tracker)
  const isSignedIn = useIsAuthenticated()
  const { t } = useTranslation()
  // Local saving state — we deliberately don't read this from redux's
  // `status` because that flag is shared with fetchLogs, which fires
  // right after a successful save. Listening to redux makes the button
  // appear stuck on "Saving..." during the background history refresh,
  // even though the real save already finished.
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [savingSeconds, setSavingSeconds] = useState(0)

  // Warm-up ping when the page mounts. On Render's free tier the API can
  // take 30-60s to wake from idle; firing a cheap GET /health while she's
  // still filling out the form means the server is already responsive by
  // the time she taps Save. Best-effort — failure is silently ignored.
  useEffect(() => {
    fetch('/api/health', { cache: 'no-store' }).catch(() => {})
  }, [])

  // Drive the per-second counter only while a save is in flight.
  useEffect(() => {
    if (!isSubmitting) {
      setSavingSeconds(0)
      return
    }
    const id = setInterval(() => setSavingSeconds((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [isSubmitting])

  const savingLabel =
    savingSeconds < 4
      ? t('checkIn.saving')
      : savingSeconds < 12
        ? t('checkIn.almostThere')
        : t('checkIn.stillWorking')

  const [mood, setMood] = useState<MoodValue>('okay')
  const [energy, setEnergy] = useState(50)
  const [sleep, setSleep] = useState(6)
  const [water, setWater] = useState(2)
  const [supported, setSupported] = useState<SupportValue | ''>('')
  const [notes, setNotes] = useState('')

  // Once submitted we capture the inputs in a frozen view so the response card
  // doesn't shift if the user starts editing the form again.
  const [response, setResponse] = useState<null | {
    mood: MoodValue
    supported: SupportValue | ''
    notes: string
    weeksPostpartum: number | null
    proseMessage: string | null
  }>(null)

  useEffect(() => {
    // Pull recent history lazily so the "Your recent check-ins" block has data.
    dispatch(fetchLogs())
  }, [dispatch])

  const storedUser = useMemo(() => getStoredUser(), [response])
  const currentMood = MOODS.find((m) => m.value === mood)!
  const energyLabels = t('checkIn.energyLabels', { returnObjects: true }) as string[]
  const energyBucket = energyLabels[Math.min(4, Math.floor(energy / 20))]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const authResult = await dispatch(ensureAuth())
      if (!ensureAuth.fulfilled.match(authResult)) return

      const payload = {
        sleep_hours: sleep,
        water_liters: water,
        symptom_score: energyToSymptomScore(energy),
        mood_score: MOOD_TO_API[mood],
        feels_supported: supported || null,
        notes: notes.trim() || null,
      }
      const result = await dispatch(submitDailyLog(payload))
      if (submitDailyLog.fulfilled.match(result)) {
        const user = getStoredUser()
        setResponse({
          mood,
          supported,
          notes,
          weeksPostpartum:
            user?.baby_status === 'born'
              ? weeksPostpartum(user.baby_birth_date)
              : null,
          proseMessage: result.payload.log.response_message ?? null,
        })
        // Refresh history so the new entry shows up below. Fire-and-forget —
        // the button is already free of the saving state and shouldn't wait
        // for this background fetch to complete.
        dispatch(fetchLogs())
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetForm() {
    setResponse(null)
    setMood('okay')
    setEnergy(50)
    setSleep(6)
    setWater(2)
    setSupported('')
    setNotes('')
  }

  if (!isSignedIn) {
    return (
      <SignInPrompt
        title={t('checkIn.signInTitle')}
        body={t('checkIn.signInBody')}
      />
    )
  }

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
            <SmilePlus className="h-6 w-6 text-brand" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            {t('checkIn.title')}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {t('checkIn.subtitle')}
          </p>
        </motion.div>

        {response ? (
          <ResponseCard
            response={response}
            storedUserKnown={!!storedUser}
            onReset={resetForm}
          />
        ) : (
          <motion.form
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onSubmit={handleSubmit}
            className="rounded-2xl bg-white p-8 card-shadow"
          >
            <section className="mb-10">
              <div className="mb-5 text-center">
                <h2 className="text-2xl font-bold text-text-primary">
                  {t('checkIn.mindTitle')}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  {t('checkIn.mindBody')}
                </p>
              </div>

              <VoiceMemo onTranscript={setNotes} baseText={notes} />

              <div className="mt-5">
                <p className="mb-1.5 text-center text-xs uppercase tracking-wider text-text-muted">
                  {t('checkIn.orWrite')}
                </p>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('checkIn.notesPlaceholder')}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </section>

            <div className="mb-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                {t('checkIn.quickThings')}
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <label className="text-base font-semibold text-text-primary">
                  {t('checkIn.feelingToday')}
                </label>
                <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                  <currentMood.Icon className={cn('h-4 w-4', currentMood.color)} />
                  {t(`checkIn.moods.${currentMood.value}`)}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {MOODS.map((m) => {
                  const active = mood === m.value
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => setMood(m.value)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border-2 px-2 py-3 transition-all',
                        active
                          ? 'border-brand bg-brand-light'
                          : 'border-transparent hover:bg-stone-100/70'
                      )}
                    >
                      <m.Icon className={cn('h-7 w-7', m.color)} />
                      <span className="text-xs font-medium text-text-secondary">{t(`checkIn.moods.${m.value}`)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-base font-semibold text-text-primary">{t('checkIn.energyLevel')}</label>
                <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                  <Zap className="h-4 w-4 text-brand" />
                  {energyBucket}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={energy}
                onChange={(e) => setEnergy(Number(e.target.value))}
                className="wellness-slider"
                style={{
                  background: `linear-gradient(to right, var(--color-brand) 0%, var(--color-brand) ${energy}%, var(--color-brand-light) ${energy}%, var(--color-brand-light) 100%)`,
                }}
              />
              <div className="mt-2 flex justify-between text-xs text-text-secondary">
                <span>{t('checkIn.exhausted')}</span>
                <span>{t('checkIn.vibrant')}</span>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-base font-semibold text-text-primary">{t('checkIn.hoursOfSleep')}</label>
                <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                  <Moon className="h-4 w-4 text-brand" />
                  {sleep}h
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={12}
                value={sleep}
                onChange={(e) => setSleep(Number(e.target.value))}
                className="wellness-slider"
                style={{
                  background: `linear-gradient(to right, var(--color-brand) 0%, var(--color-brand) ${(sleep / 12) * 100}%, var(--color-brand-light) ${(sleep / 12) * 100}%, var(--color-brand-light) 100%)`,
                }}
              />
              <div className="mt-2 flex justify-between text-xs text-text-secondary">
                <span>0h</span>
                <span>12h</span>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-base font-semibold text-text-primary">{t('checkIn.waterIntake')}</label>
                <span className="text-sm font-medium text-text-secondary">{water.toFixed(1)} L</span>
              </div>
              <input
                type="range"
                min={0}
                max={5}
                step={0.1}
                value={water}
                onChange={(e) => setWater(Number(e.target.value))}
                className="wellness-slider"
                style={{
                  background: `linear-gradient(to right, var(--color-brand) 0%, var(--color-brand) ${(water / 5) * 100}%, var(--color-brand-light) ${(water / 5) * 100}%, var(--color-brand-light) 100%)`,
                }}
              />
              <div className="mt-2 flex justify-between text-xs text-text-secondary">
                <span>0 L</span>
                <span>5 L</span>
              </div>
            </div>

            <div className="mb-8">
              <label className="mb-3 block text-base font-semibold text-text-primary">
                {t('checkIn.supportedQuestion')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'yes',      label: t('checkIn.supported.yes') },
                  { value: 'somewhat', label: t('checkIn.supported.somewhat') },
                  { value: 'no',       label: t('checkIn.supported.no') },
                ] as { value: SupportValue; label: string }[]).map((opt) => {
                  const active = supported === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSupported(opt.value)}
                      className={cn(
                        'rounded-xl border-2 px-3 py-3 text-sm font-medium transition-colors',
                        active
                          ? 'border-brand bg-brand-light text-brand'
                          : 'border-transparent bg-stone-100/60 text-text-secondary hover:bg-stone-200/80'
                      )}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {error && status === 'failed' && (
              <p className="mb-4 text-center text-sm text-text-secondary">{error}</p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              <HeartIcon className="h-4 w-4" />
              {isSubmitting ? savingLabel : t('checkIn.save')}
            </button>
          </motion.form>
        )}

        <RecentCheckIns logs={logs} hidden={!response && logs.length === 0} />
      </div>
    </div>
  )
}

function ResponseCard({
  response,
  storedUserKnown,
  onReset,
}: {
  response: {
    mood: MoodValue
    supported: SupportValue | ''
    notes: string
    weeksPostpartum: number | null
    proseMessage: string | null
  }
  storedUserKnown: boolean
  onReset: () => void
}) {
  const { t } = useTranslation()
  // Prefer the prose generated and stored on the backend so the journal can
  // replay the same wording. Fall back to local templates if the server
  // didn't supply one (offline / older row).
  const displayScore = MOOD_TO_DISPLAY[response.mood]
  const fallbackMood = t(`checkIn.moodMessages.${displayScore}`)
  const fallbackStage =
    response.weeksPostpartum !== null ? t(stageMessageKey(response.weeksPostpartum)) : null
  const proseLines = response.proseMessage
    ? response.proseMessage.split(/\n{2,}/)
    : fallbackStage
      ? [fallbackMood, fallbackStage]
      : [fallbackMood]
  const crisis = containsCrisisLanguage(response.notes)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white p-8 card-shadow"
    >
      <p className="text-lg leading-relaxed text-text-primary">{proseLines[0]}</p>

      {proseLines.slice(1).map((line, i) => (
        <p key={i} className="mt-4 text-base leading-relaxed text-text-secondary">
          {line}
        </p>
      ))}

      {response.supported === 'no' && (
        <div className="mt-6 rounded-xl bg-stone-50 p-5">
          <p className="text-sm text-text-secondary">
            {t('checkIn.response.notSupported')}
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
            <Link
              to="/circles"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              {t('home.paths.circles.title')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/ai-assistant"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              {t('checkIn.response.talkToSomeone')} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {response.supported === 'somewhat' && (
        <div className="mt-6 rounded-xl bg-stone-50 p-5">
          <p className="text-sm text-text-secondary">
            {t('checkIn.response.somewhatSupported')}
          </p>
          <Link
            to="/comfort"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            {t('home.paths.comfort.title')} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {crisis && (
        // Same warm palette — no red. This is an offer, not an alarm.
        <div className="mt-6 rounded-xl border border-brand/20 bg-brand-light/40 p-5">
          <p className="text-sm leading-relaxed text-text-primary">
            {t('checkIn.response.crisis')}{' '}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('crisis:open'))}
              className="font-semibold text-brand hover:underline"
            >
              {t('crisis.button')}
            </button>
          </p>
        </div>
      )}

      {/* The same standing offer as on the reflection page. Placed after the
          support and crisis blocks on purpose: if she has just disclosed
          something hard, being met comes first, and a questionnaire second. */}
      <div className="mt-6 border-t border-gray-100 pt-5">
        <p className="text-sm font-medium text-text-primary">
          {t('screening.entryTitle')}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-text-secondary">
          {t('screening.entryBody')}
        </p>
        <Link
          to="/screening/consent"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
        >
          {t('screening.entryAction')} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {!storedUserKnown && response.weeksPostpartum === null && (
        <p className="mt-6 text-xs text-text-muted">
          {t('checkIn.response.personalize')}
        </p>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-8 w-full rounded-xl border border-brand/30 bg-white py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand-light"
      >
        {t('checkIn.response.again')}
      </button>
    </motion.div>
  )
}

function RecentCheckIns({ logs, hidden }: { logs: DailyLog[]; hidden: boolean }) {
  const { t } = useTranslation()
  if (hidden) return null
  const recent = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date)).slice(0, 5)
  if (recent.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-bold text-text-primary">{t('checkIn.recent')}</h2>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white card-shadow-sm">
        {recent.map((log) => (
          <li key={log.id} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-text-secondary">{formatLogDate(log.log_date)}</span>
            <span className="text-sm font-medium text-text-primary">
              {moodLabelFromApi(log.mood_score, t)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
