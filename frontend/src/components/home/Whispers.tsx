import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const QUOTES = [
  'I love my baby. I didn’t feel like a mother for weeks. Both things were true.',
  'Everyone kept saying I looked so happy. I was crying in the bathroom every morning.',
  'I didn’t know there was a name for what I was feeling. I thought I was broken.',
  'My mother-in-law said I just needed to pray more. Maybe she was right. Maybe she wasn’t. I needed somewhere to put it.',
  'The baby was healthy. Everyone said that was enough. It didn’t feel like enough.',
  'I called my sister at 3am. She didn’t answer. I wish I’d found this sooner.',
  'Forty days inside and then the world expected me to be myself again.',
]

const VISIBLE = 3
const ROTATE_MS = 6000

/**
 * Rotating wall of anonymous "whispers" from mothers.
 * Shows VISIBLE quotes at a time, shifts by 1 every ROTATE_MS.
 * Each quote fades in/out using its text as the key, so the same
 * quote stays mounted across cycles where it remains visible.
 */
export function Whispers() {
  const [start, setStart] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setStart((s) => (s + 1) % QUOTES.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const visible = Array.from({ length: VISIBLE }, (_, i) => QUOTES[(start + i) % QUOTES.length])

  return (
    <section className="bg-white px-6 pt-14 pb-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((q) => (
            <motion.p
              key={q}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 0.72, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="text-center italic text-text-secondary text-[15px] leading-relaxed"
            >
              {q}
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </section>
  )
}
