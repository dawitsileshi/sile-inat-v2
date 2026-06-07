import { useState } from 'react'
import { Heart, Shield, MessageCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

interface JoinModalProps {
  open: boolean
  onClose: () => void
}

export function JoinModal({ open, onClose }: JoinModalProps) {
  const [tab, setTab] = useState<'signin' | 'join'>('signin')

  return (
    <Modal isOpen={open} onClose={onClose} size="md">
      <div className="px-8 pb-8 pt-10">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-light">
            <Heart className="h-7 w-7 text-brand" />
          </div>
          <h2 className="text-3xl font-bold text-text-primary">ስለ እናት</h2>
          <p className="mt-2 text-sm text-text-secondary">
            A safe space for mothers during the postpartum journey
          </p>
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-cream-dark p-1">
            <button
              onClick={() => setTab('signin')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                tab === 'signin' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
              )}
            >
              Sign In
            </button>
            <button
              onClick={() => setTab('join')}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                tab === 'join' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
              )}
            >
              Join
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              onClose()
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-text-primary">
                Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark"
            >
              {tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" />
            <span className="text-xs font-medium text-text-muted">OR</span>
            <div className="h-px flex-1 bg-gray-200" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-gray-50"
          >
            <GoogleIcon />
            Continue with Google
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Anonymous community
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="h-3.5 w-3.5" />
            Expert support
          </span>
        </div>
      </div>
    </Modal>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}
