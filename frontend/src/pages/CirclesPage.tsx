import { useEffect, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Loader2, Users, Video, MapPin, X, ChevronLeft, Send, Radio } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { API_URL, anonymousHeaders, parseResponse } from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Circle {
  id: number
  name: string
  description: string
  phase_tag: string | null
  is_virtual: boolean
  capacity: number
  member_count: number
  is_joined: boolean
}

interface CirclePost {
  id: number
  circle_id: number
  content: string
  created_at: string
  is_mine: boolean
  author_label: string
}

interface CircleDetail {
  circle: Circle
  posts: CirclePost[]
  count: number
}

// ─── Filters ──────────────────────────────────────────────────────────────────
const PHASE_FILTERS = [
  'All',
  'Weeks 1–6',
  'Weeks 6–12',
  'Months 3–6',
  'Months 3–12',
  'All phases',
] as const

type PhaseFilter = (typeof PHASE_FILTERS)[number]

// The filter values double as the backend's phase_tag strings, so they stay
// in English; only the displayed label is translated.
const PHASE_LABEL_KEYS: Record<string, string> = {
  'All': 'circles.phases.all',
  'Weeks 1–6': 'circles.phases.weeks1to6',
  'Weeks 6–12': 'circles.phases.weeks6to12',
  'Months 3–6': 'circles.phases.months3to6',
  'Months 3–12': 'circles.phases.months3to12',
  'All phases': 'circles.phases.allPhases',
}

function phaseLabel(tag: string, t: TFunction): string {
  const key = PHASE_LABEL_KEYS[tag]
  return key ? t(key) : tag
}

// ─── Local persistence (defensive, backend is source of truth) ─────────────────
const LS_KEY = 'sile_joined_circles'

function readJoinedFromLS(): Set<number> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : [])
  } catch {
    return new Set()
  }
}

