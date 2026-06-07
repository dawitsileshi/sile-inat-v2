export interface WellnessEvent {
  id: string
  category: string
  categoryColor: string
  title: string
  expert: string
  date: string
  time: string
  location: string
  capacity: string
  description: string
}

export const wellnessEvents: WellnessEvent[] = [
  {
    id: '1',
    category: 'Expert Talk',
    categoryColor: 'bg-pink-50 text-pink-700',
    title: 'Postpartum Nutrition: Fueling Recovery',
    expert: 'Dr. Sarah Mitchell, RD',
    date: 'Tue, Jun 9',
    time: '6:29 AM – 7:29 AM',
    location: 'Virtual event',
    capacity: 'Limited to 50 attendees',
    description:
      'Learn evidence-based nutrition strategies for postpartum recovery, including meal planning tips and Ethiopian superfood integration.',
  },
  {
    id: '2',
    category: 'Workshop',
    categoryColor: 'bg-blue-50 text-blue-700',
    title: 'Mindful Movement for New Mothers',
    expert: 'Elena Rodriguez, Certified PT',
    date: 'Wed, Jun 10',
    time: '6:29 AM – 7:14 AM',
    location: 'Virtual event',
    capacity: 'Limited to 30 attendees',
    description:
      'Gentle exercises and stretches designed for postpartum bodies. Safe, effective movements you can do at home.',
  },
  {
    id: '3',
    category: 'Support Group',
    categoryColor: 'bg-emerald-50 text-emerald-700',
    title: 'New Moms Circle: First 6 Weeks',
    expert: 'Facilitated by ስለ እናት Community',
    date: 'Thu, Jun 11',
    time: '6:29 AM – 7:29 AM',
    location: 'Virtual event',
    capacity: 'Limited to 20 attendees',
    description:
      'A safe space to share experiences, ask questions, and connect with other mothers navigating the early weeks.',
  },
  {
    id: '4',
    category: 'Expert Talk',
    categoryColor: 'bg-pink-50 text-pink-700',
    title: 'Sleep Strategies for You & Baby',
    expert: 'Dr. James Chen, Pediatric Sleep Specialist',
    date: 'Fri, Jun 12',
    time: '6:29 AM – 7:29 AM',
    location: 'Virtual event',
    capacity: 'Limited to 50 attendees',
    description:
      'Practical advice on establishing healthy sleep routines for both mother and baby during the postpartum period.',
  },
  {
    id: '5',
    category: 'Workshop',
    categoryColor: 'bg-blue-50 text-blue-700',
    title: 'Mental Wellness & Self-Care Basics',
    expert: 'Dr. Amina Yusuf, Clinical Psychologist',
    date: 'Sat, Jun 13',
    time: '10:00 AM – 11:30 AM',
    location: 'Virtual event',
    capacity: 'Limited to 40 attendees',
    description:
      'Understanding postpartum mental health, recognizing warning signs, and building a sustainable self-care practice.',
  },
  {
    id: '6',
    category: 'Support Group',
    categoryColor: 'bg-emerald-50 text-emerald-700',
    title: 'Ethiopian Mothers Wellness Circle',
    expert: 'Facilitated by ስለ እናት Community',
    date: 'Sun, Jun 14',
    time: '4:00 PM – 5:30 PM',
    location: 'Virtual event',
    capacity: 'Limited to 25 attendees',
    description:
      'Culturally-rooted support for Ethiopian mothers — share traditions, challenges, and wellness wisdom together.',
  },
]
