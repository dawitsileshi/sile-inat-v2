import { motion } from 'framer-motion'
import type { OrganizationCategory } from '@/data/organizations'
import { categories } from '@/data/organizations'
import { cn } from '@/lib/utils'

interface CategoryFilterProps {
  active: OrganizationCategory
  onChange: (category: OrganizationCategory) => void
}

export function CategoryFilter({ active, onChange }: CategoryFilterProps) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onChange(cat.id)}
          className={cn(
            'relative rounded-full px-4 py-2 text-sm font-medium transition-colors',
            active === cat.id ? 'text-white' : 'text-text-secondary hover:bg-white'
          )}
        >
          {active === cat.id && (
            <motion.div
              layoutId="cat-pill"
              className="absolute inset-0 rounded-full bg-brand"
              transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
            />
          )}
          <span className="relative flex items-center gap-1.5">
            <span>{cat.icon}</span>
            {cat.label}
          </span>
        </button>
      ))}
    </div>
  )
}
