import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Calendar, Clock, MapPin, Users, Video, CheckCircle2,
  ShieldCheck, CalendarPlus, BellRing, ArrowRight, Mail,
  ChevronDown, X,
} from 'lucide-react'
import { wellnessEvents, type WellnessEvent } from '@/data/events'
import { cn } from '@/lib/utils'

const badgeStyles: Record<string, string> = {
  'Expert Talk': 'bg-[#fde0e6] text-[#c4456b]',
  Workshop: 'bg-[#dbe7f5] text-[#4a78b8]',
  'Support Group': 'bg-[#cfe9da] text-[#2e8253]',
}

const RSVP_KEY = 'rsvped_event_ids'
const REMINDER_EMAILS_KEY = 'event_reminder_emails'

// ─── localStorage helpers ─────────────────────────────────────────────────────

function readRsvps(): Set<string> {
  try {
    const raw = localStorage.getItem(RSVP_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return new Set(arr)
  } catch { /* ignore */ }
  return new Set()
}

function writeRsvps(set: Set<string>) {
  localStorage.setItem(RSVP_KEY, JSON.stringify([...set]))
}

function readReminderEmails(): Record<string, string> {
  try {
    const raw = localStorage.getItem(REMINDER_EMAILS_KEY)
    if (!raw) return {}
    const obj = JSON.parse(raw)
    if (obj && typeof obj === 'object') return obj as Record<string, string>
  } catch { /* ignore */ }
  return {}
}

function writeReminderEmails(map: Record<string, string>) {
  localStorage.setItem(REMINDER_EMAILS_KEY, JSON.stringify(map))
  // TODO: Wire a real email reminder backend. For now this is just captured
  // intent — the value is stored client-side and not sent anywhere.
}

// ─── Date helpers — turn "Saturdays" / "Wednesdays" + a time range into a
//     concrete next-occurrence Date pair, used for both the receipt and
//     the .ics download.

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
}

function firstWeekdayMatch(dateField: string): number | null {
  const lower = dateField.toLowerCase()
  for (const [name, idx] of Object.entries(WEEKDAY_INDEX)) {
    if (lower.includes(name)) return idx
  }
  return null
}

function nextOccurrence(dateField: string): Date | null {
  const target = firstWeekdayMatch(dateField)
  if (target === null) return null
  const now = new Date()
  const diff = (target - now.getDay() + 7) % 7
  const daysAhead = diff === 0 ? 7 : diff
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  next.setDate(next.getDate() + daysAhead)
  return next
}

function parseTimeRange(time: string): { startH: number; startM: number; endH: number; endM: number } | null {
  // Examples: "4:00 PM – 5:30 PM", "5:00 PM - 6:00 PM" (en-dash or hyphen).
  const m = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*[–-]\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i)
  if (!m) return null
  const to24 = (h: number, p: string) => {
    const P = p.toUpperCase()
    if (P === 'PM' && h !== 12) return h + 12
    if (P === 'AM' && h === 12) return 0
    return h
  }
  return {
    startH: to24(parseInt(m[1], 10), m[3]),
    startM: parseInt(m[2], 10),
    endH: to24(parseInt(m[4], 10), m[6]),
    endM: parseInt(m[5], 10),
  }
}

function nextOccurrenceWithTime(event: WellnessEvent): { start: Date; end: Date } | null {
  const day = nextOccurrence(event.date)
  const t = parseTimeRange(event.time)
  if (!day || !t) return null
  const start = new Date(day)
  start.setHours(t.startH, t.startM, 0, 0)
  const end = new Date(day)
  end.setHours(t.endH, t.endM, 0, 0)
  return { start, end }
}

function formatNextOccurrence(event: WellnessEvent): string {
  const occ = nextOccurrenceWithTime(event)
  if (!occ) return `${event.date} · ${event.time}`
  return occ.start.toLocaleDateString(undefined, {
    weekday: 'long', month: 'short', day: 'numeric',
  })
}

// ─── .ics generation ──────────────────────────────────────────────────────────