function writeJoinedToLS(ids: Set<number>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
  } catch {
    // Storage may be unavailable in private modes — that's OK, backend is authoritative.
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function CirclesPage() {
  const [circles, setCircles] = useState<Circle[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activePhase, setActivePhase] = useState<PhaseFilter>('All')
  const [openCircleId, setOpenCircleId] = useState<number | null>(null)
  const { t } = useTranslation()

  // Local cache of joined ids — used for optimistic UI on the cards.
  const [joinedIds, setJoinedIds] = useState<Set<number>>(readJoinedFromLS())

  useEffect(() => {
    let cancelled = false
    setError(null)
    fetch(`${API_URL}/circles`, { headers: anonymousHeaders() })
      .then((r) => parseResponse<{ circles: Circle[] }>(r))
      .then((data) => {
        if (cancelled) return
        setCircles(data.circles)
        // Reconcile localStorage with backend truth.
        const fromServer = new Set(data.circles.filter((c) => c.is_joined).map((c) => c.id))
        setJoinedIds(fromServer)
        writeJoinedToLS(fromServer)
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : t('circles.errors.loadCircles')))
    return () => {
      cancelled = true
    }
  }, [])

  const filtered =
    circles?.filter((c) =>
      activePhase === 'All' ? true : c.phase_tag === activePhase
    ) ?? null

  async function handleJoin(circleId: number) {
    // Optimistic — flip the chip first, reconcile after.
    setJoinedIds((prev) => {
      const next = new Set(prev)
      next.add(circleId)
      writeJoinedToLS(next)
      return next
    })
    setCircles((prev) =>
      prev
        ? prev.map((c) =>
            c.id === circleId
              ? { ...c, is_joined: true, member_count: c.member_count + 1 }
              : c
          )
        : prev
    )

    try {
      const resp = await fetch(`${API_URL}/circles/${circleId}/join`, {
        method: 'POST',
        headers: anonymousHeaders(),
      })
      const data = await parseResponse<{
        circle_id: number
        joined: boolean
        newly_joined: boolean
        member_count: number
      }>(resp)
      // If this was a re-join (already in), back out the optimistic ++ on member_count.
      if (!data.newly_joined) {
        setCircles((prev) =>
          prev
            ? prev.map((c) =>
                c.id === circleId
                  ? { ...c, member_count: data.member_count }
                  : c
              )
            : prev
        )
      }
    } catch (e) {
      // Revert optimistic update on failure.
      setJoinedIds((prev) => {
        const next = new Set(prev)
        next.delete(circleId)
        writeJoinedToLS(next)
        return next
      })
      setCircles((prev) =>
        prev
          ? prev.map((c) =>
              c.id === circleId
                ? { ...c, is_joined: false, member_count: Math.max(0, c.member_count - 1) }
                : c
            )
          : prev
      )
      setError(e instanceof Error ? e.message : t('circles.errors.join'))
    }
  }

  return (
    <div className="px-6 pb-24 pt-12">
      <div className="mx-auto max-w-4xl">
        <header>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-text-primary">
            {t('circles.title')}
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            {t('circles.subtitle')}
          </p>
        </header>

        {/* Phase filter pills — horizontal scroll on small screens */}
        <div className="mt-8 -mx-6 overflow-x-auto px-6">
          <div className="flex gap-2 whitespace-nowrap pb-2">
            {PHASE_FILTERS.map((phase) => {
              const active = activePhase === phase
              return (
                <button
                  key={phase}
                  type="button"
                  onClick={() => setActivePhase(phase)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-brand text-white'
                      : 'bg-stone-100 text-text-secondary hover:bg-stone-200'
                  )}
                >
                  {phaseLabel(phase, t)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Body */}
        <div className="mt-6">
          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          )}

          {!circles && !error && (
            <div className="flex items-center justify-center py-20 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {circles && filtered?.length === 0 && (
            <p className="py-12 text-center text-text-secondary">
              {t('circles.emptyPhase')}
            </p>
          )}

          {filtered && filtered.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2">
              {filtered.map((c) => (
                <CircleCard
                  key={c.id}
                  circle={{ ...c, is_joined: joinedIds.has(c.id) || c.is_joined }}
                  onOpen={() => setOpenCircleId(c.id)}
                  onJoin={() => handleJoin(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Slide-in detail panel */}
      <AnimatePresence>
        {openCircleId !== null && (
          <CircleDetailPanel
            circleId={openCircleId}
            onClose={() => setOpenCircleId(null)}
            onJoin={() => handleJoin(openCircleId)}
            isJoined={joinedIds.has(openCircleId)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Circle Card ──────────────────────────────────────────────────────────────
function CircleCard({
  circle,
  onOpen,
  onJoin,
}: {
  circle: Circle
  onOpen: () => void
  onJoin: () => void
}) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="group rounded-xl bg-white p-5 shadow-[0_1px_2px_rgba(20,30,15,0.04)] ring-1 ring-black/[0.04] transition-shadow hover:shadow-[0_4px_18px_rgba(26,122,61,0.08)]"
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={t('circles.open', { name: circle.name })}
      >
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-lg font-semibold text-text-primary leading-snug">
            {circle.name}
          </h2>
          {circle.phase_tag && (
            <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-medium text-brand">
              {phaseLabel(circle.phase_tag, t)}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary line-clamp-3">
          {circle.description}
        </p>
      </button>

      <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          {t('circles.mothersHere', { count: circle.member_count })}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {circle.is_virtual ? (
            <>
              <Video className="h-3.5 w-3.5" /> {t('circles.virtual')}
            </>
          ) : (
            <>
              <MapPin className="h-3.5 w-3.5" /> {t('circles.inPerson')}
            </>
          )}
        </span>
      </div>

      <div className="mt-4">
        {circle.is_joined ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1.5 text-sm font-medium text-brand">
            <Check className="h-4 w-4" />
            {t('circles.youreInThisCircle')}
          </div>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onJoin()
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
          >
            {t('circles.join')}
          </button>
        )}
      </div>
    </motion.div>
  )
}

// ─── Slide-in Detail Panel ────────────────────────────────────────────────────
function CircleDetailPanel({
  circleId,
  onClose,
  onJoin,
  isJoined,
}: {
  circleId: number
  onClose: () => void
  onJoin: () => void
  isJoined: boolean
}) {
  const [detail, setDetail] = useState<CircleDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const { t } = useTranslation()

  // Lock background scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Initial load + 5-second polling so two users in the same circle see each
  // other's posts without refreshing. Merge incoming posts into existing
  // state so the optimistic post the user just made doesn't blink.
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function pull(isInitial: boolean) {
      try {
        if (isInitial) setError(null)
        const resp = await fetch(`${API_URL}/circles/${circleId}`, {
          headers: anonymousHeaders(),
        })
        const data = await parseResponse<CircleDetail>(resp)
        if (cancelled) return
        setDetail((prev) => {
          if (!prev) return data
          // Merge: keep order from server (newest first), preserve `is_mine`
          // on anything we already had in case the server view differs.
          const localById = new Map(prev.posts.map((p) => [p.id, p]))
          const merged = data.posts.map(
            (p) => ({ ...p, is_mine: localById.get(p.id)?.is_mine ?? p.is_mine })
          )
          return { ...data, posts: merged }
        })
      } catch (e) {
        if (cancelled || !isInitial) return
        setError(e instanceof Error ? e.message : t('circles.errors.loadCircle'))
      } finally {
        if (!cancelled) {
          timer = setTimeout(() => pull(false), 5000)
        }
      }
    }

    pull(true)
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [circleId])

  async function handlePost(e: FormEvent) {
    e.preventDefault()
    const content = draft.trim()
    if (!content || posting) return
    setPosting(true)
    setError(null)
    try {
      const resp = await fetch(`${API_URL}/circles/${circleId}/posts`, {
        method: 'POST',
        headers: anonymousHeaders(),
        body: JSON.stringify({ content }),
      })
      const data = await parseResponse<{ post: CirclePost }>(resp)
      setDetail((prev) =>
        prev ? { ...prev, posts: [data.post, ...prev.posts], count: prev.count + 1 } : prev
      )
      setDraft('')
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : t('circles.errors.post'))
    } finally {
      setPosting(false)
    }
  }

  const remaining = 280 - draft.length

  return (
    <div className="fixed inset-0 z-50">
      {/* Scrim */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-text-primary/30 backdrop-blur-[2px]"
        aria-hidden
      />

      {/* Panel */}
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 32 }}
        className="absolute inset-y-0 right-0 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl sm:rounded-l-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby={detail ? `circle-${circleId}-title` : undefined}
      >
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-black/[0.04] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-text-secondary hover:bg-stone-100 sm:hidden"
            aria-label={t('common.back')}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <LiveDot />
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-text-secondary hover:bg-stone-100"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2">
          {!detail && !error && (
            <div className="flex items-center justify-center py-20 text-text-muted">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
          )}

          {detail && (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2
                  id={`circle-${circleId}-title`}
                  className="text-2xl font-bold text-text-primary"
                >
                  {detail.circle.name}
                </h2>
                {detail.circle.phase_tag && (
                  <span className="shrink-0 rounded-full bg-brand-light px-2.5 py-0.5 text-[11px] font-medium text-brand">
                    {phaseLabel(detail.circle.phase_tag, t)}
                  </span>
                )}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {detail.circle.description}
              </p>

              <div className="mt-4 flex items-center justify-between text-xs text-text-muted">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {t('circles.mothersHere', { count: detail.circle.member_count })}
                </span>
                {!isJoined ? (
                  <button
                    type="button"
                    onClick={onJoin}
                    className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark"
                  >
                    {t('circles.join')}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-brand">
                    <Check className="h-3.5 w-3.5" />
                    {t('circles.youreIn')}
                  </span>
                )}
              </div>

              <div className="my-6 h-px w-full bg-black/[0.05]" />

              {/* Posts */}
              <h3 className="text-sm font-medium text-text-muted">
                {detail.count === 0
                  ? t('circles.noPosts')
                  : t('ai.messageCount', { count: detail.count })}
              </h3>

              <ul className="mt-3 space-y-3">
                {detail.posts.map((p) => (
                  <li
                    key={p.id}
                    className={cn(
                      'rounded-xl px-4 py-3 text-sm leading-relaxed',
                      p.is_mine
                        ? 'bg-brand-light text-text-primary'
                        : 'bg-white text-text-primary ring-1 ring-black/[0.04]'
                    )}
                  >
                    <p>{p.content}</p>
                    <p className="mt-1.5 text-[11px] text-text-muted">
                      {p.author_label} · {timeAgo(p.created_at, t)}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Composer — only for members. Non-members see a quiet join prompt. */}
        {isJoined ? (
          <form
            onSubmit={handlePost}
            className="border-t border-black/[0.04] bg-white px-5 py-4"
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 280))}
              placeholder={t('circles.composerPlaceholder')}
              rows={3}
              className="w-full resize-none rounded-lg border border-black/[0.06] bg-white px-3 py-2 text-sm leading-relaxed text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
            />
            <div className="mt-2 flex items-center justify-between">
              <span
                className={cn(
                  'text-xs',
                  remaining < 20 ? 'text-text-secondary' : 'text-text-muted'
                )}
              >
                {remaining}
              </span>
              <button
                type="submit"
                disabled={posting || !draft.trim()}
                className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                {t('circles.postAnonymously')}
              </button>
            </div>
          </form>
        ) : (
          <div className="border-t border-black/[0.04] bg-white px-5 py-5 text-center">
            <p className="text-sm text-text-secondary">
              {t('circles.joinToWrite')}
            </p>
            <button
              type="button"
              onClick={onJoin}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-dark"
            >
              {t('circles.join')}
            </button>
          </div>
        )}
      </motion.aside>
    </div>
  )
}

// ─── Live indicator ───────────────────────────────────────────────────────────
function LiveDot() {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-text-secondary">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-70" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
      </span>
      {t('circles.live')}
      <Radio className="h-3 w-3 text-text-muted" aria-hidden />
    </span>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(iso: string, t: TFunction): string {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return ''
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000))
  if (seconds < 60) return t('time.justNow')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('time.minutesAgoShort', { count: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('time.hoursAgoShort', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 30) return t('time.daysAgoShort', { count: days })
  return new Date(iso).toLocaleDateString()
}
