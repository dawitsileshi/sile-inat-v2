import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Moon } from 'lucide-react'

function getNightMessage(hour: number): string | null {
  if (hour >= 22 || hour < 5) {
    return "It's late. The forum is open. You don't have to be."
  }
  if (hour >= 5 && hour < 8) {
    return "Early morning. If you've been up with the baby, we're up with you."
  }
  return null
}

export function NightModeBanner() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const update = () => setMessage(getNightMessage(new Date().getHours()))
    update()
    const id = window.setInterval(update, 5 * 60 * 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="border-b border-brand/15 bg-brand-light/60 px-6 py-2.5"
        >
          <div className="mx-auto flex max-w-3xl items-center justify-center gap-2 text-sm text-brand-dark">
            <Moon className="h-3.5 w-3.5" />
            <span className="italic">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
