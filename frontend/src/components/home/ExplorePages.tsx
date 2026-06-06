import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { navLinks } from '@/data/navigation'

const exploreLinks = navLinks.filter((link) => link.to !== '/')

export function ExplorePages() {
  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 text-center"
        >
          <h2 className="text-2xl font-bold text-text-primary">Explore the platform</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Navigate to every section — just like the menu above
          </p>
        </motion.div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {exploreLinks.map((link, i) => {
            const Icon = link.icon
            return (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
              >
                <Link
                  to={link.to}
                  className="group flex h-full flex-col rounded-3xl bg-white p-6 card-shadow transition-all hover:-translate-y-1 hover:card-shadow"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${link.iconBg}`}>
                      <Icon className={`h-5 w-5 ${link.color}`} />
                    </div>
                    <ArrowRight className="h-4 w-4 text-text-muted transition-all group-hover:translate-x-1 group-hover:text-brand" />
                  </div>

                  <h3 className="text-base font-bold text-text-primary group-hover:text-brand">
                    {link.label}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-brand">{link.description}</p>
                  <p className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
                    {link.preview}
                  </p>

                  <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                    Go to {link.label}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
