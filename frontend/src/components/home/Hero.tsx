import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import heroImage from '@/assets/hero.jpg'

export function Hero() {
  return (
    <section className="px-6 pb-16 pt-12">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-2"
        >
          <Heart className="h-3.5 w-3.5 fill-brand text-brand" />
          <span className="text-sm font-medium text-brand">A safe space for postpartum mothers</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl font-extrabold leading-[1.05] tracking-tight text-text-primary sm:text-6xl lg:text-7xl"
        >
          You are not alone in this journey
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-text-secondary sm:text-lg"
        >
          MomsHub is a supportive community designed for mothers navigating the postpartum period. Ask questions anonymously, get AI-powered guidance, track your wellness, and connect with experts.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <Link
            to="/community"
            className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-dark"
          >
            Explore the Forum
          </Link>
          <Link
            to="/ai-assistant"
            className="rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-text-primary transition-all hover:border-brand hover:bg-brand-light"
          >
            Talk to AI Assistant
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-14 overflow-hidden rounded-3xl"
        >
          <img
            src={heroImage}
            alt="A mother gently holding her newborn in soft light"
            className="h-auto w-full object-cover"
          />
        </motion.div>
      </div>
    </section>
  )
}

