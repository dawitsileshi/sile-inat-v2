import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MessageCircle, Users, Wind } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Whispers } from '@/components/home/Whispers'

interface PathCard {
  to: string
  titleKey: string
  subtitleKey: string
  fallbackTitle: string
  fallbackSubtitle: string
  Icon: typeof MessageCircle
}

const PATHS: PathCard[] = [
  {
    to: '/ai-assistant',
    titleKey: 'home.paths.talk.title',
    subtitleKey: 'home.paths.talk.subtitle',
    fallbackTitle: 'Talk to someone',
    fallbackSubtitle: 'Ask anything. No judgment. Anonymous.',
    Icon: MessageCircle,
  },
  {
    to: '/circles',
    titleKey: 'home.paths.circles.title',
    subtitleKey: 'home.paths.circles.subtitle',
    fallbackTitle: 'Find mothers like me',
    fallbackSubtitle: 'Small groups of women in the same moment.',
    Icon: Users,
  },
  {
    to: '/comfort',
    titleKey: 'home.paths.comfort.title',
    subtitleKey: 'home.paths.comfort.subtitle',
    fallbackTitle: 'A quiet moment',
    fallbackSubtitle: 'Breathing, music, and words that ground.',
    Icon: Wind,
  },
]

export function HomePage() {
  const { t } = useTranslation()

  return (
    <>
      {/* Section 1 — Whispers (above the hero) */}
      <Whispers />

      {/* Section 2 — Hero */}
      <section className="px-6 pt-8 pb-20">
        <div className="mx-auto max-w-2xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-4xl sm:text-5xl font-extrabold leading-[1.1] tracking-tight text-text-primary"
          >
            {t('home.hero.headline', "For the things you'd only Google at 3am.")}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
            className="mx-auto mt-5 max-w-lg text-base sm:text-lg leading-relaxed text-text-secondary"
          >
            {t(
              'home.hero.subheadline',
              "A quiet, anonymous place for new mothers. Ask what you can't ask anyone else.",
            )}
          </motion.p>
        </div>
      </section>

      {/* Section 3 — Three paths */}
      <section className="px-6 pb-20">
        <div className="mx-auto max-w-4xl">
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center text-xl sm:text-2xl font-semibold text-text-primary"
          >
            {t('home.paths.prompt', 'What do you need right now?')}
          </motion.h2>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {PATHS.map((p, i) => (
              <motion.div
                key={p.to}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <Link
                  to={p.to}
                  className="group block h-full rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(20,30,15,0.04)] ring-1 ring-black/[0.04] transition-all duration-200 hover:shadow-[0_4px_18px_rgba(26,122,61,0.08)] hover:ring-brand/20"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                    <p.Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold text-text-primary">
                    {t(p.titleKey, p.fallbackTitle)}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                    {t(p.subtitleKey, p.fallbackSubtitle)}
                  </p>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — Quiet stat */}
      <section className="px-6 pb-24">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.0 }}
          className="mx-auto max-w-xl text-center text-sm leading-relaxed text-text-muted"
        >
          {t(
            'home.stat',
            '1 in 3 Ethiopian mothers experience postpartum depression. Most never talk about it. You found this place.',
          )}
        </motion.p>
      </section>
    </>
  )
}
