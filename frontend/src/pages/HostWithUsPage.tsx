import { motion } from 'framer-motion'
import { ShieldCheck, Mail } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function HostWithUsPage() {
  const { t } = useTranslation()
  return (
    <div className="px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1.5 text-xs font-medium text-brand">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t('host.eyebrow')}
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
          {t('host.title')}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-text-secondary">
          {t('host.intro')}
        </p>

        <div className="mt-10 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-text-primary">
              {t('host.whoTitle')}
            </h2>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-text-secondary">
              {(t('host.whoList', { returnObjects: true }) as string[]).map((item) => (
                <li key={item}>· {item}</li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary">
              {t('host.vettingTitle')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {t('host.vettingBody')}
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary">
              {t('host.interestedTitle')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              {t('host.interestedBody')}
            </p>
            <a
              href="mailto:hosts@sileinat.app"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
            >
              <Mail className="h-4 w-4" />
              hosts@sileinat.app
            </a>
            {/* TODO: Set up a real inbox for this address. */}
          </section>
        </div>
      </motion.div>
    </div>
  )
}
