export interface Testimonial {
  id: string
  name: string
  role: string
  avatar: string
  content: string
  rating: number
}

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sara Mengistu',
    role: 'Medical Student, AAU',
    avatar: 'SM',
    content:
      'Abay Wellness transformed how I manage stress during med school. The AI assistant feels like having a wellness coach available 24/7. The community support is incredible.',
    rating: 5,
  },
  {
    id: '2',
    name: 'Abel Haile',
    role: 'Software Engineer',
    avatar: 'AH',
    content:
      'I discovered YeneHealth through Abay Discover and it changed my family\'s healthcare access. The platform connects everything — nutrition, fitness, mental health — in one beautiful experience.',
    rating: 5,
  },
  {
    id: '3',
    name: 'Tigist Worku',
    role: 'Wellness Coach',
    avatar: 'TW',
    content:
      'As a professional in the wellness space, I\'m impressed by Abay\'s depth. The Discover page alone is a game-changer for connecting Ethiopians with local health organizations.',
    rating: 5,
  },
  {
    id: '4',
    name: 'Michael Tesfaye',
    role: 'Fitness Enthusiast',
    avatar: 'MT',
    content:
      'The community hub helped me find a running group in Addis and accountability partners. Combined with the nutrition intelligence features, I\'ve never felt healthier.',
    rating: 5,
  },
]

export const stats = [
  { label: 'Wellness Score', value: 94, suffix: '%', description: 'Average user wellness improvement' },
  { label: 'Active Users', value: 12500, suffix: '+', description: 'Growing community members' },
  { label: 'Wellness Sessions', value: 48000, suffix: '+', description: 'AI-guided sessions completed' },
  { label: 'Nutrition Plans', value: 3200, suffix: '+', description: 'Personalized plans created' },
]
