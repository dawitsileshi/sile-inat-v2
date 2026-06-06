import { motion } from 'framer-motion'
import { TrendingUp, Hash, Flame } from 'lucide-react'
import type { TrendingTopic } from '@/data/community'

interface TrendingSidebarProps {
  topics: TrendingTopic[]
}

export function TrendingSidebar({ topics }: TrendingSidebarProps) {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        className="glass rounded-2xl p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Trending Topics</h3>
        </div>
        <div className="space-y-4">
          {topics.map((topic, i) => (
            <motion.button
              key={topic.id}
              whileHover={{ x: 4 }}
              className="flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors hover:bg-abay-500/5"
            >
              <span className="mt-0.5 text-sm font-bold text-abay-500">{i + 1}</span>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{topic.title}</p>
                <p className="mt-0.5 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Hash className="h-3 w-3" />
                  {topic.category} · {topic.posts} posts
                </p>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="glass rounded-2xl p-6 shadow-lg"
      >
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-abay-500" />
          <h3 className="font-semibold text-gray-900 dark:text-white">Community Guidelines</h3>
        </div>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <li>· Be kind and respectful</li>
          <li>· No medical advice without credentials</li>
          <li>· Use anonymous mode when needed</li>
          <li>· Report harmful content</li>
        </ul>
      </motion.div>
    </div>
  )
}
