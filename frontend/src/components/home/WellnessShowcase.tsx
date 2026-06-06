import { motion } from 'framer-motion'
import { Sparkles, TrendingUp, Heart, Leaf } from 'lucide-react'

export function WellnessShowcase() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay: 0.4 }}
      className="mx-auto mt-14 max-w-2xl"
    >
      <div className="overflow-hidden rounded-[32px] card-shadow">
        {/* Top gradient scene */}
        <div className="relative bg-gradient-to-br from-brand-light via-emerald-50 to-teal-50 px-8 pb-28 pt-10">
          {/* Decorative botanical shapes */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
            <svg viewBox="0 0 400 120" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
              <ellipse cx="60" cy="100" rx="50" ry="30" fill="#0d6e4f" opacity="0.15" />
              <ellipse cx="200" cy="110" rx="80" ry="35" fill="#0d6e4f" opacity="0.1" />
              <ellipse cx="340" cy="95" rx="55" ry="28" fill="#0d6e4f" opacity="0.12" />
              <path d="M30 120 Q80 60 130 120" fill="none" stroke="#0d6e4f" strokeWidth="2" opacity="0.2" />
              <path d="M270 120 Q320 50 370 120" fill="none" stroke="#0d6e4f" strokeWidth="2" opacity="0.2" />
            </svg>
          </div>

          {/* Floating wellness icons */}
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute left-8 top-8 rounded-2xl bg-white/80 p-3 card-shadow-sm backdrop-blur-sm"
          >
            <Heart className="h-5 w-5 fill-brand text-brand" />
          </motion.div>
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
            className="absolute right-10 top-12 rounded-2xl bg-white/80 p-3 card-shadow-sm backdrop-blur-sm"
          >
            <Leaf className="h-5 w-5 text-brand" />
          </motion.div>

          {/* Center wellness ring */}
          <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#d4ebe0" strokeWidth="6" />
              <circle
                cx="50" cy="50" r="42" fill="none" stroke="#0d6e4f" strokeWidth="6"
                strokeDasharray="264" strokeDashoffset="40" strokeLinecap="round"
              />
            </svg>
            <div className="text-center">
              <p className="text-3xl font-bold text-brand">87</p>
              <p className="text-xs font-medium text-text-muted">Wellness Score</p>
            </div>
          </div>
        </div>

        {/* Dashboard preview card */}
        <div className="relative -mt-20 mx-6 mb-6 rounded-2xl bg-white p-5 card-shadow">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">Your Wellness Today</p>
              <p className="text-xs text-text-muted">Powered by Abay AI</p>
            </div>
            <div className="ml-auto flex items-center gap-1 rounded-full bg-brand-light px-2.5 py-1 text-xs font-medium text-brand">
              <TrendingUp className="h-3 w-3" />
              +12%
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Mood', value: 'Good', emoji: '🙂' },
              { label: 'Energy', value: 'High', emoji: '⚡' },
              { label: 'Sleep', value: '7.5h', emoji: '🌙' },
            ].map((item) => (
              <div key={item.label} className="rounded-xl bg-gray-50 px-3 py-3 text-center">
                <span className="text-lg">{item.emoji}</span>
                <p className="mt-1 text-xs font-semibold text-text-primary">{item.value}</p>
                <p className="text-[10px] text-text-muted">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl bg-brand-light px-4 py-3">
            <p className="text-xs text-brand">
              💚 "Great progress this week! Your check-in streak is 5 days. Keep it up."
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
