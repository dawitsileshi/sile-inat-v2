import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Clock, ArrowRight } from 'lucide-react'
import type { NewsArticle } from '@/data/news'
import { cn } from '@/lib/utils'

interface NewsCardProps {
  article: NewsArticle
  index?: number
  featured?: boolean
}

export function NewsCard({ article, index = 0, featured = false }: NewsCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -4 }}
      className={cn(featured && 'md:col-span-2')}
    >
      <Link
        to={`/news/${article.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white card-shadow transition-shadow hover:card-shadow"
      >
        <div className={cn('relative h-44 bg-gradient-to-br sm:h-52', article.coverGradient, featured && 'sm:h-56')}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="absolute left-5 top-5">
            <span className={cn('rounded-full px-3 py-1 text-xs font-medium', article.categoryColor)}>
              {article.category}
            </span>
          </div>
          <div className="absolute bottom-4 left-5 flex h-12 w-12 items-center justify-center rounded-xl bg-white/90 text-sm font-bold text-brand backdrop-blur-sm">
            {article.platform.logo}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-6">
          <div className="mb-3 flex items-center gap-3 text-xs text-text-muted">
            <span>{article.date}</span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {article.readTime}
            </span>
          </div>

          <h2 className={cn(
            'font-bold leading-snug text-text-primary transition-colors group-hover:text-brand',
            featured ? 'text-xl sm:text-2xl' : 'text-lg'
          )}>
            {article.title}
          </h2>

          <p className="mt-2 flex-1 text-sm leading-relaxed text-text-secondary line-clamp-3">
            {article.excerpt}
          </p>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs font-medium text-brand">{article.platform.name}</span>
            <span className="flex items-center gap-1 text-xs font-medium text-brand opacity-0 transition-opacity group-hover:opacity-100">
              Read more
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  )
}
