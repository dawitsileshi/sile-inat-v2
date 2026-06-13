import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t border-black/[0.04] bg-cream">
      {/* 3-col grid keeps the tagline truly centered no matter how the brand
          mark is sized. The right slot is invisible but reserves horizontal
          space so the centered tagline doesn't crowd the fixed Get-help button. */}
      <div className="mx-auto grid w-full grid-cols-1 items-center gap-4 px-6 py-8 sm:grid-cols-3 sm:px-8 lg:px-12">
        <Link to="/" className="flex items-center gap-2 justify-self-center sm:justify-self-start">
          <Heart className="h-4 w-4 text-brand" />
          <span className="text-sm font-semibold text-text-primary">ስለ እናት</span>
        </Link>
        <p className="text-center text-sm text-text-secondary">
          A safe, supportive space for mothers during the postpartum journey.
        </p>
        <div aria-hidden className="hidden sm:block" />
      </div>
    </footer>
  )
}
