import { clearScreeningToken } from '@/lib/screening'

/**
 * DevResetParticipant — local-development escape hatch.
 *
 * Withdrawal is deliberately terminal: once a participant withdraws, the
 * server refuses to re-consent her (screening_consent.py), and the browser
 * keeps the same token forever, so every later visit lands on "You have
 * withdrawn". That is right for a mother and impossible to test against.
 *
 * This forgets the stored token so the next load enrols a fresh participant.
 * It changes nothing on the server — the withdrawn participant stays
 * withdrawn and its consent rows stay exactly as recorded, which is what the
 * append-only consent log requires.
 *
 * Vite replaces `import.meta.env.DEV` with `false` when building for
 * production, so this returns null there and the button is dropped from the
 * bundle. It cannot appear on the deployed site.
 */
export function DevResetParticipant() {
  if (!import.meta.env.DEV) return null

  function startOver() {
    clearScreeningToken()
    window.location.assign('/screening/consent')
  }

  return (
    <div className="mt-10 rounded-xl border border-dashed border-brand-muted bg-stone-50 p-4">
      <p className="text-xs text-text-muted">
        Local development only — not present in a production build.
      </p>
      <button
        type="button"
        onClick={startOver}
        className="mt-2 inline-flex items-center justify-center rounded-full border-2
                   border-brand-muted bg-white px-4 py-2 text-sm font-medium
                   text-text-primary transition hover:border-brand
                   focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        Start over as a new participant
      </button>
    </div>
  )
}
