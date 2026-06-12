import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Pause, Play, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

// TODO: Replace with curated playlist URLs
const ORTHODOX_LINKS = [
  {
    label: 'Mezmur for peace of mind',
    href: 'https://www.youtube.com/results?search_query=ethiopian+orthodox+mezmur+peace',
  },
  {
    label: 'Mahlet — morning comfort',
    href: 'https://www.youtube.com/results?search_query=mahlet+ethiopian+orthodox+morning',
  },
  {
    label: 'Kidasie — gentle listening',
    href: 'https://www.youtube.com/results?search_query=ethiopian+orthodox+kidasie',
  },
  {
    label: 'Tsome Dildiy mezmur',
    href: 'https://www.youtube.com/results?search_query=tsome+dildiy+mezmur',
  },
]

// TODO: Replace with curated playlist URLs
const MUSLIM_LINKS = [
  {
    label: 'Nasheed for mothers',
    href: 'https://www.youtube.com/results?search_query=nasheed+for+mothers+peaceful',
  },
  {
    label: 'Quran recitation for peace',
    href: 'https://www.youtube.com/results?search_query=quran+recitation+peace+calm',
  },
  {
    label: 'Islamic lullabies',
    href: 'https://www.youtube.com/results?search_query=islamic+lullabies+nasheed',
  },
  {
    label: 'Ruqyah for anxiety',
    href: 'https://www.youtube.com/results?search_query=ruqyah+anxiety+peace',
  },
]

const PASSAGES = [
  {
    heading: 'On the days that feel too heavy:',
    body:
      'There is a kind of tired that sleep does not fix. Ethiopian mothers know this. ' +
      'It lives in the bones, not the eyes. If you are carrying that tired today — it does ' +
      'not mean you are failing. It means you are human, and you have been asked to do ' +
      'something enormous. Rest is not weakness. It is how you survive this.',
  },
  {
    heading: 'On not feeling like yourself:',
    body:
      'The woman you were before this baby has not disappeared. She is resting. She is watching ' +
      'you learn something she did not yet know how to do. One day — not today, maybe not ' +
      'this month — she will return, changed, but still yours. You do not have to find her ' +
      'right now. You only have to get through today.',
  },
  {
    heading: "On the love that doesn't feel like you imagined:",
    body:
      'Nobody tells you that love for a child can arrive slowly. That you can feed them, ' +
      'protect them, lose sleep for them — and still be waiting to feel what the songs ' +
      'describe. This is not a sign that something is wrong with you. It is a sign that ' +
      'you are honest. The love is coming. It builds itself quietly, in the middle of the ' +
      'night, in ways you will only recognize later.',
  },
]

type BreathPhase = 'in' | 'hold' | 'out'

const PHASE_DURATION_MS = 4000

const PHASE_LABEL: Record<BreathPhase, string> = {
  in: 'Breathe in',
  hold: 'Hold',
  out: 'Breathe out',
}

const NEXT_PHASE: Record<BreathPhase, BreathPhase> = {
  in: 'hold',
  hold: 'out',
  out: 'in',
}

function BreathingExercise() {
  const [running, setRunning] = useState(false)
  const [phase, setPhase] = useState<BreathPhase>('in')

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
          {running ? PHASE_LABEL[phase] : 'Ready when you are'}
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
        {running ? 'Pause' : 'Begin'}
      </button>
    </div>
  )
}

function LinkList({ links }: { links: { label: string; href: string }[] }) {
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
            <span>{l.label}</span>
            <ExternalLink className="h-4 w-4 text-text-muted" />
          </a>
        </li>
      ))}
    </ul>
  )
}

export function ComfortPage() {
  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-3xl">
        <motion.header
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 text-center"
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">A quiet moment</h1>
          <p className="mt-3 text-base text-text-secondary">No agenda. Just this.</p>
        </motion.header>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl bg-[#FAF7F2] px-6 py-10 card-shadow-sm"
        >
          <BreathingExercise />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10"
        >
          <h2 className="text-xl font-bold text-text-primary">For Orthodox Christian mothers</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Some mothers find Mahlet grounding during difficult moments. Choose what feels right.
          </p>
          <LinkList links={ORTHODOX_LINKS} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-10"
        >
          <h2 className="text-xl font-bold text-text-primary">For Muslim mothers</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Quiet nasheed and Quran recitation for difficult moments.
          </p>
          <LinkList links={MUSLIM_LINKS} />
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          <h2 className="text-xl font-bold text-text-primary text-center">Words that ground</h2>
          <div className="mt-6 space-y-6">
            {PASSAGES.map((p) => (
              <article
                key={p.heading}
                className="mx-auto max-w-[600px] rounded-2xl bg-[#FAF7F2] px-7 py-8 text-center card-shadow-sm"
              >
                <p className="text-sm italic text-text-muted">{p.heading}</p>
                <p
                  className="mt-4 text-base text-text-primary"
                  style={{
                    fontFamily:
                      'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif',
                    lineHeight: 1.8,
                  }}
                >
                  {p.body}
                </p>
              </article>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  )
}
