import { LogIn } from 'lucide-react'

interface SignInPromptProps {
  title: string
  body: string
  ctaLabel?: string
}

/**
 * Renders the empty-state prompt shown on auth-gated pages (Check-In,
 * Journal, Dashboard, Reflection) when there is no signed-in user.
 * Tapping the CTA dispatches the `auth:open` window event, which the
 * Navbar listens for and uses to open the JoinModal.
 *
 * Voice rules: empty states are invitations, not errors — no apology,
 * just direction.
 */
export function SignInPrompt({ title, body, ctaLabel = 'Sign in or join' }: SignInPromptProps) {
  function open() {
    window.dispatchEvent(new Event('auth:open'))
  }
  return (
    <div className="mx-auto max-w-md px-6 py-20 text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-light">
        <LogIn className="h-6 w-6 text-brand" />
      </div>
      <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-text-secondary">
        {body}
      </p>
      <button
        type="button"
        onClick={open}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark"
      >
        <LogIn className="h-4 w-4" />
        {ctaLabel}
      </button>
    </div>
  )
}
