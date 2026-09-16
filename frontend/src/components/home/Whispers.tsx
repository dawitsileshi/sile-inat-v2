import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  const quotes = t('whispers.quotes', { returnObjects: true }) as string[]

  useEffect(() => {
    const id = setInterval(() => {
      setStart((s) => s + 1)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const visible = Array.from({ length: VISIBLE }, (_, i) => quotes[(start + i) % quotes.length])

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
