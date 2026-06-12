import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, ArrowRight } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'

// TODO: Confirm 920 is active before launch. Test by calling.
const HOTLINE_CONFIRMED = false

export function CrisisButton() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onCrisisOpen() {
      setOpen(true)
    }
    window.addEventListener('crisis:open', onCrisisOpen as EventListener)
    return () => window.removeEventListener('crisis:open', onCrisisOpen as EventListener)
  }, [])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Get help now"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform hover:scale-[1.03] sm:bottom-6 sm:right-6"
        style={{ backgroundColor: '#C0392B' }}
      >
        <LifeBuoy className="h-4 w-4" />
        Get help now
      </button>

      <Modal isOpen={open} onClose={() => setOpen(false)} size="md">
        <div className="px-8 pb-8 pt-10">
          <h2 className="text-2xl font-bold text-text-primary">
            You don’t have to carry this alone.
          </h2>

          {HOTLINE_CONFIRMED ? (
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-text-secondary">
              <p>If you’re in crisis or need to talk to someone right now:</p>
              <div className="rounded-2xl bg-cream/60 p-5">
                <p className="text-base font-semibold text-text-primary">
                  Ethiopia Mental Health Support Line
                </p>
                <a
                  href="tel:920"
                  className="mt-2 inline-flex items-center gap-2 text-2xl font-bold text-brand"
                >
                  📞 920
                </a>
                <p className="mt-2 text-xs text-text-muted">
                  Available through Amanuel Hospital
                </p>
              </div>
              <p>
                If 920 doesn’t connect, go to the nearest health center and tell them
                you need mental health support. You have the right to ask for help.
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4 text-sm leading-relaxed text-text-secondary">
              <p>
                Find professional support near you. You have the right to ask for help.
              </p>
              <p>
                If you can, go to the nearest health center and tell them you need
                mental health support — or reach out to someone you trust.
              </p>
            </div>
          )}

          <Link
            to="/counselors"
            onClick={() => setOpen(false)}
            className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
          >
            Find a counselor near you <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </Modal>
    </>
  )
}
