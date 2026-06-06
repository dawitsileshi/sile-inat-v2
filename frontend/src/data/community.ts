export interface CommunityPost {
  id: string
  author: string
  avatar: string
  group: string
  groupColor: string
  title: string
  content: string
  likes: number
  comments: number
  timeAgo: string
  tags: string[]
  anonymous: boolean
  trending?: boolean
}

export interface CommunityGroup {
  id: string
  name: string
  members: number
  description: string
  icon: string
  color: string
  active: boolean
}

export interface TrendingTopic {
  id: string
  title: string
  posts: number
  category: string
}

export const communityGroups: CommunityGroup[] = [
  {
    id: 'students',
    name: 'Student Wellness',
    members: 4820,
    description: 'Mental health, study stress, and campus life support',
    icon: '🎓',
    color: 'from-blue-500 to-indigo-600',
    active: true,
  },
  {
    id: 'fitness',
    name: 'Fitness & Movement',
    members: 3150,
    description: 'Workouts, running clubs, and active lifestyle tips',
    icon: '🏃',
    color: 'from-rose-500 to-orange-500',
    active: false,
  },
  {
    id: 'womens',
    name: "Women's Wellness",
    members: 6240,
    description: 'Safe space for women\'s health, empowerment, and support',
    icon: '🌸',
    color: 'from-pink-500 to-purple-600',
    active: false,
  },
  {
    id: 'nutrition',
    name: 'Nutrition & Food',
    members: 2890,
    description: 'Ethiopian recipes, meal prep, and healthy eating',
    icon: '🥗',
    color: 'from-emerald-500 to-teal-600',
    active: false,
  },
  {
    id: 'mental',
    name: 'Mental Health Support',
    members: 5100,
    description: 'Open discussions about anxiety, depression, and healing',
    icon: '🧠',
    color: 'from-violet-500 to-purple-600',
    active: false,
  },
]

export const communityPosts: CommunityPost[] = [
  {
    id: '1',
    author: 'Meron A.',
    avatar: 'MA',
    group: 'Student Wellness',
    groupColor: 'bg-blue-500',
    title: 'How I manage exam anxiety with the Abay AI assistant',
    content:
      'Sharing my routine: 10 min morning meditation via Abay, journaling prompts, and breaking study sessions into 25-min blocks. The AI check-ins really help me stay grounded during finals week.',
    likes: 234,
    comments: 47,
    timeAgo: '2h ago',
    tags: ['mental-health', 'students', 'ai-assistant'],
    anonymous: false,
    trending: true,
  },
  {
    id: '2',
    author: 'Anonymous',
    avatar: '?',
    group: "Women's Wellness",
    groupColor: 'bg-pink-500',
    title: 'Struggling with postpartum anxiety — anyone else?',
    content:
      'It\'s been 3 months since giving birth and I feel overwhelmed. I know I\'m not alone. Would love to hear how others navigated this. No judgment please.',
    likes: 189,
    comments: 62,
    timeAgo: '4h ago',
    tags: ['postpartum', 'support', 'mental-health'],
    anonymous: true,
    trending: true,
  },
  {
    id: '3',
    author: 'Dawit K.',
    avatar: 'DK',
    group: 'Fitness & Movement',
    groupColor: 'bg-rose-500',
    title: 'Addis Ababa running group — Saturday 6AM Bole',
    content:
      'We meet every Saturday at 6AM near Bole Medhanialem. All paces welcome! Last week we had 30 people. Bring water and good vibes. 🏃‍♂️',
    likes: 156,
    comments: 28,
    timeAgo: '6h ago',
    tags: ['fitness', 'running', 'addis-ababa'],
    anonymous: false,
  },
  {
    id: '4',
    author: 'Hanna T.',
    avatar: 'HT',
    group: 'Nutrition & Food',
    groupColor: 'bg-emerald-500',
    title: 'Teff-based meal prep ideas for busy professionals',
    content:
      'Here are 5 teff recipes I prep on Sundays that last the whole week. High protein, low effort, and authentically Ethiopian. Includes injera wraps, teff porridge bowls, and more.',
    likes: 312,
    comments: 89,
    timeAgo: '8h ago',
    tags: ['nutrition', 'teff', 'meal-prep'],
    anonymous: false,
    trending: true,
  },
  {
    id: '5',
    author: 'Anonymous',
    avatar: '?',
    group: 'Mental Health Support',
    groupColor: 'bg-violet-500',
    title: 'Therapy changed my life — encouraging anyone on the fence',
    content:
      'I was skeptical for years. Finally tried Selam Therapy Center through Abay\'s referral. Six months later, I\'m a different person. If you\'re thinking about it, just take the first step.',
    likes: 445,
    comments: 103,
    timeAgo: '12h ago',
    tags: ['therapy', 'mental-health', 'encouragement'],
    anonymous: true,
  },
  {
    id: '6',
    author: 'Yonas B.',
    avatar: 'YB',
    group: 'Student Wellness',
    groupColor: 'bg-blue-500',
    title: 'Free mindfulness workshop at AAU this Friday',
    content:
      'Mindful Ethiopia is hosting a free 2-hour workshop on campus. Topics: stress management, breathing techniques, and building daily mindfulness habits. Register through Abay Discover!',
    likes: 98,
    comments: 15,
    timeAgo: '1d ago',
    tags: ['mindfulness', 'workshop', 'students'],
    anonymous: false,
  },
]

export const trendingTopics: TrendingTopic[] = [
  { id: '1', title: 'Exam season mental health tips', posts: 156, category: 'Students' },
  { id: '2', title: 'Ethiopian superfoods for immunity', posts: 89, category: 'Nutrition' },
  { id: '3', title: 'YeneHealth telemedicine review', posts: 74, category: 'Health Tech' },
  { id: '4', title: 'Morning workout routines', posts: 62, category: 'Fitness' },
  { id: '5', title: 'Breaking mental health stigma', posts: 58, category: 'Mental Health' },
  { id: '6', title: 'Postpartum support resources', posts: 45, category: "Women's Health" },
]
