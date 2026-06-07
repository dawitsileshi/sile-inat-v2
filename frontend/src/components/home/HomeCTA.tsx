import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

export function HomeCTA() {
  return (
    <section className="px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mx-auto max-w-3xl rounded-3xl bg-brand-light px-8 py-14 text-center sm:px-12"
      >
        <h2 className="text-3xl font-extrabold tracking-tight text-text-primary sm:text-4xl">
          Ready to find your village?
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base text-text-secondary">
          Join thousands of mothers who are navigating the postpartum journey together.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/community"
            className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-dark"
          >
            Join us
          </Link>
          <Link
            to="/events"
            className="rounded-full border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-text-primary transition-all hover:border-brand"
          >
            Browse Events
          </Link>
        </div>
      </motion.div>
    </section>
  )
}
