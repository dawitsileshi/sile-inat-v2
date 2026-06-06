import { motion } from 'framer-motion'
import { Users, ChevronRight } from 'lucide-react'
import type { CommunityGroup } from '@/data/community'
import { cn } from '@/lib/utils'

interface GroupCardProps {
  group: CommunityGroup
  isActive: boolean
  onClick: () => void
}

export function GroupCard({ group, isActive, onClick }: GroupCardProps) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all',
        isActive
          ? 'bg-abay-500/15 shadow-sm'
          : 'hover:bg-gray-100/80 dark:hover:bg-white/5'
      )}
    >
      <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg', group.color)}>
        {group.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{group.name}</p>
        <p className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Users className="h-3 w-3" />
          {group.members.toLocaleString()} members
        </p>
      </div>
      <ChevronRight className={cn('h-4 w-4 shrink-0 transition-colors', isActive ? 'text-abay-600' : 'text-gray-400')} />
    </motion.button>
  )
}
