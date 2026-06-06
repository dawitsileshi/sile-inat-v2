import { useState } from 'react'
import { motion } from 'framer-motion'
import { Newspaper } from 'lucide-react'
import { newsArticles } from '@/data/news'
import { NewsCard } from '@/components/news/NewsCard'
import { cn } from '@/lib/utils'

const filters = ['All', 'Platform Spotlight', 'Health Tech', 'Community', 'Innovation', 'Wellness'] as const

export function NewsPage() {
  const [activeFilter, setActiveFilter] = useState<string>('All')

  const filtered = activeFilter === 'All'
    ? newsArticles
    : newsArticles.filter((a) => a.category === activeFilter)

  const featured = newsArticles[0]

  return (
    <div className="px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10"
        >
          <div className="mb-3 flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-brand" />
            <span className="text-sm font-medium text-brand">News & Blogs</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary">Wellness Stories & Platform Spotlights</h1>
          <p className="mt-2 max-w-2xl text-base text-text-secondary">
            Deep dives into Ethiopian health startups, wellness innovators, and the leaders shaping the future of wellbeing.
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 flex flex-wrap gap-2"
        >
          {filters.map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-medium transition-all',
                activeFilter === filter
                  ? 'bg-brand text-white'
                  : 'bg-white text-text-secondary hover:bg-brand-light hover:text-brand'
              )}
            >
              {filter}
            </button>
          ))}
        </motion.div>

        {/* Featured */}
        {activeFilter === 'All' && (
          <div className="mb-10">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text-muted">Featured Story</h2>
            <div className="grid md:grid-cols-2">
              <NewsCard article={featured} featured />
            </div>
          </div>
        )}

        {/* Grid */}
        <h2 className="mb-6 text-sm font-semibold uppercase tracking-wider text-text-muted">
          {activeFilter === 'All' ? 'All Articles' : activeFilter}
          <span className="ml-2 font-normal normal-case text-text-muted">({filtered.length})</span>
        </h2>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(activeFilter === 'All' ? filtered.slice(1) : filtered).map((article, i) => (
            <NewsCard key={article.id} article={article} index={i} />
          ))}
        </div>
      </div>
    </div>
  )
}