function icsTimestamp(d: Date): string {
  // RFC 5545 UTC format: YYYYMMDDTHHMMSSZ
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function escapeIcs(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function generateIcs(event: WellnessEvent): string | null {
  const occ = nextOccurrenceWithTime(event)
  if (!occ) return null
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//sile-inat//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:sile-inat-${event.id}-${occ.start.getTime()}@sileinat.app`,
    `DTSTAMP:${icsTimestamp(new Date())}`,
    `DTSTART:${icsTimestamp(occ.start)}`,
    `DTEND:${icsTimestamp(occ.end)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description)}`,
    `LOCATION:${escapeIcs(event.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}

function downloadIcs(event: WellnessEvent) {
  const ics = generateIcs(event)
  if (!ics) return
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `sile-inat-${event.id}.ics`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Google Calendar's "Quick Add" URL — opens calendar.google.com with the
// event pre-filled. One click for the user, no download. Matches the
// pattern Luma and Eventbrite use.
function googleCalendarUrl(event: WellnessEvent): string | null {
  const occ = nextOccurrenceWithTime(event)
  if (!occ) return null
  const fmt = (d: Date) => icsTimestamp(d) // same YYYYMMDDTHHMMSSZ format
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${fmt(occ.start)}/${fmt(occ.end)}`,
    details: event.description,
    location: event.location,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function EventsPage() {
  const [rsvped, setRsvped] = useState<Set<string>>(() => readRsvps())
  const [reminderEmails, setReminderEmails] = useState<Record<string, string>>(
    () => readReminderEmails()
  )

  function handleRsvp(eventId: string) {
    setRsvped((prev) => {
      if (prev.has(eventId)) return prev
      const next = new Set(prev)
      next.add(eventId)
      writeRsvps(next)
      return next
    })
  }

  function handleReminderEmail(eventId: string, email: string) {
    setReminderEmails((prev) => {
      const next = { ...prev, [eventId]: email }
      writeReminderEmails(next)
      return next
    })
  }

  function handleCancel(eventId: string) {
    setRsvped((prev) => {
      if (!prev.has(eventId)) return prev
      const next = new Set(prev)
      next.delete(eventId)
      writeRsvps(next)
      return next
    })
    setReminderEmails((prev) => {
      if (!(eventId in prev)) return prev
      const next = { ...prev }
      delete next[eventId]
      writeReminderEmails(next)
      return next
    })
  }

  const upcoming = useMemo(
    () => wellnessEvents.filter((e) => rsvped.has(e.id)),
    [rsvped]
  )

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
            Events & Circles
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            Small gatherings, expert sessions, and quiet places to be with other mothers.
          </p>

          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-brand-light px-3 py-1 text-xs font-medium text-brand">
            <ShieldCheck className="h-3.5 w-3.5" />
            Hosted by clinicians and community partners we've vetted.
          </p>
        </motion.header>

        {upcoming.length > 0 && (
          <UpcomingStrip
            events={upcoming}
            onJump={(id) => {
              const node = document.getElementById(`event-${id}`)
              node?.scrollIntoView({ behavior: 'smooth', block: 'center' })
            }}
          />
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {wellnessEvents.map((event, i) => {
            const isRsvped = rsvped.has(event.id)
            return (
              <motion.article
                key={event.id}
                id={`event-${event.id}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex flex-col rounded-2xl bg-white p-6 card-shadow"
              >
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
                      badgeStyles[event.category] ?? 'bg-cream-dark text-text-secondary'
                    )}
                  >
                    {event.category}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-[11px] font-medium text-brand">
                    <ShieldCheck className="h-3 w-3" />
                    Verified host
                  </span>
                </div>

                <h2 className="text-lg font-bold leading-snug text-text-primary">
                  {event.title}
                </h2>
                <p className="mt-1 text-sm text-brand">with {event.expert}</p>
                {event.bio && (
                  <p className="mt-2 text-xs leading-relaxed text-text-muted">{event.bio}</p>
                )}

                <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                  <li className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-brand" />
                    {event.date}
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-brand" />
                    {event.time}
                  </li>
                  <li className="flex items-center gap-2">
                    {event.is_virtual ? (
                      <Video className="h-4 w-4 text-brand" />
                    ) : (
                      <MapPin className="h-4 w-4 text-brand" />
                    )}
                    {event.location}
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-brand" />
                    {event.capacity}
                  </li>
                </ul>

                <p className="mt-4 text-sm leading-relaxed text-text-secondary line-clamp-3">
                  {event.description}
                </p>

                <div className="mt-5">
                  {isRsvped ? (
                    <RegistrationReceipt
                      event={event}
                      savedEmail={reminderEmails[event.id]}
                      onSaveEmail={(email) => handleReminderEmail(event.id, email)}
                      onCancel={() => handleCancel(event.id)}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRsvp(event.id)}
                      className="w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
                    >
                      RSVP to attend
                    </button>
                  )}
                </div>
              </motion.article>
            )
          })}
        </div>

        <footer className="mt-12 rounded-2xl bg-white p-6 text-center card-shadow-sm">
          <p className="text-sm text-text-secondary">
            Are you a clinician or facilitator?
          </p>
          <Link
            to="/host-with-us"
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            Host with us <ArrowRight className="h-4 w-4" />
          </Link>
        </footer>
      </div>
    </div>
  )
}

// ─── Upcoming events strip ────────────────────────────────────────────────────

function UpcomingStrip({
  events, onJump,
}: {
  events: WellnessEvent[]
  onJump: (id: string) => void
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8 rounded-2xl bg-gradient-to-br from-brand-light/60 via-brand-light/30 to-cream/50 p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-semibold text-text-primary">
          You're attending
        </h2>
        <span className="text-xs text-text-muted">
          · {events.length} event{events.length === 1 ? '' : 's'}
        </span>
      </div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
        {events.map((e) => (
          <button
            key={e.id}
            type="button"
            onClick={() => onJump(e.id)}
            className="flex w-64 flex-none flex-col items-start rounded-xl bg-white p-3 text-left ring-1 ring-black/[0.04] transition-shadow hover:shadow-md"
          >
            <p className="line-clamp-1 text-sm font-semibold text-text-primary">
              {e.title}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-text-secondary">
              {formatNextOccurrence(e)} · {e.time.split(/[–-]/)[0].trim()}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-text-muted">
              {e.is_virtual ? 'Virtual' : e.location}
            </p>
          </button>
        ))}
      </div>
    </motion.section>
  )
}

// ─── Registration receipt ─────────────────────────────────────────────────────

function RegistrationReceipt({
  event, savedEmail, onSaveEmail, onCancel,
}: {
  event: WellnessEvent
  savedEmail: string | undefined
  onSaveEmail: (email: string) => void
  onCancel: () => void
}) {
  const [emailDraft, setEmailDraft] = useState(savedEmail ?? '')
  const [submitted, setSubmitted] = useState(!!savedEmail)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [confirmingCancel, setConfirmingCancel] = useState(false)
  const occurrence = nextOccurrenceWithTime(event)
  const gcalUrl = googleCalendarUrl(event)

  function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!emailDraft.trim()) return
    onSaveEmail(emailDraft.trim())
    setSubmitted(true)
  }

  function openGoogleCalendar() {
    if (!gcalUrl) return
    window.open(gcalUrl, '_blank', 'noopener,noreferrer')
    setCalendarOpen(false)
  }

  function handleIcsDownload() {
    downloadIcs(event)
    setCalendarOpen(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 rounded-full bg-brand-light py-2.5 text-sm font-semibold text-brand">
        <CheckCircle2 className="h-4 w-4" />
        You're registered
      </div>

      <div className="rounded-xl bg-cream/60 px-4 py-3 text-xs leading-relaxed">
        <p className="mb-1 font-medium text-text-primary">
          {formatNextOccurrence(event)} · {event.time}
        </p>
        <p className="text-text-secondary">
          {event.is_virtual ? '🔗 Virtual — join link comes here' : `📍 ${event.location}`}
        </p>

        <div className="mt-3 border-t border-black/[0.05] pt-3">
          <p className="mb-2 font-semibold uppercase tracking-wide text-text-muted text-[10px]">
            Here's what happens next
          </p>
          <ul className="space-y-1.5 text-text-secondary">
            <li className="flex items-start gap-1.5">
              <BellRing className="mt-0.5 h-3 w-3 flex-none text-brand" />
              {event.is_virtual
                ? 'The video link will appear here 30 minutes before.'
                : 'We\'ll remind you the day before.'}
            </li>
            <li className="flex items-start gap-1.5">
              <CalendarPlus className="mt-0.5 h-3 w-3 flex-none text-brand" />
              Add it to your phone calendar below — your calendar will remind you.
            </li>
          </ul>
        </div>

        <div className="mt-3 border-t border-black/[0.05] pt-3">
          {submitted ? (
            <p className="text-text-secondary">
              <Mail className="mr-1 inline-block h-3 w-3 text-brand align-[-1px]" />
              We’ll email{' '}
              <span className="font-medium text-text-primary">
                {savedEmail ?? emailDraft}
              </span>{' '}
              a day before.
            </p>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-2">
              <label className="block text-text-secondary">
                Want an email reminder too? (optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  placeholder="you@example.com"
                  className="flex-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!emailDraft.trim()}
                  className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Add to calendar — Luma-style dropdown */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setCalendarOpen((v) => !v)}
          disabled={!occurrence}
          className="flex w-full items-center justify-center gap-1.5 rounded-full border border-brand/30 bg-white py-2 text-sm font-semibold text-brand transition-colors hover:bg-brand-light disabled:opacity-50"
        >
          <CalendarPlus className="h-4 w-4" />
          Add to calendar
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 transition-transform',
              calendarOpen && 'rotate-180'
            )}
          />
        </button>

        {calendarOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 z-10 mt-2 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/[0.06]"
          >
            <button
              type="button"
              onClick={openGoogleCalendar}
              disabled={!gcalUrl}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-text-primary hover:bg-cream-dark disabled:opacity-50"
            >
              <GoogleCalIcon />
              <span className="flex-1">
                Google Calendar
                <span className="block text-[11px] text-text-muted">
                  Opens calendar.google.com
                </span>
              </span>
            </button>
            <div className="h-px bg-black/[0.05]" />
            <button
              type="button"
              onClick={handleIcsDownload}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-text-primary hover:bg-cream-dark"
            >
              <Calendar className="h-4 w-4 text-brand" />
              <span className="flex-1">
                Apple / Outlook
                <span className="block text-[11px] text-text-muted">
                  Downloads .ics file
                </span>
              </span>
            </button>
          </motion.div>
        )}
      </div>

      <p className="text-center text-xs italic text-text-muted">
        You're on the list. See you there.
      </p>

      {/* Cancel — quiet two-tap to confirm so it can't fire on accident */}
      <div className="border-t border-black/[0.05] pt-3 text-center">
        {confirmingCancel ? (
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1 rounded-full bg-text-secondary/10 px-3 py-1 text-xs font-medium text-text-secondary hover:bg-text-secondary/20"
            >
              <X className="h-3 w-3" />
              Tap again to cancel
            </button>
            <button
              type="button"
              onClick={() => setConfirmingCancel(false)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Keep it
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingCancel(true)}
            className="text-xs text-text-muted hover:text-text-primary hover:underline"
          >
            Cancel registration
          </button>
        )}
      </div>
    </div>
  )
}

function GoogleCalIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
      <path fill="#fff" d="M37 12H11v24h26z" />
      <path fill="#1A73E8" d="M37 22V12H11v24h10v-3H14V15h20v7z" />
      <path fill="#EA4335" d="M37 36h6V12h-6z" />
      <path fill="#34A853" d="M37 36l6 6V36z" />
      <path fill="#188038" d="M5 36h6V12H5z" />
      <path fill="#FBBC04" d="M11 42h26v-6H11z" />
      <path fill="#1967D2" d="M11 6v6h26V6z" />
      <path fill="#4285F4" d="M22 22.5l-3 1.5 1 3 2-1 2 1 1-3z" />
    </svg>
  )
}
