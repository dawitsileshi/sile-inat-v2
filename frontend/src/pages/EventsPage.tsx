import { useState } from 'react'
import { motion } from 'framer-motion'
import { Calendar, Clock, MapPin, Users, Video, CheckCircle2 } from 'lucide-react'
import { wellnessEvents } from '@/data/events'
import { cn } from '@/lib/utils'

const badgeStyles: Record<string, string> = {
  'Expert Talk': 'bg-[#fde0e6] text-[#c4456b]',
  Workshop: 'bg-[#dbe7f5] text-[#4a78b8]',
  'Support Group': 'bg-[#cfe9da] text-[#2e8253]',
}

const RSVP_KEY = 'rsvped_event_ids'

function readRsvps(): Set<string> {
  try {
    const raw = localStorage.getItem(RSVP_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return new Set(arr)
  } catch {
    /* ignore */
  }
  return new Set()
}

function writeRsvps(set: Set<string>) {
  localStorage.setItem(RSVP_KEY, JSON.stringify([...set]))
}

export function EventsPage() {
  const [rsvped, setRsvped] = useState<Set<string>>(() => readRsvps())

  function handleRsvp(eventId: string) {
    setRsvped((prev) => {
      if (prev.has(eventId)) return prev
      const next = new Set(prev)
      next.add(eventId)
      writeRsvps(next)
      return next
    })
  }

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
            Events & Circles
          </h1>
          <p className="mt-2 text-base text-text-secondary">
            Small gatherings, expert sessions, and quiet places to be with other mothers.
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {wellnessEvents.map((event, i) => {
            const isRsvped = rsvped.has(event.id)
            return (
              <motion.article
                key={event.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex flex-col rounded-2xl bg-white p-6 card-shadow"
              >
                <span
                  className={cn(
                    'mb-4 inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold',
                    badgeStyles[event.category] ?? 'bg-cream-dark text-text-secondary'
                  )}
                >
                  {event.category}
                </span>

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
                    <NextSteps event={event} />
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
      </div>
    </div>
  )
}

function NextSteps({ event }: { event: (typeof wellnessEvents)[number] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-center gap-2 rounded-full bg-brand-light py-2.5 text-sm font-semibold text-brand">
        <CheckCircle2 className="h-4 w-4" />
        You’re registered
      </div>

      <div className="rounded-xl bg-cream/60 px-4 py-3 text-xs leading-relaxed text-text-secondary">
        {event.is_virtual ? (
          <p>A video call link will be shared here closer to the event time.</p>
        ) : (
          <>
            <p className="font-medium text-text-primary">{event.location}</p>
            <p className="mt-1">Save this location. We’ll send a reminder before the event.</p>
          </>
        )}
        <p className="mt-2 italic">You’re on the list. See you there.</p>
      </div>
    </div>
  )
}
