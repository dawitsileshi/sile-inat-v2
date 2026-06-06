export interface CEOLeader {
  name: string
  role: string
  photo: string
  bio: string
  education: string
  experience: string[]
  achievements: string[]
  linkedin?: string
  email?: string
}

export interface PlatformSpotlight {
  id: string
  name: string
  logo: string
  tagline: string
  founded: number
  headquarters: string
  employees: string
  funding: string
  website: string
  mission: string
  vision: string
  impact: string[]
  services: string[]
  leadership: CEOLeader[]
}

export interface NewsArticle {
  id: string
  slug: string
  title: string
  excerpt: string
  category: 'Platform Spotlight' | 'Health Tech' | 'Community' | 'Innovation' | 'Wellness'
  categoryColor: string
  date: string
  readTime: string
  author: string
  coverGradient: string
  image?: string
  content: string[]
  highlights: string[]
  platform: PlatformSpotlight
  relatedSlugs: string[]
}

export const newsArticles: NewsArticle[] = [
  {
    id: '1',
    slug: 'yenehealth-revolutionizing-ethiopian-healthcare',
    title: 'How YeneHealth Is Revolutionizing Healthcare Access Across Ethiopia',
    excerpt:
      'From telemedicine to AI-powered maternal health tracking, YeneHealth is bridging the gap between traditional care and modern technology for millions of Ethiopians.',
    category: 'Platform Spotlight',
    categoryColor: 'bg-brand-light text-brand',
    date: 'Jun 4, 2026',
    readTime: '8 min read',
    author: 'Abay Wellness Editorial',
    coverGradient: 'from-emerald-600 via-teal-500 to-cyan-400',
    content: [
      'In a country where rural communities often travel hours to reach the nearest clinic, YeneHealth emerged in 2021 with a bold vision: put a trusted health companion in every Ethiopian\'s pocket. What started as a telemedicine pilot in Addis Ababa has grown into one of East Africa\'s most ambitious digital health platforms.',
      'YeneHealth\'s approach is uniquely Ethiopian. Rather than importing Western health apps wholesale, the team spent two years conducting field research in Amhara, Oromia, and SNNPR regions — understanding how families actually seek care, what barriers they face, and how technology could complement rather than replace community health workers.',
      'The platform\'s AI Health Assistant, trained on both international medical guidelines and Ethiopian clinical protocols, can conduct symptom assessments in Amharic, Afaan Oromo, and English. During a 2025 pilot in rural Gurage zone, the assistant helped community health workers identify 340 high-risk pregnancies that would have otherwise gone undetected until complications arose.',
      'Telemedicine is another cornerstone. YeneHealth connects patients with licensed Ethiopian physicians via video consultations — critical in a nation with just 0.3 doctors per 1,000 people. The platform has facilitated over 45,000 virtual consultations since launch, with 78% of users reporting they would not have sought care otherwise due to distance or cost.',
      'Perhaps most innovative is YeneHealth\'s integration with Ethiopia\'s existing community health worker (CHW) network. Rather than competing with the 40,000+ CHWs already serving rural areas, YeneHealth equips them with a tablet app for patient registration, follow-up scheduling, and emergency escalation — creating a digital layer on top of trusted human relationships.',
      'Looking ahead, YeneHealth is expanding its maternal health tracking module, adding offline-first capabilities for low-connectivity regions, and partnering with the Ministry of Health on a national health records initiative. For CEO Dr. Selam Tadesse, the mission remains unchanged: "Healthcare is a right, not a privilege. Technology should make that right accessible to every Ethiopian family."',
    ],
    highlights: [
      '45,000+ virtual consultations facilitated since 2021',
      'AI assistant supports Amharic, Afaan Oromo, and English',
      'Integrated with 40,000+ community health workers nationwide',
      '340 high-risk pregnancies identified in rural pilot program',
    ],
    platform: {
      id: 'yenehealth',
      name: 'YeneHealth',
      logo: 'YH',
      tagline: 'Ethiopia\'s digital health companion for every family',
      founded: 2021,
      headquarters: 'Addis Ababa, Ethiopia',
      employees: '45–60',
      funding: 'Seed round — $2.1M (2023)',
      website: 'https://yenehealth.com',
      mission:
        'To democratize healthcare access across Ethiopia by delivering affordable, culturally-aware digital health tools that empower individuals and families to take control of their wellbeing.',
      vision:
        'A future where every Ethiopian — regardless of location or income — has a trusted health companion in their pocket, reducing preventable deaths and improving quality of life nationwide.',
      impact: [
        'Serving 120,000+ registered users across 11 regions',
        'Partnerships with 3 regional health bureaus',
        'Winner — Ethiopian Health Innovation Award 2024',
        'Featured at Africa Health Tech Summit 2025',
      ],
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
      leadership: [
        {
          name: 'Dr. Selam Tadesse',
          role: 'CEO & Co-Founder',
          photo: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&h=400&fit=crop&crop=face',
          bio: 'Dr. Selam Tadesse is a physician-turned-entrepreneur who spent 12 years in public health across East Africa before co-founding YeneHealth. She holds an MD from Addis Ababa University and an MPH from Johns Hopkins Bloomberg School of Public Health. Her work on maternal mortality reduction in rural Ethiopia earned recognition from the WHO African Region office.',
          education: 'MD, Addis Ababa University · MPH, Johns Hopkins University',
          experience: [
            'Former Director of Community Health, Ministry of Health Ethiopia',
            '12 years clinical & public health practice across East Africa',
            'WHO consultant on digital health strategy for LMICs',
            'Published researcher on maternal health in sub-Saharan Africa',
          ],
          achievements: [
            'Forbes Africa 30 Under 30 — Healthcare (2024)',
            'Ethiopian Health Innovation Award — Founder of the Year',
            'Speaker at TEDxAddis on healthcare equity',
            'Led YeneHealth from idea to 120K+ users in 4 years',
          ],
          linkedin: 'https://linkedin.com/in/selam-tadesse',
          email: 'selam@yenehealth.com',
        },
        {
          name: 'Daniel Mekonnen',
          role: 'CTO & Co-Founder',
          photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
          bio: 'Daniel Mekonnen is a former Google engineer who left Silicon Valley to build health infrastructure for emerging markets. He architected YeneHealth\'s offline-first platform that works in areas with intermittent connectivity — a technical challenge that stumped many global health tech companies.',
          education: 'MSc Computer Science, Stanford University · BSc, Addis Ababa Institute of Technology',
          experience: [
            'Software Engineer at Google (Healthcare AI team)',
            'Built scalable systems serving 50M+ users',
            'Open source contributor — FHIR healthcare standards',
            'Technical advisor to 3 African health startups',
          ],
          achievements: [
            'Architected platform handling 2M+ health records',
            'Google Developer Expert — Cloud Healthcare',
            'Built Ethiopia\'s first offline-first telemedicine stack',
          ],
          linkedin: 'https://linkedin.com/in/daniel-mekonnen',
          email: 'daniel@yenehealth.com',
        },
        {
          name: 'Hanna Bekele',
          role: 'Head of Product',
          photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&h=400&fit=crop&crop=face',
          bio: 'Hanna Bekele leads product design at YeneHealth with a focus on human-centered design for low-literacy and low-connectivity environments. She pioneered the app\'s icon-based navigation system used by CHWs in rural areas where text-heavy interfaces fail.',
          education: 'MA Design, Rhode Island School of Design · BA, Addis Ababa University',
          experience: [
            'Senior Product Designer at Babylon Health',
            'UX lead for UNICEF Ethiopia digital health initiatives',
            'Design systems architect for multilingual health apps',
          ],
          achievements: [
            'Red Dot Design Award — Digital Health UX (2025)',
            'Designed interface used by 40,000+ community health workers',
            '3 patents pending on adaptive health UI for low-literacy users',
          ],
          linkedin: 'https://linkedin.com/in/hanna-bekele',
          email: 'hanna@yenehealth.com',
        },
      ],
    },
    relatedSlugs: ['selam-therapy-breaking-mental-health-stigma', 'nutriethiopia-teff-superfood-revolution'],
  },
  {
    id: '2',
    slug: 'selam-therapy-breaking-mental-health-stigma',
    title: 'Selam Therapy Center: Breaking Mental Health Stigma in Ethiopia',
    excerpt:
      'How one Addis Ababa clinic is changing the conversation around mental wellness with culturally-sensitive therapy and community outreach programs.',
    category: 'Community',
    categoryColor: 'bg-violet-50 text-violet-700',
    date: 'May 28, 2026',
    readTime: '6 min read',
    author: 'Abay Wellness Editorial',
    coverGradient: 'from-violet-600 via-purple-500 to-fuchsia-400',
    content: [
      'Mental health remains one of Ethiopia\'s most underserved health domains. With fewer than 50 psychiatrists serving a population of 120 million, most Ethiopians experiencing anxiety, depression, or trauma have nowhere to turn. Selam Therapy Center was founded in 2018 to change that narrative.',
      'Dr. Amina Yusuf, the center\'s Clinical Director, designed Selam\'s approach around cultural sensitivity. "Western therapy models don\'t always translate," she explains. "We integrate Ethiopian concepts of community, spirituality, and family support into evidence-based therapeutic frameworks."',
      'The center offers individual therapy, group counseling, crisis intervention, and specialized youth programs. Their anonymous crisis hotline — the first of its kind in Ethiopia — has received over 15,000 calls since 2020, with trained counselors available 24/7 in Amharic and English.',
      'Selam\'s corporate wellness programs have partnered with 12 Addis Ababa companies to provide employee mental health support, recognizing that workplace stress is a growing concern in Ethiopia\'s rapidly urbanizing economy.',
    ],
    highlights: [
      '15,000+ crisis hotline calls handled since 2020',
      'First anonymous mental health hotline in Ethiopia',
      '12 corporate wellness partnerships in Addis Ababa',
      'Culturally-adapted therapy integrating Ethiopian values',
    ],
    platform: {
      id: 'selam-therapy',
      name: 'Selam Therapy Center',
      logo: 'ST',
      tagline: 'Healing minds, restoring hope',
      founded: 2018,
      headquarters: 'Addis Ababa, Ethiopia',
      employees: '25–35',
      funding: 'NGO grants & self-sustaining',
      website: 'https://selamtherapy.et',
      mission: 'Break the stigma around mental health in Ethiopia through accessible, compassionate care.',
      vision: 'A nation where mental wellness is prioritized alongside physical health.',
      impact: [
        '8,000+ patients served since founding',
        '24/7 crisis hotline in Amharic and English',
        'Youth programs in 6 Addis Ababa schools',
        'Ministry of Health mental health advisory partner',
      ],
      services: ['Individual Therapy', 'Group Counseling', 'Crisis Hotline', 'Youth Programs', 'Corporate Wellness'],
      leadership: [
        {
          name: 'Dr. Amina Yusuf',
          role: 'Clinical Director & Founder',
          photo: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&h=400&fit=crop&crop=face',
          bio: 'Dr. Amina Yusuf is a licensed clinical psychologist specializing in trauma-informed care and cross-cultural therapy. She founded Selam Therapy Center after witnessing the devastating gap in mental health services during her work with refugee populations in Addis Ababa.',
          education: 'PhD Clinical Psychology, University of Cape Town · MA, Addis Ababa University',
          experience: [
            '15 years clinical psychology practice',
            'UNHCR mental health consultant for refugee camps',
            'Published author on trauma recovery in East Africa',
            'Board member, Ethiopian Psychologists Association',
          ],
          achievements: [
            'Founded Ethiopia\'s first 24/7 mental health crisis hotline',
            'UN Women Advocate for mental health equity',
            'Speaker at World Mental Health Congress 2024',
          ],
          linkedin: 'https://linkedin.com/in/amina-yusuf',
          email: 'amina@selamtherapy.et',
        },
      ],
    },
    relatedSlugs: ['yenehealth-revolutionizing-ethiopian-healthcare', 'mindful-ethiopia-meditation-movement'],
  },
  {
    id: '3',
    slug: 'nutriethiopia-teff-superfood-revolution',
    title: 'NutriEthiopia: Blending Ancient Superfoods with Modern Nutrition Science',
    excerpt:
      'Tigist Haile\'s startup is putting teff, berbere, and Ethiopian culinary heritage at the center of personalized nutrition plans for busy professionals.',
    category: 'Innovation',
    categoryColor: 'bg-amber-50 text-amber-700',
    date: 'May 20, 2026',
    readTime: '5 min read',
    author: 'Abay Wellness Editorial',
    coverGradient: 'from-amber-500 via-orange-400 to-yellow-300',
    content: [
      'When registered dietitian Tigist Haile noticed her clients abandoning Western-style meal plans in favor of traditional Ethiopian foods, she saw an opportunity. NutriEthiopia was born from a simple insight: the healthiest diet for Ethiopians is one rooted in their own culinary heritage.',
      'Teff — the tiny grain behind injera — is naturally gluten-free, high in iron, and has a low glycemic index. Berbere spice blend contains capsaicin-rich peppers with anti-inflammatory properties. NutriEthiopia\'s AI-powered meal planner builds weekly menus around these superfoods while meeting modern nutritional targets.',
      'The platform serves 3,200 active subscribers, from corporate wellness programs at Ethiopian Airlines to school nutrition initiatives in Addis Ababa public schools. Each plan is personalized based on health goals, activity level, and cultural food preferences.',
    ],
    highlights: [
      '3,200+ active personalized nutrition subscribers',
      'Partnerships with Ethiopian Airlines corporate wellness',
      'School nutrition programs in 8 Addis Ababa schools',
      'AI meal planner built around teff and Ethiopian superfoods',
    ],
    platform: {
      id: 'nutriethiopia',
      name: 'NutriEthiopia',
      logo: 'NE',
      tagline: 'Traditional wisdom meets modern nutrition science',
      founded: 2020,
      headquarters: 'Addis Ababa, Ethiopia',
      employees: '15–20',
      funding: 'Bootstrapped + angel investment',
      website: 'https://nutriethiopia.com',
      mission: 'Nourish Ethiopia through culturally-rooted, science-backed nutrition guidance.',
      vision: 'Every Ethiopian household equipped with the knowledge to eat well and live vibrantly.',
      impact: [
        '3,200+ personalized meal plans created',
        'Corporate wellness at 5 major Ethiopian companies',
        'Featured in Ethiopian Airlines in-flight magazine',
      ],
      services: ['Personalized Meal Plans', 'Nutrition Coaching', 'Corporate Wellness Programs', 'School Nutrition'],
      leadership: [
        {
          name: 'Tigist Haile',
          role: 'Founder & Lead Nutritionist',
          photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&crop=face',
          bio: 'Tigist Haile is a registered dietitian and food scientist who pioneered the integration of Ethiopian superfoods into evidence-based nutrition planning. Her research on teff\'s glycemic properties was published in the African Journal of Food Science.',
          education: 'MSc Food Science & Nutrition, Hawassa University · RD Certification, EFDA',
          experience: [
            '10 years clinical nutrition practice',
            'Former head nutritionist, Black Lion Hospital',
            'Food science researcher specializing in indigenous grains',
          ],
          achievements: [
            'Published researcher on teff nutritional properties',
            'Ethiopian Women in Business Award — Food & Health (2023)',
            'TEDxAddis speaker on food heritage and health',
          ],
          linkedin: 'https://linkedin.com/in/tigist-haile',
          email: 'tigist@nutriethiopia.com',
        },
      ],
    },
    relatedSlugs: ['yenehealth-revolutionizing-ethiopian-healthcare', 'injerafit-gamifying-fitness'],
  },
  {
    id: '4',
    slug: 'mindful-ethiopia-meditation-movement',
    title: 'Mindful Ethiopia: Ancient Contemplative Traditions Meet Modern Mindfulness',
    excerpt:
      'Ephrem Wolde is building a meditation movement that honors Ethiopia\'s spiritual heritage while making mindfulness accessible to students and professionals.',
    category: 'Wellness',
    categoryColor: 'bg-blue-50 text-blue-700',
    date: 'May 12, 2026',
    readTime: '4 min read',
    author: 'Abay Wellness Editorial',
    coverGradient: 'from-indigo-600 via-blue-500 to-sky-400',
    content: [
      'Mindful Ethiopia started in 2022 when meditation teacher Ephrem Wolde noticed a growing appetite for stress management tools among Addis Ababa\'s young professionals — but a resistance to practices that felt foreign or disconnected from Ethiopian culture.',
      'His solution: blend Orthodox Christian contemplative traditions, Sufi dhikr practices, and secular mindfulness into accessible programs. The guided meditation app has 18,000 downloads, with sessions available in Amharic.',
      'Corporate mindfulness workshops have been delivered to teams at Ethio Telecom, Commercial Bank of Ethiopia, and several tech startups. University programs at AAU and St. Mary\'s have introduced thousands of students to daily mindfulness habits.',
    ],
    highlights: [
      '18,000+ app downloads with Amharic meditation sessions',
      'Corporate workshops at Ethio Telecom and CBE',
      'University programs at AAU and St. Mary\'s',
      'Blends Ethiopian spiritual traditions with secular mindfulness',
    ],
    platform: {
      id: 'mindful-ethiopia',
      name: 'Mindful Ethiopia',
      logo: 'ME',
      tagline: 'Meditation for the modern Ethiopian',
      founded: 2022,
      headquarters: 'Addis Ababa, Ethiopia',
      employees: '8–12',
      funding: 'Grants & app revenue',
      website: 'https://mindfulethiopia.org',
      mission: 'Cultivate inner peace and mental resilience across Ethiopian society.',
      vision: 'A mindful nation where calm minds create thriving communities.',
      impact: [
        '18,000+ app downloads',
        'Corporate programs at 6 major companies',
        'Free university workshops reaching 2,000+ students',
      ],
      services: ['Guided Meditation App', 'Corporate Mindfulness', 'Retreat Programs', 'Mindfulness for Students'],
      leadership: [
        {
          name: 'Ephrem Wolde',
          role: 'Founder & Lead Teacher',
          photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&h=400&fit=crop&crop=face',
          bio: 'Ephrem Wolde is a meditation teacher who spent 8 years training in monasteries across Ethiopia and India before founding Mindful Ethiopia. He uniquely bridges contemplative traditions with evidence-based stress reduction techniques.',
          education: 'MA Theology, Holy Trinity Theological College · Mindfulness Certification, Oxford Mindfulness Centre',
          experience: [
            '8 years monastic meditation training',
            'Certified MBSR (Mindfulness-Based Stress Reduction) instructor',
            'Corporate wellness facilitator for 6 major Ethiopian companies',
          ],
          achievements: [
            'Built Ethiopia\'s most-downloaded wellness meditation app',
            'Featured speaker at Africa Wellness Summit 2025',
          ],
          linkedin: 'https://linkedin.com/in/ephrem-wolde',
          email: 'ephrem@mindfulethiopia.org',
        },
      ],
    },
    relatedSlugs: ['selam-therapy-breaking-mental-health-stigma'],
  },
  {
    id: '5',
    slug: 'injerafit-gamifying-fitness',
    title: 'InjeraFit: The Fitness App Gamifying Ethiopian Culture',
    excerpt:
      'Yonas Kebede\'s startup turned traditional Ethiopian movement into viral fitness challenges — and East Africa is paying attention.',
    category: 'Health Tech',
    categoryColor: 'bg-rose-50 text-rose-700',
    date: 'Apr 30, 2026',
    readTime: '5 min read',
    author: 'Abay Wellness Editorial',
    coverGradient: 'from-pink-600 via-rose-500 to-red-400',
    content: [
      'InjeraFit launched in 2023 with a simple premise: fitness should be fun, social, and culturally rooted. CEO Yonas Kebede built an app that turns traditional Ethiopian dances, eskista movements, and daily activities into gamified workout challenges.',
      'The app has 28,000 active users, with viral challenges like the "Injera Flip Challenge" and "Buna Run" (coffee ceremony cardio) spreading across TikTok and Instagram. Wearable integration tracks steps, heart rate, and calories while celebrating milestones with Ethiopian-themed badges.',
      'InjeraFit recently closed a pre-seed round and is expanding to Kenya and Rwanda, proving that culturally-specific fitness apps can compete with global giants like Nike Training Club.',
    ],
    highlights: [
      '28,000+ active users across Ethiopia',
      'Viral TikTok challenges with millions of views',
      'Pre-seed funding closed — expanding to Kenya and Rwanda',
      'Culturally-themed workout programs and wearable integration',
    ],
    platform: {
      id: 'injerafit',
      name: 'InjeraFit',
      logo: 'IF',
      tagline: 'Fitness fueled by Ethiopian culture',
      founded: 2023,
      headquarters: 'Addis Ababa, Ethiopia',
      employees: '10–15',
      funding: 'Pre-seed — $500K (2025)',
      website: 'https://injerafit.app',
      mission: 'Make fitness fun and culturally relevant for young Ethiopians.',
      vision: 'The #1 fitness app in East Africa, powered by community and culture.',
      impact: [
        '28,000+ active monthly users',
        '4M+ TikTok challenge views',
        'Expanding to Kenya and Rwanda in 2026',
      ],
      services: ['Fitness App', 'Virtual Challenges', 'Cultural Workout Programs', 'Wearable Integration'],
      leadership: [
        {
          name: 'Yonas Kebede',
          role: 'CEO & Founder',
          photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&h=400&fit=crop&crop=face',
          bio: 'Yonas Kebede is a tech entrepreneur and former national athletics team member who combined his passion for fitness and technology to create InjeraFit. He previously co-founded a logistics startup acquired in 2021.',
          education: 'BSc Computer Science, Addis Ababa Institute of Technology',
          experience: [
            'Former national athletics team member',
            'Co-founder of LogiEthiopia (acquired 2021)',
            'Product manager at Ride Technologies',
          ],
          achievements: [
            'Built app to 28K users in 18 months',
            'East Africa Startup of the Year nominee (2025)',
            'Featured in TechCrunch Africa',
          ],
          linkedin: 'https://linkedin.com/in/yonas-kebede',
          email: 'yonas@injerafit.app',
        },
      ],
    },
    relatedSlugs: ['nutriethiopia-teff-superfood-revolution'],
  },
]

export function getArticleBySlug(slug: string): NewsArticle | undefined {
  return newsArticles.find((a) => a.slug === slug)
}
