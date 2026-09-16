import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

export function CounselorsPage() {
  const { t } = useTranslation()
  return (
    <div className="px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl text-center"
      >
        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
          {t('counselors.title')}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-text-secondary">
          {t('counselors.body')}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-text-secondary">
          {t('counselors.contact')}
        </p>
      </motion.div>
    </div>
  )
}
