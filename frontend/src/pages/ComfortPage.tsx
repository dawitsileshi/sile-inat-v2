import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Pause, Play, ExternalLink } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// Link labels live under comfort.links.<key> in the locale files.
// TODO: Replace with curated playlist URLs
const ORTHODOX_LINKS = [
  {
    key: 'mezmurPeace',
    href: 'https://www.youtube.com/results?search_query=ethiopian+orthodox+mezmur+peace',
  },
  {
    key: 'mahletMorning',
    href: 'https://www.youtube.com/results?search_query=mahlet+ethiopian+orthodox+morning',
  },
  {
    key: 'kidasie',
    href: 'https://www.youtube.com/results?search_query=ethiopian+orthodox+kidasie',
  },
  {
    key: 'tsomeDildiy',
    href: 'https://www.youtube.com/results?search_query=tsome+dildiy+mezmur',
  },
]

// TODO: Replace with curated playlist URLs
const MUSLIM_LINKS = [
  {
    key: 'nasheedMothers',
    href: 'https://www.youtube.com/results?search_query=nasheed+for+mothers+peaceful',
  },
  {
    key: 'quranPeace',
    href: 'https://www.youtube.com/results?search_query=quran+recitation+peace+calm',
  },
  {
    key: 'islamicLullabies',
    href: 'https://www.youtube.com/results?search_query=islamic+lullabies+nasheed',
  },
  {
    key: 'ruqyah',
    href: 'https://www.youtube.com/results?search_query=ruqyah+anxiety+peace',
  },
]

// Passage text lives under comfort.passages.<key>.
const PASSAGES = ['tooHeavy', 'notYourself', 'slowLove']

type BreathPhase = 'in' | 'hold' | 'out'

const PHASE_DURATION_MS = 4000

const NEXT_PHASE: Record<BreathPhase, BreathPhase> = {
  in: 'hold',
  hold: 'out',
  out: 'in',
}

function BreathingExercise() {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<BreathPhase>('in')
  const { t } = useTranslation()

  useEffect(() => {
    if (!running) return
    const id = setTimeout(() => setPhase((p) => NEXT_PHASE[p]), PHASE_DURATION_MS)
    return () => clearTimeout(id)
  }, [running, phase])

  function toggle() {
    setRunning((r) => {
      const next = !r
      if (next) setPhase('in')
      return next
    })
  }

  const scale = running
    ? phase === 'in'
      ? 1
      : phase === 'hold'
        ? 1
        : 0.6
    : 0.78

  return (
    <div className="flex flex-col items-center">
      <div className="relative flex h-72 w-72 items-center justify-center">
        <motion.div
          animate={{ scale }}
          initial={false}
          transition={{
            duration: running && phase !== 'hold' ? PHASE_DURATION_MS / 1000 : 0.6,
            ease: 'easeInOut',
          }}
          className="absolute h-64 w-64 rounded-full bg-brand/15"
        />
        <motion.div
          animate={{ scale: scale * 0.78 }}
          initial={false}
          transition={{
            duration: running && phase !== 'hold' ? PHASE_DURATION_MS / 1000 : 0.6,
            ease: 'easeInOut',
          }}
          className="absolute h-44 w-44 rounded-full bg-brand/25"
        />
        <span className="relative text-base font-medium tracking-wide text-brand">
          {running ? t(`comfort.breath.${phase}`) : t('comfort.breath.ready')}
        </span>
      </div>

      <button
        type="button"
        onClick={toggle}
        className={cn(
          'mt-8 inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold transition-colors',
          running
            ? 'bg-white text-brand border border-brand/30 hover:bg-brand-light'
            : 'bg-brand text-white hover:bg-brand-dark'
        )}
        aria-pressed={running}
      >
        {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        {running ? t('comfort.breath.pause') : t('comfort.breath.begin')}
      </button>
    </div>
  )
}

function LinkList({ links }: { links: { key: string; href: string }[] }) {
  const { t } = useTranslation()
  return (
    <ul className="mt-4 grid gap-2 sm:grid-cols-2">
      {links.map((l) => (
        <li key={l.href}>
          <a
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 text-sm text-text-primary transition-colors hover:border-brand/40 hover:bg-brand-light/40"
          >
            <span>{t(`comfort.links.${l.key}`)}</span>
            <ExternalLink className="h-4 w-4 text-text-muted" />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function ComfortPage() {
  const { t } = useTranslation()
  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">{t('comfort.title')}</h1>
          <p className="mt-3 text-base text-text-secondary">{t('comfort.subtitle')}</p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-stone-50 px-6 py-10 card-shadow-sm"
        >
          <BreathingExercise />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10"
        >
          <h2 className="text-xl font-bold text-text-primary">{t('comfort.orthodoxTitle')}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t('comfort.orthodoxBody')}
          </p>
          <LinkList links={ORTHODOX_LINKS} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-10"
        >
          <h2 className="text-xl font-bold text-text-primary">{t('comfort.muslimTitle')}</h2>
          <p className="mt-2 text-sm text-text-secondary">
            {t('comfort.muslimBody')}
          </p>
          <LinkList links={MUSLIM_LINKS} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          <h2 className="text-xl font-bold text-text-primary text-center">{t('comfort.wordsTitle')}</h2>
          <div className="mt-6 space-y-6">
            {PASSAGES.map((p) => (
              <article
                key={p}
                className="mx-auto max-w-[600px] rounded-2xl bg-stone-50 px-7 py-8 text-center card-shadow-sm"
              >
                <p className="text-sm italic text-text-muted">{t(`comfort.passages.${p}.heading`)}</p>
                <p
                  className="mt-4 text-base text-text-primary"
                  style={{
                    fontFamily:
                      'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
                    lineHeight: 1.8,
                  }}
                >
                  {t(`comfort.passages.${p}.body`)}
                </p>
              </article>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  )
}
