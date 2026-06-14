import { motion } from 'framer-motion'
import { Shield, Users, Stethoscope } from 'lucide-react'

const values = [
  {
    icon: Shield,
    title: 'Safe & Private',
    description: 'Your identity is protected. Share openly and honestly.',
  },
  {
    icon: Users,
    title: 'Community First',
    description: 'Real mothers supporting each other through every challenge.',
  },
  {
    icon: Stethoscope,
    title: 'Evidence-Based',
    description: 'Trusted guidance grounded in medical best practices.',
  },
]

export function HomeStats() {
  return (
    <section className="border-y border-black/[0.04] bg-stone-100/80 px-6 py-20">
      <div className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-3">
        {values.map((v, i) => (
          <motion.div
            key={v.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.08 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-light">
              <v.icon className="h-6 w-6 text-brand" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">{v.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">{v.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
