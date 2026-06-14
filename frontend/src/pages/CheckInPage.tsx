import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Frown, Meh, Smile, Laugh, Heart as HeartIcon, Zap, Moon,
  SmilePlus, ArrowRight,
} from 'lucide-react'
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

interface MoodOption {
  value: MoodValue
  label: string
  Icon: typeof Frown
  color: string
}

const MOODS: MoodOption[] = [
  { value: 'rough', label: 'Surviving',          Icon: Frown, color: 'text-[#c4456b]' },
  { value: 'low',   label: 'Holding on',         Icon: Frown, color: 'text-[#c98a1f]' },
  { value: 'okay',  label: 'Okay-ish',           Icon: Meh,   color: 'text-[#d6a02f]' },
  { value: 'good',  label: 'Some good moments',  Icon: Smile, color: 'text-[#5a9d6a]' },
  { value: 'great', label: 'Felt like myself',   Icon: Laugh, color: 'text-brand' },
]

const ENERGY_LABELS = [
  'Empty', 'Running on coffee', 'Holding it together', 'A bit of me back', 'Like myself today',
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

const MOOD_MESSAGES: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'Thank you for checking in today. Even doing this — pausing for one minute to notice how you feel — is something. You don’t have to be okay. You just have to keep going.',
  2: 'Holding on is enough. You showed up for your baby today and you showed up here. That’s real. Rest when you can.',
  3: 'Okay-ish is a real place. Not good, not bad — just getting through. Many mothers are right here with you tonight.',
  4: 'Some good moments is worth holding onto. They don’t erase the hard parts, but they’re real too.',
  5: 'That’s a good day. Remember this one. On the harder days, it helps to know they exist.',
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

function stageMessage(weeks: number): string {
  if (weeks <= 2) {
    return 'You are in the very first days. Sleep, nourishment, and being held are the whole job right now.'
  }
  if (weeks <= 6) {
    return 'The first weeks are their own season. Whatever today looked like, it counted.'
  }
  if (weeks <= 12) {
    return 'You’re past the earliest stretch. The body is still healing — go gently with yourself.'
  }
  if (weeks <= 26) {
    return 'Months three to six are quietly hard. The newness fades but the tiredness can stay. You’re still in it.'
  }
  if (weeks <= 52) {
    return 'You’ve carried this for over half a year. That is a long time. Be proud of the small steady things.'
  }
  return 'A year in, and still figuring it out. That is allowed. Motherhood doesn’t arrive all at once.'
}

function moodLabelFromApi(score: number): string {
  // Reverse MOOD_TO_API
  const match = (Object.entries(MOOD_TO_API) as [MoodValue, number][])
    .find(([, v]) => v === score)
  if (!match) return 'Checked in'
  return MOODS.find((m) => m.value === match[0])?.label ?? 'Checked in'
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
  const energyBucket = ENERGY_LABELS[Math.min(4, Math.floor(energy / 20))]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const authResult = await dispatch(ensureAuth())
    if (!ensureAuth.fulfilled.match(authResult)) return

    const payload = {
      gestational_week: 20,
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
      // Refresh history so the new entry shows up below.
      dispatch(fetchLogs())
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
        title="Sign in to check in"
        body="Your check-ins are tied to your account so you can look back at them later in your journal."
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
            How are you, really?
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Just for you. Not for anyone else to see.
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
                  Anything on your mind?
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-text-secondary">
                  Start here, however you can. Speak it, type it, or skip it —
                  the rest is optional.
                </p>
              </div>

              <VoiceMemo onTranscript={setNotes} baseText={notes} />

              <div className="mt-5">
                <p className="mb-1.5 text-center text-xs uppercase tracking-wider text-text-muted">
                  Or write it
                </p>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="You don't have to write anything."
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
              </div>
            </section>

            <div className="mb-8 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
                A few quick things
              </span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <label className="text-base font-semibold text-text-primary">
                  How are you feeling today?
                </label>
                <span className="flex items-center gap-1.5 text-sm font-medium text-text-secondary">
                  <currentMood.Icon className={cn('h-4 w-4', currentMood.color)} />
                  {currentMood.label}
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
                      <span className="text-xs font-medium text-text-secondary">{m.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-base font-semibold text-text-primary">Energy level</label>
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
                <span>Exhausted</span>
                <span>Vibrant</span>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <label className="text-base font-semibold text-text-primary">Hours of sleep</label>
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
                <label className="text-base font-semibold text-text-primary">Water intake</label>
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
                Do you feel supported right now?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { value: 'yes',      label: 'Yes' },
                  { value: 'somewhat', label: 'Somewhat' },
                  { value: 'no',       label: 'Not really' },
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
              disabled={status === 'loading'}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              <HeartIcon className="h-4 w-4" />
              {status === 'loading' ? 'Saving…' : 'Save tonight'}
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
  // Prefer the prose generated and stored on the backend so the journal can
  // replay the same wording. Fall back to local templates if the server
  // didn't supply one (offline / older row).
  const displayScore = MOOD_TO_DISPLAY[response.mood]
  const fallbackMood = MOOD_MESSAGES[displayScore]
  const fallbackStage =
    response.weeksPostpartum !== null ? stageMessage(response.weeksPostpartum) : null
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
            It might help to hear from others, or just talk it through.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:gap-4">
            <Link
              to="/circles"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              Find mothers like me <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/ai-assistant"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              Talk to someone <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      {response.supported === 'somewhat' && (
        <div className="mt-6 rounded-xl bg-stone-50 p-5">
          <p className="text-sm text-text-secondary">
            Sometimes a few quiet minutes helps.
          </p>
          <Link
            to="/comfort"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
          >
            A quiet moment <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {crisis && (
        // Same warm palette — no red. This is an offer, not an alarm.
        <div className="mt-6 rounded-xl border border-brand/20 bg-brand-light/40 p-5">
          <p className="text-sm leading-relaxed text-text-primary">
            If things feel like too much right now, you don’t have to carry it alone.{' '}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('crisis:open'))}
              className="font-semibold text-brand hover:underline"
            >
              Get help now
            </button>
          </p>
        </div>
      )}

      {!storedUserKnown && response.weeksPostpartum === null && (
        <p className="mt-6 text-xs text-text-muted">
          Want a more personal response next time? Tell us a little when you create
          an account.
        </p>
      )}

      <button
        type="button"
        onClick={onReset}
        className="mt-8 w-full rounded-xl border border-brand/30 bg-white py-3 text-sm font-semibold text-brand transition-colors hover:bg-brand-light"
      >
        Check in again
      </button>
    </motion.div>
  )
}

function RecentCheckIns({ logs, hidden }: { logs: DailyLog[]; hidden: boolean }) {
  if (hidden) return null
  const recent = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date)).slice(0, 5)
  if (recent.length === 0) return null

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-lg font-bold text-text-primary">Your recent check-ins</h2>
      <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl bg-white card-shadow-sm">
        {recent.map((log) => (
          <li key={log.id} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-text-secondary">{formatLogDate(log.log_date)}</span>
            <span className="text-sm font-medium text-text-primary">
              {moodLabelFromApi(log.mood_score)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
