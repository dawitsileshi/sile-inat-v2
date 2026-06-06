import { motion } from 'framer-motion'
import { Star, ArrowRight } from 'lucide-react'
import type { Organization } from '@/data/organizations'
import { cn } from '@/lib/utils'

interface FeaturedBannerProps {
  org: Organization
  onClick: () => void
}

export function FeaturedBanner({ org, onClick }: FeaturedBannerProps) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005 }}
      onClick={onClick}
      className="group w-full overflow-hidden rounded-3xl text-left card-shadow"
    >
      <div className={cn('relative bg-gradient-to-r px-8 py-8 sm:px-10', org.coverGradient)}>
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold text-white backdrop-blur-sm">
              {org.logo}
            </div>
            <div>
              <div className="mb-1 flex items-center gap-1.5">
                <Star className="h-3.5 w-3.5 fill-white text-white" />
                <span className="text-xs font-semibold uppercase tracking-wider text-white/80">Featured</span>
              </div>
              <h3 className="text-xl font-bold text-white sm:text-2xl">{org.name}</h3>
              <p className="mt-0.5 text-sm text-white/80">{org.tagline}</p>
            </div>
          </div>
          <span className="flex items-center gap-2 self-start rounded-xl bg-white/20 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm sm:self-center">
            View Profile
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </motion.button>
  )
}
