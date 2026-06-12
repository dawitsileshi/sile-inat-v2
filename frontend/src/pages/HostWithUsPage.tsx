import { motion } from 'framer-motion'
import { ShieldCheck, Mail } from 'lucide-react'

export function HostWithUsPage() {
  return (
    <div className="px-6 py-16">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl"
      >
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-light px-4 py-1.5 text-xs font-medium text-brand">
          <ShieldCheck className="h-3.5 w-3.5" />
          For clinicians and community partners
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
          Host with us
        </h1>
        <p className="mt-3 text-base leading-relaxed text-text-secondary">
          ስለ እናት partners with vetted clinicians, doulas, midwives, and community
          organizations to hold space for new mothers in Ethiopia. Every event on
          this platform is reviewed by our team before it goes live.
        </p>

        <div className="mt-10 space-y-6">
          <section>
            <h2 className="text-base font-semibold text-text-primary">
              Who we list
            </h2>
            <ul className="mt-2 space-y-2 text-sm leading-relaxed text-text-secondary">
              <li>· Licensed clinicians: OBGYNs, lactation consultants, psychologists, counselors.</li>
              <li>· Community facilitators with experience holding mother groups.</li>
              <li>· Partner organizations like Amanuel Hospital and accredited maternal clinics.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary">
              How vetting works
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              We verify credentials, talk to two prior clients, and review your
              session format before listing your first event. Hosts agree to our
              code of conduct around anonymity, cultural sensitivity, and
              non-clinical framing in any peer-support contexts.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-text-primary">
              Interested?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-secondary">
              Email us a short note about your work and a few proposed event ideas.
              We respond within a week.
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
