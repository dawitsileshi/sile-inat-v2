/**
 * WithdrawControl — the "stop and withdraw" affordance.
 *
 * Mounted on every screening question screen, because the clinical spec
 * requires withdrawal to be available once screening starts, not only at the
 * consent gate.
 *
 * Wording comes from the consent bundle rather than the screening bundle:
 * withdrawing is a consent action, so it is versioned with the consent she
 * originally gave.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

import { withdrawConsent, type ConsentBundle, type ConsentState } from '@/lib/screening'

export function WithdrawControl({
  copy,
  onWithdrawn,
}: {
  copy: ConsentBundle['withdraw']
  onWithdrawn?: (state: ConsentState) => void
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      const state = await withdrawConsent()
      onWithdrawn?.(state)
      // Back to the consent page, which reads her state and shows the
      // withdrawn confirmation.
      navigate('/screening/consent', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded text-sm text-text-secondary underline underline-offset-4
                   hover:text-text-primary focus:outline-none focus-visible:ring-2
                   focus-visible:ring-brand"
      >
        {copy.trigger_label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/30 px-5">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-3xl bg-white p-7 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-xl font-semibold text-text-primary">{copy.title}</h2>
            <p className="mt-3 leading-relaxed text-text-secondary">{copy.body}</p>
            {error && (
              <p className="mt-5 rounded-xl bg-stone-100 px-4 py-3 text-sm text-text-secondary">
                {error}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row-reverse">
              <button
                type="button"
                onClick={confirm}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full
                           bg-brand px-5 py-3 font-medium text-white transition
                           hover:bg-brand-dark disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {copy.confirm_label}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={busy}
                className="inline-flex flex-1 items-center justify-center rounded-full
                           border-2 border-brand-muted bg-white px-5 py-3 font-medium
                           text-text-primary transition hover:border-brand disabled:opacity-60"
              >
                {copy.cancel_label}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </>
  )
}
