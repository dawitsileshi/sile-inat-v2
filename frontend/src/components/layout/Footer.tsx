import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-black/[0.04] bg-cream">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <Link to="/" className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold text-text-primary">MomsHub</span>
        </Link>
        <p className="text-center text-sm text-text-secondary">
          A safe, supportive space for mothers during the postpartum journey.
        </p>
      </div>
    </footer>
  )
}
