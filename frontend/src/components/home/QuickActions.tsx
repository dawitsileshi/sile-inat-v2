import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { navLinks } from '@/data/navigation'

const quickLinks = navLinks.filter((l) => l.to !== '/')

export function QuickActions() {
  return (
    <section className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap justify-center gap-3">
          {quickLinks.map((link, i) => {
            const Icon = link.icon
            return (
              <motion.div
                key={link.to}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to={link.to}
                  className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-text-primary shadow-sm transition-all hover:border-brand hover:bg-brand-light hover:text-brand"
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                  <ArrowRight className="h-3.5 w-3.5 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
