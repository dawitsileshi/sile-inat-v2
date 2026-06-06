export interface Leader {
  name: string
  role: string
  bio: string
}

export interface Organization {
  id: string
  name: string
  tagline: string
  description: string
  mission: string
  vision: string
  services: string[]
  category: OrganizationCategory
  foundingYear: number
  location: string
  logo: string
  coverGradient: string
  featured: boolean
  website: string
  email: string
  phone: string
  social: { platform: string; url: string }[]
  leadership: Leader[]
  relatedIds: string[]
}

export type OrganizationCategory =
  | 'all'
  | 'healthtech'
  | 'mental-health'
  | 'nutrition'
  | 'fitness'
  | 'wellness-center'
  | 'community'
  | 'startup'

export const categories: { id: OrganizationCategory; label: string; icon: string }[] = [
  { id: 'all', label: 'All', icon: '✦' },
  { id: 'healthtech', label: 'Health Tech', icon: '⚡' },
  { id: 'mental-health', label: 'Mental Health', icon: '🧠' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { id: 'fitness', label: 'Fitness', icon: '💪' },
  { id: 'wellness-center', label: 'Wellness Centers', icon: '🏥' },
  { id: 'community', label: 'Community', icon: '🤝' },
  { id: 'startup', label: 'Startups', icon: '🚀' },
]

export const organizations: Organization[] = [
  {
    id: 'yenehealth',
    name: 'YeneHealth',
    tagline: 'Ethiopia\'s digital health companion for every family',
    description:
      'YeneHealth is a pioneering Ethiopian health-tech startup building accessible, AI-powered healthcare solutions for underserved communities. From telemedicine to maternal health tracking, YeneHealth bridges the gap between traditional care and modern technology.',
    mission:
      'To democratize healthcare access across Ethiopia by delivering affordable, culturally-aware digital health tools that empower individuals and families to take control of their wellbeing.',
    vision:
      'A future where every Ethiopian — regardless of location or income — has a trusted health companion in their pocket, reducing preventable deaths and improving quality of life nationwide.',
    services: [
      'AI Health Assistant',
      'Telemedicine Platform',
      'Maternal & Child Health Tracking',
      'Symptom Checker',
      'Health Records Management',
      'Community Health Worker Integration',
      'Medication Reminders',
      'Wellness Analytics Dashboard',
    ],
    category: 'healthtech',
    foundingYear: 2021,
    location: 'Addis Ababa, Ethiopia',
    logo: 'YH',
    coverGradient: 'from-emerald-600 via-teal-500 to-cyan-400',
    featured: true,
    website: 'https://yenehealth.com',
    email: 'hello@yenehealth.com',
    phone: '+251 11 123 4567',
    social: [
      { platform: 'Twitter', url: 'https://twitter.com/yenehealth' },
      { platform: 'LinkedIn', url: 'https://linkedin.com/company/yenehealth' },
      { platform: 'Instagram', url: 'https://instagram.com/yenehealth' },
    ],
    leadership: [
      {
        name: 'Dr. Selam Tadesse',
        role: 'CEO & Co-Founder',
        bio: 'Physician-turned-entrepreneur with 12 years of public health experience across East Africa.',
      },
      {
        name: 'Daniel Mekonnen',
        role: 'CTO & Co-Founder',
        bio: 'Former Google engineer passionate about building health infrastructure for emerging markets.',
      },
      {
        name: 'Hanna Bekele',
        role: 'Head of Product',
        bio: 'Product leader focused on human-centered design for low-connectivity environments.',
      },
    ],
    relatedIds: ['selam-therapy', 'nutriethiopia', 'addis-fitness-hub'],
  },
  {
    id: 'selam-therapy',
    name: 'Selam Therapy Center',
    tagline: 'Healing minds, restoring hope',
    description:
      'Selam Therapy Center provides culturally-sensitive mental health services including individual therapy, group counseling, and crisis intervention for Ethiopian communities.',
    mission: 'Break the stigma around mental health in Ethiopia through accessible, compassionate care.',
    vision: 'A nation where mental wellness is prioritized alongside physical health.',
    services: ['Individual Therapy', 'Group Counseling', 'Crisis Hotline', 'Youth Programs', 'Corporate Wellness'],
    category: 'mental-health',
    foundingYear: 2018,
    location: 'Addis Ababa, Ethiopia',
    logo: 'ST',
    coverGradient: 'from-violet-600 via-purple-500 to-fuchsia-400',
    featured: true,
    website: 'https://selamtherapy.et',
    email: 'care@selamtherapy.et',
    phone: '+251 11 234 5678',
    social: [
      { platform: 'Facebook', url: '#' },
      { platform: 'Instagram', url: '#' },
    ],
    leadership: [
      { name: 'Dr. Amina Yusuf', role: 'Clinical Director', bio: 'Licensed psychologist specializing in trauma-informed care.' },
    ],
    relatedIds: ['yenehealth', 'mindful-ethiopia'],
  },
  {
    id: 'nutriethiopia',
    name: 'NutriEthiopia',
    tagline: 'Traditional wisdom meets modern nutrition science',
    description:
      'NutriEthiopia combines Ethiopia\'s rich culinary heritage with evidence-based nutrition science to create personalized meal plans and wellness programs.',
    mission: 'Nourish Ethiopia through culturally-rooted, science-backed nutrition guidance.',
    vision: 'Every Ethiopian household equipped with the knowledge to eat well and live vibrantly.',
    services: ['Personalized Meal Plans', 'Nutrition Coaching', 'Corporate Wellness Programs', 'School Nutrition'],
    category: 'nutrition',
    foundingYear: 2020,
    location: 'Addis Ababa, Ethiopia',
    logo: 'NE',
    coverGradient: 'from-amber-500 via-orange-400 to-yellow-300',
    featured: true,
    website: 'https://nutriethiopia.com',
    email: 'info@nutriethiopia.com',
    phone: '+251 11 345 6789',
    social: [{ platform: 'Instagram', url: '#' }, { platform: 'YouTube', url: '#' }],
    leadership: [
      { name: 'Tigist Haile', role: 'Founder & Lead Nutritionist', bio: 'Registered dietitian with expertise in Ethiopian superfoods.' },
    ],
    relatedIds: ['yenehealth', 'addis-fitness-hub'],
  },
  {
    id: 'addis-fitness-hub',
    name: 'Addis Fitness Hub',
    tagline: 'Move better, live stronger',
    description:
      'A premium fitness center and wellness community offering state-of-the-art equipment, group classes, and personal training in the heart of Addis Ababa.',
    mission: 'Make fitness accessible and enjoyable for all Ethiopians.',
    vision: 'Building Ethiopia\'s most vibrant fitness and wellness community.',
    services: ['Gym Membership', 'Personal Training', 'Yoga & Pilates', 'CrossFit', 'Swimming Pool', 'Spa Services'],
    category: 'fitness',
    foundingYear: 2019,
    location: 'Bole, Addis Ababa',
    logo: 'AF',
    coverGradient: 'from-rose-600 via-red-500 to-orange-400',
    featured: false,
    website: 'https://addisfitnesshub.com',
    email: 'join@addisfitnesshub.com',
    phone: '+251 11 456 7890',
    social: [{ platform: 'Instagram', url: '#' }],
    leadership: [
      { name: 'Michael Assefa', role: 'Founder & Head Coach', bio: 'Certified strength coach and former national athlete.' },
    ],
    relatedIds: ['nutriethiopia', 'zen-wellness-spa'],
  },
  {
    id: 'mindful-ethiopia',
    name: 'Mindful Ethiopia',
    tagline: 'Meditation for the modern Ethiopian',
    description:
      'Mindful Ethiopia offers guided meditation, mindfulness workshops, and stress management programs rooted in both ancient Ethiopian spiritual practices and modern psychology.',
    mission: 'Cultivate inner peace and mental resilience across Ethiopian society.',
    vision: 'A mindful nation where calm minds create thriving communities.',
    services: ['Guided Meditation App', 'Corporate Mindfulness', 'Retreat Programs', 'Mindfulness for Students'],
    category: 'mental-health',
    foundingYear: 2022,
    location: 'Addis Ababa, Ethiopia',
    logo: 'ME',
    coverGradient: 'from-indigo-600 via-blue-500 to-sky-400',
    featured: false,
    website: 'https://mindfulethiopia.org',
    email: 'peace@mindfulethiopia.org',
    phone: '+251 11 567 8901',
    social: [{ platform: 'YouTube', url: '#' }],
    leadership: [
      { name: 'Ephrem Wolde', role: 'Founder', bio: 'Meditation teacher blending Orthodox contemplative traditions with secular mindfulness.' },
    ],
    relatedIds: ['selam-therapy', 'yenehealth'],
  },
  {
    id: 'zen-wellness-spa',
    name: 'Zen Wellness Spa',
    tagline: 'Restore. Rejuvenate. Renew.',
    description:
      'An award-winning wellness spa offering holistic treatments combining Ethiopian herbal remedies with international spa techniques.',
    mission: 'Provide transformative wellness experiences that heal body and soul.',
    vision: 'Ethiopia\'s premier destination for holistic wellness and rejuvenation.',
    services: ['Massage Therapy', 'Aromatherapy', 'Herbal Treatments', 'Sauna & Steam', 'Wellness Packages'],
    category: 'wellness-center',
    foundingYear: 2017,
    location: 'Kazanchis, Addis Ababa',
    logo: 'ZW',
    coverGradient: 'from-teal-600 via-emerald-500 to-green-400',
    featured: false,
    website: 'https://zenwellness.et',
    email: 'book@zenwellness.et',
    phone: '+251 11 678 9012',
    social: [{ platform: 'Instagram', url: '#' }],
    leadership: [
      { name: 'Rahel Desta', role: 'Wellness Director', bio: 'Holistic health practitioner with 15 years in spa management.' },
    ],
    relatedIds: ['addis-fitness-hub', 'nutriethiopia'],
  },
  {
    id: 'habesha-health-collective',
    name: 'Habesha Health Collective',
    tagline: 'Community-powered wellness for all',
    description:
      'A grassroots community organization connecting Ethiopians with free wellness resources, health education workshops, and peer support networks.',
    mission: 'Empower communities to take collective action for better health outcomes.',
    vision: 'Health equity achieved through community solidarity and shared knowledge.',
    services: ['Health Education Workshops', 'Peer Support Groups', 'Free Health Screenings', 'Youth Wellness Programs'],
    category: 'community',
    foundingYear: 2016,
    location: 'Nationwide, Ethiopia',
    logo: 'HH',
    coverGradient: 'from-cyan-600 via-teal-500 to-emerald-400',
    featured: false,
    website: 'https://habeshahealth.org',
    email: 'community@habeshahealth.org',
    phone: '+251 11 789 0123',
    social: [{ platform: 'Facebook', url: '#' }, { platform: 'Telegram', url: '#' }],
    leadership: [
      { name: 'Birtukan Lemma', role: 'Executive Director', bio: 'Community organizer and public health advocate.' },
    ],
    relatedIds: ['yenehealth', 'selam-therapy'],
  },
  {
    id: 'injera-fit',
    name: 'InjeraFit',
    tagline: 'Fitness fueled by Ethiopian culture',
    description:
      'A fitness startup gamifying wellness with culturally-themed workout programs, challenges, and a vibrant mobile app community.',
    mission: 'Make fitness fun and culturally relevant for young Ethiopians.',
    vision: 'The #1 fitness app in East Africa, powered by community and culture.',
    services: ['Fitness App', 'Virtual Challenges', 'Cultural Workout Programs', 'Wearable Integration'],
    category: 'startup',
    foundingYear: 2023,
    location: 'Addis Ababa, Ethiopia',
    logo: 'IF',
    coverGradient: 'from-pink-600 via-rose-500 to-red-400',
    featured: true,
    website: 'https://injerafit.app',
    email: 'team@injerafit.app',
    phone: '+251 11 890 1234',
    social: [{ platform: 'TikTok', url: '#' }, { platform: 'Instagram', url: '#' }],
    leadership: [
      { name: 'Yonas Kebede', role: 'CEO', bio: 'Tech entrepreneur and fitness enthusiast.' },
    ],
    relatedIds: ['addis-fitness-hub', 'nutriethiopia'],
  },
]
