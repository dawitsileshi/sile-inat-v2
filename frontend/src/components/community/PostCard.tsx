import { motion } from 'framer-motion'
import { Heart, MessageCircle, Share2, TrendingUp, Eye } from 'lucide-react'
import type { CommunityPost } from '@/data/community'
import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'

interface PostCardProps {
  post: CommunityPost
  index?: number
}

export function PostCard({ post, index = 0 }: PostCardProps) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      whileHover={{ y: -2 }}
      className="glass group rounded-2xl p-6 shadow-lg transition-all hover:shadow-xl hover:shadow-abay-500/5"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white',
              post.anonymous ? 'bg-gray-500' : 'bg-gradient-to-br from-abay-400 to-abay-600'
            )}
          >
            {post.anonymous ? <Eye className="h-4 w-4" /> : post.avatar}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {post.anonymous ? 'Anonymous' : post.author}
            </p>
            <div className="flex items-center gap-2">
              <span className={cn('inline-block h-2 w-2 rounded-full', post.groupColor)} />
              <span className="text-xs text-gray-500 dark:text-gray-400">{post.group}</span>
              <span className="text-xs text-gray-400">· {post.timeAgo}</span>
            </div>
          </div>
        </div>
        {post.trending && (
          <Badge className="flex items-center gap-1 shrink-0">
            <TrendingUp className="h-3 w-3" />
            Trending
          </Badge>
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 transition-colors group-hover:text-abay-700 dark:text-white dark:group-hover:text-abay-300">
        {post.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400 line-clamp-3">
        {post.content}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {post.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-lg bg-abay-500/8 px-2.5 py-1 text-xs font-medium text-abay-700 dark:text-abay-300"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-6 border-t border-gray-200/50 pt-4 dark:border-white/5">
        <button className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-rose-500 dark:text-gray-400">
          <Heart className="h-4 w-4" />
          {post.likes}
        </button>
        <button className="flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-abay-600 dark:text-gray-400">
          <MessageCircle className="h-4 w-4" />
          {post.comments}
        </button>
        <button className="ml-auto flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-abay-600 dark:text-gray-400">
          <Share2 className="h-4 w-4" />
          Share
        </button>
      </div>
    </motion.article>
  )
}
