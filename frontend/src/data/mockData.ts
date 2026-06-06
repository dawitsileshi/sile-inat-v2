export interface Expert {
  id: string;
  name: string;
  specialty: string;
  origin: string;
  bio: string;
  next_event: string;
  image_url: string;
}

export interface Story {
  id: string;
  title: string;
  author: string;
  detail: string;
  created_at: string;
  image_url: string;
  isWeekly?: boolean;
}

export interface Event {
  id: string;
  title: string;
  detail: string;
  location: string;
  time: string;
  speaker: string;
  recurring: string;
  category: string;
}

export interface KnowledgeCapsule {
  id: string;
  title: string;
  type: 'article' | 'video' | 'tip';
  content_url: string;
  author: string;
  summary: string;
}

export const mockExperts: Expert[] = [
  {
    id: 'e1',
    name: 'Dr. Sarah Chen',
    specialty: 'Mindfulness & Meditation',
    origin: 'Singapore',
    bio: 'Specialist in MBSR with 15 years of experience in clinical psychology and holistic wellness.',
    next_event: 'June 12 - Deep Sleep Workshop',
    image_url: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'e2',
    name: 'Marcus Thorne',
    specialty: 'Functional Fitness',
    origin: 'United Kingdom',
    bio: 'Renowned expert in mobility and longevity, focusing on sustainable movement patterns.',
    next_event: 'June 15 - Bio-mechanical Breathing',
    image_url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=400',
  },
  {
    id: 'e3',
    name: 'Elena Rodriguez',
    specialty: 'Nutritional Therapy',
    origin: 'Spain',
    bio: 'Author of "The Gut-Brain Connection" and consultant for Olympic athletes.',
    next_event: 'June 18 - Summer Gut Reset',
    image_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
  },
];

export const mockStories: Story[] = [
  {
    id: 's1',
    title: 'Finding Stillness in the City',
    author: 'James Wilson',
    detail: 'How a high-stress CEO transformed his life through 10 minutes of daily silence.',
    created_at: '2024-05-20',
    image_url: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=800',
    isWeekly: true,
  },
  {
    id: 's2',
    title: 'The Power of Morning Rituals',
    author: 'Maya Lin',
    detail: 'Exploring the science behind why a structured start to the day boosts productivity.',
    created_at: '2024-05-22',
    image_url: 'https://images.unsplash.com/photo-1490818387583-1baba5e6382b?auto=format&fit=crop&q=80&w=600',
  },
  {
    id: 's3',
    title: 'Breathwork for Anxiety',
    author: 'David Cohen',
    detail: 'Simple techniques to regulate your nervous system in under 3 minutes.',
    created_at: '2024-05-24',
    image_url: 'https://images.unsplash.com/photo-1444464666168-49d633b867ad?auto=format&fit=crop&q=80&w=600',
  },
];

export const mockEvents: Event[] = [
  {
    id: 'ev1',
    title: 'Sunset Yoga Flow',
    detail: 'A rejuvenating vinyasa session focusing on breath-to-movement connection.',
    location: 'North Garden',
    time: '6:30 PM - 7:30 PM',
    speaker: 'Aria Sky',
    recurring: 'Every Tuesday',
    category: 'Fitness',
  },
  {
    id: 'ev2',
    title: 'Sound Healing Bath',
    detail: 'Immerse yourself in frequencies from crystal bowls to clear mental blocks.',
    location: 'Zen Studio',
    time: '7:00 PM - 8:30 PM',
    speaker: 'Julian Echo',
    recurring: 'Monthly (New Moon)',
    category: 'Relaxation',
  },
  {
    id: 'ev3',
    title: 'Plant-Based Cooking Class',
    detail: 'Learn to create nutrient-dense meals that satisfy and energize.',
    location: 'Culinary Wing',
    time: '11:00 AM - 1:00 PM',
    speaker: 'Chef Leo',
    recurring: 'Bi-weekly Saturdays',
    category: 'Nutrition',
  },
];

export const mockCapsules: KnowledgeCapsule[] = [
  {
    id: 'k1',
    title: '5 Habits for Deeper Sleep',
    type: 'article',
    content_url: '#',
    author: 'Sleep Institute',
    summary: 'Master your sleep hygiene with these evidence-based routines.',
  },
  {
    id: 'k2',
    title: 'Quick Home Stretching',
    type: 'video',
    content_url: '#',
    author: 'Aria Sky',
    summary: 'Flow through these 5 movements to release desk-bound tension.',
  },
  {
    id: 'k3',
    title: 'Hydration Tip',
    type: 'tip',
    content_url: '#',
    author: 'Elena Rodriguez',
    summary: 'Add a pinch of sea salt to your morning water for better absorption.',
  },
];

export const dailyWellnessTip = {
  id: 'dt1',
  title: 'Daily Mindfulness',
  content: 'Take 3 deep breaths before responding to your next email. Notice the pause.',
  author: 'Sarah Chen'
};
