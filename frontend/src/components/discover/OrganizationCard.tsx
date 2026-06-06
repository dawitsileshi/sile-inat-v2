import { motion } from 'framer-motion'
import { MapPin, Star } from 'lucide-react'
import type { Organization } from '@/data/organizations'
import { cn } from '@/lib/utils'

interface OrganizationCardProps {
  org: Organization
  onClick: () => void
  index?: number
}

export function OrganizationCard({ org, onClick, index = 0 }: OrganizationCardProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="w-full text-left"
    >
      <div className="overflow-hidden rounded-3xl bg-white card-shadow transition-shadow hover:card-shadow">
        <div className={cn('relative h-28 bg-gradient-to-br', org.coverGradient)}>
          {org.featured && (
            <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-brand">
              <Star className="h-3 w-3 fill-brand" />
              Featured
            </span>
          )}
          <div className="absolute -bottom-5 left-5 flex h-12 w-12 items-center justify-center rounded-xl border-4 border-white bg-brand text-sm font-bold text-white">
            {org.logo}
          </div>
        </div>
        <div className="p-6 pt-8">
          <h3 className="text-base font-bold text-text-primary">{org.name}</h3>
          <p className="mt-1 text-sm text-text-secondary line-clamp-2">{org.tagline}</p>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-text-muted">
            <MapPin className="h-3.5 w-3.5" />
            {org.location}
          </p>
        </div>
      </div>
    </motion.button>
  )
}
