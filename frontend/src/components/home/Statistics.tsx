import { motion } from 'framer-motion'
import { TrendingUp, Users, Activity, Utensils } from 'lucide-react'
import { SectionHeading } from '@/components/ui/SectionHeading'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import { stats } from '@/data/testimonials'

const icons = [TrendingUp, Users, Activity, Utensils]

export function Statistics() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-abay-500/5 to-transparent" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          badge="Impact"
          title="Wellness that scales"
          subtitle="Real numbers from a growing movement transforming health across Ethiopia."
        />

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => {
            const Icon = icons[i]
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                whileHover={{ y: -6 }}
                className="glass group rounded-2xl p-8 text-center shadow-xl transition-shadow hover:shadow-abay-500/15"
              >
                <div className="mx-auto mb-4 inline-flex rounded-2xl bg-abay-500/10 p-3 transition-colors group-hover:bg-abay-500/20">
                  <Icon className="h-6 w-6 text-abay-600 dark:text-abay-400" />
                </div>
                <p className="text-4xl font-bold text-gradient sm:text-5xl">
                  <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                </p>
                <p className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{stat.label}</p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.description}</p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
