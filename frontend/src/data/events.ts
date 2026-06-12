export interface WellnessEvent {
  id: string
  category: string
  categoryColor: string
  title: string
  expert: string
  /** TODO: Replace with real clinician bio (2-3 sentences). */
  bio?: string
  date: string
  time: string
  /** Display address (in-person) or "Virtual event" label. */
  location: string
  is_virtual: boolean
  capacity: string
  description: string
}

export const wellnessEvents: WellnessEvent[] = [
  {
    id: '1',
    category: 'Support Group',
    categoryColor: 'bg-emerald-50 text-emerald-700',
    title: 'Mother Circle — Friendship Park',
    expert: 'Facilitated by ስለ እናት Community',
    date: 'Saturdays',
    time: '4:00 PM – 5:30 PM',
    location: 'Friendship Park, Bole Road',
    is_virtual: false,
    capacity: 'Limited to 12 mothers',
    description:
      'An open-air gathering for mothers in any phase. Bring your baby, your tea, ' +
      'and whatever you want to talk about. No agenda. Quiet, warm, and welcoming.',
  },
  {
    id: '2',
    category: 'Workshop',
    categoryColor: 'bg-blue-50 text-blue-700',
    title: 'Postpartum Yoga (3–12 months)',
    expert: 'Elena Rodriguez, Certified PT',
    bio:
      'TODO: Placeholder bio — replace with real text. ' +
      'Elena is a certified postpartum physical therapist based in Addis Ababa, ' +
      'specializing in pelvic floor recovery and gentle movement for new mothers.',
    date: 'Wednesdays',
    time: '5:00 PM – 6:00 PM',
    location: 'Virtual event',
    is_virtual: true,
    capacity: 'Limited to 25 attendees',
    description:
      'Gentle, postpartum-safe yoga for mothers 3 to 12 months out. Focuses on ' +
      'pelvic floor recovery, posture, and shoulders carrying so much weight.',
  },
  {
    id: '3',
    category: 'Workshop',
    categoryColor: 'bg-blue-50 text-blue-700',
    title: 'Breastfeeding Support Session',
    expert: 'Hanna Bekele, IBCLC',
    bio:
      'TODO: Placeholder bio — replace with real text. ' +
      'Hanna is an internationally board-certified lactation consultant with ' +
      'over a decade of experience supporting Ethiopian mothers through latch, ' +
      'supply, and weaning challenges.',
    date: 'Saturdays',
    time: '3:30 PM – 4:30 PM',
    location: 'Bole Medhanialem Health Center',
    is_virtual: false,
    capacity: 'Limited to 8 mothers',
    description:
      'A small-group session for mothers working through breastfeeding questions — ' +
      'latch, supply, pain, weaning. Bring your baby. No question is too small.',
  },
  {
    id: '4',
    category: 'Expert Talk',
    categoryColor: 'bg-pink-50 text-pink-700',
    title: 'Counselor Open Hours',
    expert: 'Dr. Amina Yusuf, Clinical Psychologist',
    bio:
      'TODO: Placeholder bio — replace with real text. ' +
      'Dr. Yusuf is a clinical psychologist focused on perinatal mental health. ' +
      'She works with mothers experiencing anxiety, postpartum depression, and ' +
      'birth-related trauma.',
    date: 'Tuesdays & Thursdays',
    time: '6:00 PM – 8:00 PM',
    location: 'Virtual event',
    is_virtual: true,
    capacity: 'Drop-in, 1:1 conversations',
    description:
      'A counselor is available for short, anonymous 1:1 conversations. Join the ' +
      'video call when you have a few minutes. No appointment needed.',
  },
  {
    id: '5',
    category: 'Support Group',
    categoryColor: 'bg-emerald-50 text-emerald-700',
    title: 'Dad-and-Newborn Walk',
    expert: 'Facilitated by ስለ እናት Community',
    date: 'Sundays',
    time: '4:00 PM – 5:00 PM',
    location: 'Entoto Park entrance',
    is_virtual: false,
    capacity: 'Open to all fathers/partners',
    description:
      'A slow walk for fathers and partners with their newborns. Come to listen, ' +
      'meet other dads, and share what you’re carrying. Not a workshop — just a walk.',
  },
]
