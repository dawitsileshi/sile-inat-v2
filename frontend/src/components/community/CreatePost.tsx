import { motion } from 'framer-motion'
import { PenLine, Image, BarChart2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function CreatePost() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-2xl p-6 shadow-lg"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-abay-400 to-abay-600 text-sm font-bold text-white">
          You
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Share your wellness journey..."
            className="w-full rounded-xl border border-gray-200/60 bg-white/50 px-4 py-3 text-sm transition-all placeholder:text-gray-400 focus:border-abay-500/50 focus:outline-none focus:ring-2 focus:ring-abay-500/20 dark:border-white/10 dark:bg-white/5 dark:text-white"
            aria-label="Create a post"
          />
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-2">
              {[Image, BarChart2, Eye].map((Icon, i) => (
                <button
                  key={i}
                  className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-abay-500/10 hover:text-abay-600 dark:text-gray-400"
                  aria-label="Post option"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
              <span className="flex items-center gap-1 rounded-lg px-2 text-xs text-gray-500 dark:text-gray-400">
                <Eye className="h-3.5 w-3.5" />
                Anonymous
              </span>
            </div>
            <Button size="sm">
              <PenLine className="h-3.5 w-3.5" />
              Post
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
