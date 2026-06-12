import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  LifeBuoy, ArrowLeft, ArrowRight, Phone, MapPin,
  Users, Sparkles, Stethoscope, HeartHandshake,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

const AMBULANCE_NUMBER = '907'
const AMANUEL_PHONE_TEL = '+251113471632'
const AMANUEL_PHONE_DISPLAY = '+251 113 47 16 32'

type Lane = 'hub' | 'medical' | 'support'

export function CrisisButton() {
  const [open, setOpen] = useState(false)
  const [lane, setLane] = useState<Lane>('hub')
  const navigate = useNavigate()

  useEffect(() => {
    function onCrisisOpen() {
      setLane('hub')
      setOpen(true)
    }
    window.addEventListener('crisis:open', onCrisisOpen as EventListener)
    return () => window.removeEventListener('crisis:open', onCrisisOpen as EventListener)
  }, [])

  function handleClose() {
    setOpen(false)
    setTimeout(() => setLane('hub'), 200)
  }

  function goToFindHelp(type: string) {
    handleClose()
    navigate(`/find-help?type=${type}`)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setLane('hub'); setOpen(true) }}
        aria-label="Get help now"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg transition-transform hover:scale-[1.03] sm:bottom-6 sm:right-6"
        style={{ backgroundColor: '#C0392B' }}
      >
        <LifeBuoy className="h-4 w-4" />
        Get help now
      </button>

      <Modal isOpen={open} onClose={handleClose} size="md">
        <div className="px-8 pb-8 pt-10">
          {lane === 'hub' && (
            <HubView
              onPickMedical={() => setLane('medical')}
              onPickSupport={() => setLane('support')}
              onPickCounselor={() => goToFindHelp('psychological')}
            />
          )}
          {lane === 'medical' && (
            <MedicalView
              onBack={() => setLane('hub')}
              onFindHospitals={() => goToFindHelp('hospital')}
            />
          )}
          {lane === 'support' && (
            <SupportView onBack={() => setLane('hub')} onClose={handleClose} />
          )}
        </div>
      </Modal>
    </>
  )
}

// ─── Hub ──────────────────────────────────────────────────────────────────────

function HubView({
  onPickMedical, onPickSupport, onPickCounselor,
}: {
  onPickMedical: () => void
  onPickSupport: () => void
  onPickCounselor: () => void
}) {
  return (
    <>
      <h2 className="text-2xl font-bold text-text-primary">
        You don’t have to carry this alone.
      </h2>
      <p className="mt-2 text-sm text-text-secondary">
        What kind of help do you need right now?
      </p>

      <div className="mt-6 space-y-3">
        <LaneCard
          icon={<Stethoscope className="h-5 w-5" />}
          accent="emergency"
          title="This is a medical emergency"
          subtitle="Call an ambulance or find a hospital near me."
          onClick={onPickMedical}
        />
        <LaneCard
          icon={<HeartHandshake className="h-5 w-5" />}
          accent="brand"
          title="I’m struggling and need support"
          subtitle="Talk to someone now, find other mothers, or reach a professional."
          onClick={onPickSupport}
        />
        <LaneCard
          icon={<MapPin className="h-5 w-5" />}
          accent="muted"
          title="Find a counselor near me"
          subtitle="See mental health clinics and psychologists on a map."
          onClick={onPickCounselor}
        />
      </div>
    </>
  )
}

function LaneCard({
  icon, accent, title, subtitle, onClick,
}: {
  icon: React.ReactNode
  accent: 'emergency' | 'brand' | 'muted'
  title: string
  subtitle: string
  onClick: () => void
}) {
  const iconBg =
    accent === 'emergency'
      ? 'bg-[#C0392B]/10 text-[#C0392B]'
      : accent === 'brand'
        ? 'bg-brand-light text-brand'
        : 'bg-cream-dark text-text-secondary'

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 text-left transition-colors hover:border-brand/40 hover:bg-brand-light/20"
    >
      <div className={cn('flex h-10 w-10 flex-none items-center justify-center rounded-xl', iconBg)}>
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text-primary">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">{subtitle}</p>
      </div>
      <ArrowRight className="mt-2 h-4 w-4 flex-none text-text-muted transition-colors group-hover:text-brand" />
    </button>
  )
}

// ─── Medical Emergency ────────────────────────────────────────────────────────

function MedicalView({
  onBack, onFindHospitals,
}: { onBack: () => void; onFindHospitals: () => void }) {
  return (
    <>
      <BackButton onBack={onBack} />
      <h2 className="mt-2 text-2xl font-bold text-text-primary">Medical emergency</h2>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        If you or your baby need urgent medical help, call an ambulance now.
      </p>

      <a
        href={`tel:${AMBULANCE_NUMBER}`}
        className="mt-6 flex items-center justify-center gap-3 rounded-2xl py-5 text-lg font-bold text-white shadow-md transition-transform hover:scale-[1.01]"
        style={{ backgroundColor: '#C0392B' }}
      >
        <Phone className="h-5 w-5" />
        Call {AMBULANCE_NUMBER} — Ambulance
      </a>
      <p className="mt-2 text-center text-xs text-text-muted">
        Ethiopia’s national ambulance service.
      </p>

      <button
        type="button"
        onClick={onFindHospitals}
        className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
      >
        Find a hospital near you <ArrowRight className="h-4 w-4" />
      </button>
    </>
  )
}

// ─── Support ──────────────────────────────────────────────────────────────────

function SupportView({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  return (
    <>
      <BackButton onBack={onBack} />
      <h2 className="mt-2 text-2xl font-bold text-text-primary">
        You don’t have to be alone with this.
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">
        Three ways to get support — start with whichever feels right.
      </p>

      <div className="mt-6 space-y-3">
        <Link
          to="/ai-assistant"
          onClick={onClose}
          className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand/40 hover:bg-brand-light/20"
        >
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-light text-brand">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Talk to the AI companion</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              Right now. No phone call, no waiting.
            </p>
          </div>
          <ArrowRight className="mt-2 h-4 w-4 flex-none text-text-muted transition-colors group-hover:text-brand" />
        </Link>

        <Link
          to="/circles"
          onClick={onClose}
          className="group flex items-start gap-4 rounded-2xl border border-gray-200 bg-white p-4 transition-colors hover:border-brand/40 hover:bg-brand-light/20"
        >
          <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-brand-light text-brand">
            <Users className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-text-primary">Find mothers like you</p>
            <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
              Peer support from women in the same moment.
            </p>
          </div>
          <ArrowRight className="mt-2 h-4 w-4 flex-none text-text-muted transition-colors group-hover:text-brand" />
        </Link>

        <div className="rounded-2xl border border-gray-200 bg-cream/40 p-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-cream-dark text-text-secondary">
              <Phone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">
                Amanuel Mental Specialized Hospital
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-text-secondary">
                The main public psychiatric hospital in Addis Ababa. You can walk
                in, or call ahead.
              </p>
              <a
                href={`tel:${AMANUEL_PHONE_TEL}`}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark"
              >
                <Phone className="h-4 w-4" />
                {AMANUEL_PHONE_DISPLAY}
              </a>
            </div>
          </div>
        </div>

        <Link
          to="/counselors"
          onClick={onClose}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          Browse the counselor directory <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  )
}

// ─── Shared bits ──────────────────────────────────────────────────────────────

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-brand"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back
    </button>
  )
}
