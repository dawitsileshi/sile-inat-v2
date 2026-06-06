import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { ArrowRight, Users, Globe } from 'lucide-react'
import { newsArticles } from '@/data/news'

export function FeaturedStory() {
  const article = newsArticles[0]
  const ceo = article.platform.leadership[0]

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-8"
        >
          <span className="text-sm font-medium text-brand">Platform Spotlight</span>
          <h2 className="mt-1 text-2xl font-bold text-text-primary">Featured in the news</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-3xl bg-white card-shadow"
        >
          <div className="grid md:grid-cols-2">
            <div className="relative bg-gradient-to-br from-emerald-600 via-teal-500 to-cyan-400 p-8">
              <div className="absolute inset-0 bg-black/10" />
              <div className="relative">
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
                  {article.category}
                </span>
                <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white backdrop-blur-sm">
                  {article.platform.logo}
                </div>
                <h3 className="mt-4 text-xl font-bold text-white">{article.platform.name}</h3>
                <p className="mt-1 text-sm text-white/80">{article.platform.tagline}</p>

                <div className="mt-6 flex gap-4 text-xs text-white/70">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {article.platform.employees} team
                  </span>
                  <span className="flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    Est. {article.platform.founded}
                  </span>
                </div>

                {/* CEO mini card */}
                <div className="mt-6 flex items-center gap-3 rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
                  <img
                    src={ceo.photo}
                    alt={ceo.name}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white/30"
                  />
                  <div>
                    <p className="text-sm font-semibold text-white">{ceo.name}</p>
                    <p className="text-xs text-white/70">{ceo.role}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center p-8">
              <h3 className="text-lg font-bold leading-snug text-text-primary">
                {article.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                {article.excerpt}
              </p>
              <Link
                to={`/news/${article.slug}`}
                className="mt-6 inline-flex items-center gap-2 self-start rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-dark"
              >
                Read full story
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
