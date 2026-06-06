import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Clock, Calendar, MapPin, Users, Globe,
  Building2, DollarSign, Target, Eye, CheckCircle2,
} from 'lucide-react'
import { getArticleBySlug, newsArticles } from '@/data/news'
import { CEOCard } from '@/components/news/CEOCard'
import { NewsCard } from '@/components/news/NewsCard'
import { cn } from '@/lib/utils'

export function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const article = getArticleBySlug(slug ?? '')

  if (!article) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-6">
        <h1 className="text-2xl font-bold text-text-primary">Article not found</h1>
        <Link to="/news" className="mt-4 text-sm font-medium text-brand hover:underline">
          ← Back to News & Blogs
        </Link>
      </div>
    )
  }

  const { platform } = article
  const related = newsArticles.filter((a) => article.relatedSlugs.includes(a.slug))

  return (
    <div className="pb-16">
      {/* Hero banner */}
      <div className={cn('relative bg-gradient-to-br px-6 py-16 sm:py-20', article.coverGradient)}>
        <div className="absolute inset-0 bg-black/25" />
        <div className="relative mx-auto max-w-4xl">
          <Link
            to="/news"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to News & Blogs
          </Link>

          <span className="mb-4 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {article.category}
          </span>

          <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
            {article.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-white/80">
            <span>{article.author}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {article.date}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {article.readTime}
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6">
        {/* Article body */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-10 space-y-5"
        >
          {article.content.map((paragraph, i) => (
            <p key={i} className="text-base leading-relaxed text-text-secondary">
              {paragraph}
            </p>
          ))}
        </motion.div>

        {/* Key highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-10 rounded-3xl bg-brand-light p-8"
        >
          <h2 className="mb-4 text-lg font-bold text-text-primary">Key Highlights</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {article.highlights.map((h) => (
              <li key={h} className="flex items-start gap-2.5 text-sm text-text-secondary">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                {h}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Platform spotlight */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-12"
        >
          <h2 className="mb-6 text-2xl font-bold text-text-primary">
            About {platform.name}
          </h2>

          <div className="rounded-3xl bg-white p-8 card-shadow">
            <div className="mb-6 flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-xl font-bold text-white">
                {platform.logo}
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary">{platform.name}</h3>
                <p className="text-sm text-text-secondary">{platform.tagline}</p>
              </div>
            </div>

            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { icon: Building2, label: 'Founded', value: String(platform.founded) },
                { icon: MapPin, label: 'HQ', value: platform.headquarters },
                { icon: Users, label: 'Team', value: platform.employees },
                { icon: DollarSign, label: 'Funding', value: platform.funding },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="rounded-2xl bg-gray-50 p-4">
                  <div className="mb-1 flex items-center gap-1.5 text-xs text-text-muted">
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                  </div>
                  <p className="text-sm font-semibold text-text-primary">{value}</p>
                </div>
              ))}
            </div>

            <div className="mb-8 grid gap-6 sm:grid-cols-2">
              <div className="rounded-2xl bg-brand-light p-5">
                <div className="mb-2 flex items-center gap-2 font-semibold text-text-primary">
                  <Target className="h-4 w-4 text-brand" />
                  Mission
                </div>
                <p className="text-sm leading-relaxed text-text-secondary">{platform.mission}</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 p-5">
                <div className="mb-2 flex items-center gap-2 font-semibold text-text-primary">
                  <Eye className="h-4 w-4 text-brand" />
                  Vision
                </div>
                <p className="text-sm leading-relaxed text-text-secondary">{platform.vision}</p>
              </div>
            </div>

            <div className="mb-8">
              <h4 className="mb-3 font-semibold text-text-primary">Impact & Milestones</h4>
              <ul className="grid gap-2 sm:grid-cols-2">
                {platform.impact.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mb-6">
              <h4 className="mb-3 font-semibold text-text-primary">Services</h4>
              <div className="flex flex-wrap gap-2">
                {platform.services.map((s) => (
                  <span key={s} className="rounded-full bg-brand-light px-3 py-1.5 text-xs font-medium text-brand">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <a
              href={platform.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-dark"
            >
              <Globe className="h-4 w-4" />
              Visit {platform.name}
            </a>
          </div>
        </motion.div>

        {/* Leadership / CEOs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12"
        >
          <h2 className="mb-2 text-2xl font-bold text-text-primary">Leadership Team</h2>
          <p className="mb-6 text-sm text-text-secondary">
            Meet the founders and executives driving {platform.name} forward.
          </p>

          <div className="space-y-6">
            {platform.leadership.map((leader, i) => (
              <CEOCard key={leader.name} leader={leader} index={i} expanded />
            ))}
          </div>
        </motion.div>

        {/* Related articles */}
        {related.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-16"
          >
            <h2 className="mb-6 text-xl font-bold text-text-primary">Related Stories</h2>
            <div className="grid gap-6 md:grid-cols-2">
              {related.map((a, i) => (
                <NewsCard key={a.id} article={a} index={i} />
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
