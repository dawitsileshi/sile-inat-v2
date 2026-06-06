import { motion } from 'framer-motion'
import { Calendar, Clock, Video, Users } from 'lucide-react'
import { wellnessEvents } from '@/data/events'
import { cn } from '@/lib/utils'

const badgeStyles: Record<string, string> = {
  'Expert Talk': 'bg-[#fde0e6] text-[#c4456b]',
  'Workshop': 'bg-[#dbe7f5] text-[#4a78b8]',
  'Support Group': 'bg-[#cfe9da] text-[#2e8253]',
}

export function EventsPage() {
  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">Expert Talks & Events</h1>
          <p className="mt-2 text-base text-text-secondary">
            Learn from professionals and connect with other mothers
          </p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {wellnessEvents.map((event, i) => (
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

              <h2 className="text-lg font-bold leading-snug text-text-primary">{event.title}</h2>
              <p className="mt-1 text-sm text-brand">with {event.expert}</p>

              <ul className="mt-4 space-y-2 text-sm text-text-secondary">
                <li className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-brand" />
                  {event.date}, {event.time.split(' – ')[0]}
                </li>
                <li className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand" />
                  {event.time}
                </li>
                <li className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-brand" />
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

              <button className="mt-5 w-full rounded-full bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark">
                RSVP to attend
              </button>
            </motion.article>
          ))}
        </div>
      </div>
    </div>
  )
}
