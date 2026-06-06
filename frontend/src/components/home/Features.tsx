import { motion } from 'framer-motion'
import { Brain, Salad, Users, Compass, Sparkles } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { GlassCard } from '@/components/ui/GlassCard'

const features = [
  {
    icon: Brain,
    title: 'Mental Wellness',
    description: 'AI-guided therapy support, mood tracking, and culturally-sensitive mental health resources designed for Ethiopian communities.',
    gradient: 'from-violet-500 to-purple-600',
    glow: 'group-hover:shadow-violet-500/20',
  },
  {
    icon: Salad,
    title: 'Nutrition Intelligence',
    description: 'Personalized meal plans blending Ethiopian superfoods like teff and berbere with modern nutrition science.',
    gradient: 'from-emerald-500 to-teal-600',
    glow: 'group-hover:shadow-emerald-500/20',
  },
  {
    icon: Users,
    title: 'Community Support',
    description: 'Safe spaces for students, women, fitness enthusiasts, and anonymous support — because healing happens together.',
    gradient: 'from-blue-500 to-indigo-600',
    glow: 'group-hover:shadow-blue-500/20',
  },
  {
    icon: Compass,
    title: 'Wellness Discovery',
    description: 'Explore Ethiopian health startups, wellness centers, gyms, and initiatives — from YeneHealth to local spas.',
    gradient: 'from-amber-500 to-orange-500',
    glow: 'group-hover:shadow-amber-500/20',
  },
  {
    icon: Sparkles,
    title: 'AI Personalization',
    description: 'Your wellness journey adapts to you — learning your habits, preferences, and goals for truly personalized care.',
    gradient: 'from-rose-500 to-pink-600',
    glow: 'group-hover:shadow-rose-500/20',
  },
]

export function Features() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Platform Features"
          title="Everything you need to thrive"
          subtitle="A complete wellness ecosystem — from your mind to your plate, from solo journeys to community connections."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <GlassCard
              key={feature.title}
              delay={i * 0.1}
              className={`group ${i === 4 ? 'sm:col-span-2 lg:col-span-1' : ''}`}
            >
              <motion.div
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.5 }}
                className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br ${feature.gradient} p-3.5 shadow-lg ${feature.glow}`}
              >
                <feature.icon className="h-6 w-6 text-white" />
              </motion.div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  )
}
