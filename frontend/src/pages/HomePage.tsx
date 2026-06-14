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

// ─── Hero photo ───────────────────────────────────────────────────────────────
//
// Drop your chosen Ethiopian-mother portrait at
//   frontend/public/hero/mother.jpg
// and it will render here automatically. Until you do, the layout falls
// back to a soft brand-tinted placeholder block at the same dimensions
// so the rest of the hero never collapses.
//
// Recommended photo brief:
//   - Real Ethiopian woman, post-delivery age (20s-30s).
//   - Soft natural light, ideally indoor / window light.
//   - Looking off-camera or down, not posed.
//   - No medical setting. No baby visible if possible (we sell *her*
//     experience, not her baby's wellbeing).
//   - Portrait orientation, ~1200x1600px minimum.
//   - Royalty-free from Pexels / Unsplash / iStock until commissioned.
const HERO_IMAGE_SRC = '/hero/mother.jpg'

export function HomePage() {
  const { t } = useTranslation()

  return (
    <>
      {/* Section 1 — Whispers (above the hero) */}
      <Whispers />

      {/* Section 2 — Hero. Photo on the right, words on the left.
          On mobile, stacked: photo first, then words. */}
      <section className="px-6 pt-8 pb-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          {/* Words */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="order-2 lg:order-1"
          >
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-[3.5rem] font-semibold leading-[1.05] tracking-tight text-text-primary">
              {t('home.hero.headline', "For the things you'd only Google at 3am.")}
            </h1>
            <p className="mt-6 max-w-lg font-sans text-base sm:text-lg leading-relaxed text-text-secondary">
              {t(
                'home.hero.subheadline',
                "A quiet, anonymous place for new mothers. Ask what you can't ask anyone else.",
              )}
            </p>
            {/* Editorial accent: a slim warm rule beneath the subhead. Tiny
                detail, big magazine-feel payoff. */}
            <div className="mt-8 h-px w-16 bg-warm" />
          </motion.div>

          {/* Photo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: 'easeOut', delay: 0.15 }}
            className="order-1 lg:order-2"
          >
            <div className="relative mx-auto aspect-[4/5] w-full max-w-md overflow-hidden rounded-[28px] bg-brand-light/60">
              <img
                src={HERO_IMAGE_SRC}
                alt=""
                className="h-full w-full object-cover"
                onError={(e) => {
                  // Hide the broken-image icon if the file isn't there yet;
                  // the brand-tinted background remains as the placeholder.
                  (e.currentTarget as HTMLImageElement).style.display = 'none'
                }}
              />
              {/* Subtle vignette to keep the photo feeling editorial, not stock. */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'radial-gradient(120% 80% at 50% 0%, transparent 55%, rgba(122, 22, 64, 0.18) 100%)',
                }}
              />
            </div>
          </motion.div>
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
            className="font-serif text-center text-2xl sm:text-3xl font-medium text-text-primary"
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
                  className="group block h-full rounded-xl bg-white p-6 shadow-[0_1px_2px_rgba(20,30,15,0.04)] ring-1 ring-black/[0.04] transition-all duration-200 hover:shadow-[0_4px_18px_rgba(158,31,83,0.10)] hover:ring-brand/20"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-light text-brand transition-colors group-hover:bg-brand group-hover:text-white">
                    <p.Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-serif mt-5 text-xl font-medium text-text-primary">
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
          className="mx-auto max-w-xl text-center font-serif text-base italic leading-relaxed text-text-muted"
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
