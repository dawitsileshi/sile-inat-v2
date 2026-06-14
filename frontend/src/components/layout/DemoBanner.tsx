import { useEffect, useState } from 'react'
import { Info } from 'lucide-react'

/**
 * Always-on advisory shown when the visitor is signed in as a demo
 * account or the legacy auto-registered ghost (user-XXXX@wellness.local).
 * Lives at the top of every page so reviewers can't miss it.
 *
 * Voice: brand-light, "just so you know" -- not an alarm. Voice rules
 * forbid red in advisories; soft blush + brand raspberry is the palette.
 */

function readEmail(): string | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem('auth_user')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { email?: string }
    return parsed?.email ?? null
  } catch {
    return null
  }
}

function isDemoEmail(email: string | null): boolean {
  if (!email) return false
  // Per-evaluator demo accounts created by POST /api/auth/demo.
  if (email.endsWith('@sile-inat.app') && email.startsWith('demo-')) return true
  // Legacy ghost accounts auto-registered by the v1 trackerSlice. Kept here
  // because the live deployment may still have visitors signed in as one
  // until they sign out and re-enter via the JoinModal.
  if (email.endsWith('@wellness.local') && email.startsWith('user-')) return true
  return false
}

export function DemoBanner() {
  const [email, setEmail] = useState<string | null>(() => readEmail())

  useEffect(() => {
    function refresh() { setEmail(readEmail()) }
    window.addEventListener('storage', refresh)
    window.addEventListener('auth:changed', refresh as EventListener)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('auth:changed', refresh as EventListener)
    }
  }, [])

  if (!isDemoEmail(email)) return null

  return (
    <div className="border-b border-brand/15 bg-brand-light/40">
      <div className="mx-auto flex items-start gap-2.5 px-6 py-2.5 sm:px-8 lg:px-12">
        <Info className="mt-0.5 h-4 w-4 flex-none text-brand" aria-hidden />
        <p className="text-xs leading-relaxed text-text-secondary">
          <span className="font-semibold text-text-primary">This is a demo session.</span>{' '}
          Please don&rsquo;t enter anything personal &mdash; check-ins, notes, and voice memos
          made here are visible to the project team and may be cleared after the review round.
        </p>
      </div>
    </div>
  )
}
