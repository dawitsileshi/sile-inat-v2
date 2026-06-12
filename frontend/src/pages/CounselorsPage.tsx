import { motion } from 'framer-motion'

export function CounselorsPage() {
  return (
    <div className="px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
          Counselor directory
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          We’re building a directory of verified maternal mental health professionals
          in Addis Ababa.
        </p>
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          If you’re a clinician interested in being listed, contact us.
        </p>
      </motion.div>
    </div>
  )
}
