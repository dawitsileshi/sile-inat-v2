import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen, Frown, Meh, Smile, Laugh, Moon, Droplet, Zap, HeartHandshake } from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchLogs, ensureAuth, type DailyLog } from '@/store/trackerSlice'
import type { AppDispatch, RootState } from '@/store/store'
import { cn } from '@/lib/utils'
import { useIsAuthenticated } from '@/lib/useIsAuthenticated'
import { SignInPrompt } from '@/components/SignInPrompt'

// Same mapping the check-in form uses, just keyed by API mood_score.
// API: 1 = calm/best (Felt like myself), 5 = anxious/worst (Surviving).
const MOOD_BY_API: Record<number, { label: string; Icon: typeof Frown; color: string }> = {
  1: { label: 'Felt like myself',  Icon: Laugh, color: 'text-brand' },
  2: { label: 'Some good moments', Icon: Smile, color: 'text-[#5a9d6a]' },
  3: { label: 'Okay-ish',          Icon: Meh,   color: 'text-[#d6a02f]' },
  4: { label: 'Holding on',        Icon: Frown, color: 'text-[#c98a1f]' },
  5: { label: 'Surviving',         Icon: Frown, color: 'text-[#c4456b]' },
}

const SUPPORT_LABEL: Record<NonNullable<DailyLog['feels_supported']>, string> = {
  yes: 'Yes',
  somewhat: 'Somewhat',
  no: 'Not really',
}

function formatDateHeading(iso: string): string {
  // iso is YYYY-MM-DD from the backend.
  const d = new Date(iso + 'T00:00:00')
  if (Number.isNaN(d.getTime())) return iso
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const that = new Date(d)
  that.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today.getTime() - that.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'long' })
  }
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric',
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
  })
}

export function JournalPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { logs, status } = useSelector((state: RootState) => state.tracker)
  const isSignedIn = useIsAuthenticated()

  useEffect(() => {
    if (!isSignedIn) return
    dispatch(ensureAuth()).then((auth) => {
      if (ensureAuth.fulfilled.match(auth)) {
        dispatch(fetchLogs())
      }
    })
  }, [dispatch, isSignedIn])

  if (!isSignedIn) {
    return (
      <SignInPrompt
        title="Sign in to see your journal"
        body="Your journal is a private record of every check-in. Sign in to read it back."
      />
    )
  }

  // Newest first.
  const ordered = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date))
  const isLoading = status === 'loading' && ordered.length === 0

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
            <BookOpen className="h-6 w-6 text-brand" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
            Your journal
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Everything you’ve said to yourself here. No one else sees it.
          </p>
        </motion.header>

        {isLoading ? (
          <p className="text-center text-sm text-text-muted">Loading…</p>
        ) : ordered.length === 0 ? (
          <EmptyJournal />
        ) : (
          <div className="space-y-6">
            {ordered.map((log, i) => (
              <JournalCard key={log.id} log={log} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function EmptyJournal() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-white px-8 py-16 text-center card-shadow-sm"
    >
      <p className="text-lg text-text-primary">
        Your check-ins will live here. Nothing yet.
      </p>
      <p className="mt-3 text-sm text-text-secondary">
        Start with a quiet minute on the check-in page.
      </p>
      <Link
        to="/check-in"
        className="mt-6 inline-flex rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
      >
        Check in
      </Link>
    </motion.div>
  )
}

function JournalCard({ log, index }: { log: DailyLog; index: number }) {
  const mood = MOOD_BY_API[log.mood_score] ?? MOOD_BY_API[3]
  const proseLines = log.response_message
    ? log.response_message.split(/\n{2,}/).filter(Boolean)
    : []
  const supportLabel = log.feels_supported ? SUPPORT_LABEL[log.feels_supported] : null

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index, 4) * 0.05 }}
      className="rounded-2xl bg-white p-6 card-shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold text-text-primary">
          {formatDateHeading(log.log_date)}
        </h2>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-cream-dark px-3 py-1 text-xs font-medium text-text-secondary">
          <mood.Icon className={cn('h-3.5 w-3.5', mood.color)} />
          {mood.label}
        </span>
      </div>

      {log.notes ? (
        <blockquote className="rounded-xl bg-cream/60 px-4 py-3 text-sm leading-relaxed text-text-primary">
          “{log.notes}”
        </blockquote>
      ) : (
        <p className="text-xs italic text-text-muted">No note that day.</p>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-text-secondary">
        <MetaItem icon={<Moon className="h-3.5 w-3.5" />} label={`${log.sleep_hours}h sleep`} />
        <MetaItem icon={<Droplet className="h-3.5 w-3.5" />} label={`${log.water_liters.toFixed(1)} L water`} />
        <MetaItem icon={<Zap className="h-3.5 w-3.5" />} label={energyLabel(log.symptom_score)} />
        {supportLabel && (
          <MetaItem
            icon={<HeartHandshake className="h-3.5 w-3.5" />}
            label={`Support: ${supportLabel}`}
          />
        )}
      </div>

      {proseLines.length > 0 && (
        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            What you read that day
          </p>
          <div className="mt-2 space-y-2">
            {proseLines.map((line, i) => (
              <p
                key={i}
                className={cn(
                  'text-sm leading-relaxed',
                  i === 0 ? 'text-text-primary' : 'text-text-secondary'
                )}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      )}
    </motion.article>
  )
}

function MetaItem({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-brand">{icon}</span>
      {label}
    </span>
  )
}

function energyLabel(symptomScore: number): string {
  // symptom_score: 1 = vibrant, 5 = exhausted
  switch (symptomScore) {
    case 1: return 'Like myself today'
    case 2: return 'A bit of me back'
    case 3: return 'Holding it together'
    case 4: return 'Running on coffee'
    case 5: return 'Empty'
    default: return 'Energy logged'
  }
}
