import { motion } from 'framer-motion'
import { MessageCircle, Sparkles, Smile, Calendar } from 'lucide-react'

const features = [
  {
    icon: MessageCircle,
    title: 'Anonymous Forum',
    description: 'Ask questions and share experiences without judgment. Connect with mothers who understand.',
    color: 'bg-[#dff0e3] text-brand',
  },
  {
    icon: Sparkles,
    title: 'AI Assistant',
    description: 'Get evidence-based guidance on postpartum recovery, breastfeeding, sleep, and newborn care — anytime.',
    color: 'bg-[#fbeacb] text-[#c98a1f]',
  },
  {
    icon: Smile,
    title: 'Wellness Check-Ins',
    description: 'Track your mood, sleep, and energy daily. Small steps toward feeling more like yourself.',
    color: 'bg-[#fbdfdf] text-[#d96565]',
  },
  {
    icon: Calendar,
    title: 'Expert Events',
    description: 'Join live talks and workshops with lactation consultants, therapists, and pediatricians.',
    color: 'bg-[#dbe7f5] text-[#4a78b8]',
  },
]

export function HomeFeatures() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-12 text-center"
        >
          <h2 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
            Everything you need, in one place
          </h2>
          <p className="mt-3 text-base text-text-secondary">
            Built with care for every stage of your postpartum experience
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl bg-white p-6 card-shadow"
            >
              <div className={`mb-5 inline-flex rounded-xl p-3 ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-text-primary">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{f.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
