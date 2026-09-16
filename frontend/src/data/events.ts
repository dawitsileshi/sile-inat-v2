/**
 * Structural event data. Everything a visitor reads (title, host, bio,
 * location, capacity, description, the day label) lives under
 * events.items.<id> in src/locales/*.json — see useWellnessEvents() in
 * EventsPage.
 *
 * `date` and `time` stay in English here because they are parsed to build
 * the next occurrence and the calendar invite.
 */
export interface WellnessEventBase {
  id: string
  /** Also the i18n key suffix for the badge: events.categories.<category>. */
  category: 'expertTalk' | 'workshop' | 'supportGroup'
  categoryColor: string
  /** Weekday(s), English — parsed, not displayed. */
  date: string
  /** e.g. "4:00 PM – 5:30 PM" — parsed and displayed. */
  time: string
  is_virtual: boolean
  /** True when the translated bio is still set (some events have none). */
  hasBio: boolean
}

export interface WellnessEvent extends WellnessEventBase {
  title: string
  expert: string
  /** TODO: Replace with real clinician bio (2-3 sentences). */
  bio?: string
  dateLabel: string
  /** Display address (in-person) or "Virtual event" label. */
  location: string
  capacity: string
  description: string
}

export const wellnessEvents: WellnessEventBase[] = [
  {
    id: '1',
    category: 'supportGroup',
    categoryColor: 'bg-emerald-50 text-emerald-700',
    date: 'Saturdays',
    time: '4:00 PM – 5:30 PM',
    is_virtual: false,
    hasBio: false,
  },
  {
    id: '2',
    category: 'workshop',
    categoryColor: 'bg-blue-50 text-blue-700',
    date: 'Wednesdays',
    time: '5:00 PM – 6:00 PM',
    is_virtual: true,
    hasBio: true,
  },
  {
    id: '3',
    category: 'workshop',
    categoryColor: 'bg-blue-50 text-blue-700',
    date: 'Saturdays',
    time: '3:30 PM – 4:30 PM',
    is_virtual: false,
    hasBio: true,
  },
  {
    id: '4',
    category: 'expertTalk',
    categoryColor: 'bg-pink-50 text-pink-700',
    date: 'Tuesdays & Thursdays',
    time: '6:00 PM – 8:00 PM',
    is_virtual: true,
    hasBio: true,
  },
  {
    id: '5',
    category: 'supportGroup',
    categoryColor: 'bg-emerald-50 text-emerald-700',
    date: 'Sundays',
    time: '4:00 PM – 5:00 PM',
    is_virtual: false,
    hasBio: false,
  },
]
