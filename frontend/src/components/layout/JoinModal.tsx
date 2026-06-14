import { useState } from 'react'
import { Shield, MessageCircle, Loader2, Sparkles } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { cn } from '@/lib/utils'

interface JoinModalProps {
  open: boolean
  onClose: () => void
}

type BabyStatus = 'pregnant' | 'born' | 'skip'

const TOKEN_KEY = 'auth_token'
const USER_KEY = 'auth_user'
const API_URL = '/api'

interface AuthUser {
  user_id: number
  email: string
  baby_status: BabyStatus | null
  baby_birth_date: string | null
}

export function JoinModal({ open, onClose }: JoinModalProps) {
  const [tab, setTab] = useState<'signin' | 'join'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [babyStatus, setBabyStatus] = useState<BabyStatus | ''>('')
  const [babyBirthDate, setBabyBirthDate] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function reset() {
    setEmail('')
    setPassword('')
    setBabyStatus('')
    setBabyBirthDate('')
    setError(null)
    setSubmitting(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleDemo() {
    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch(`${API_URL}/auth/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          (data && typeof data.error === 'string' && data.error) ||
            `Request failed (${response.status})`,
        )
      }
      const token: string | undefined = data.token
      const user: AuthUser | undefined = data.user
      if (!token) throw new Error('Server did not return a session token.')
      localStorage.setItem(TOKEN_KEY, token)
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
      window.dispatchEvent(new Event('auth:changed'))
      handleClose()
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start a demo session.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const path = tab === 'signin' ? '/auth/login' : '/auth/register'
      const body: Record<string, unknown> = { email: email.trim(), password }
      if (tab === 'join') {
        if (babyStatus) body.baby_status = babyStatus
        if (babyStatus === 'born' && babyBirthDate) {
          body.baby_birth_date = babyBirthDate
        }
      }
      const response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(
          (data && typeof data.error === 'string' && data.error) ||
            `Request failed (${response.status})`
        )
      }
      const token: string | undefined = data.token
      const user: AuthUser | undefined = data.user
      if (!token) throw new Error('Server did not return a session token.')
      localStorage.setItem(TOKEN_KEY, token)
      if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
      // Tell any in-page listeners (Navbar, etc) so they update without a reload.
      window.dispatchEvent(new Event('auth:changed'))
      handleClose()
      // Soft reload so any page reading auth state at mount picks it up too.
      window.location.reload()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal isOpen={open} onClose={handleClose} size="md">
      <div className="px-8 pb-8 pt-10">
        <div className="flex flex-col items-center text-center">
          <img
            src="/logo - Sile-Enat.svg"
            alt="ስለ እናት"
            className="mb-4 h-16 w-16"
          />
          <h2 className="font-amharic text-3xl font-bold text-text-primary">ስለ እናት</h2>
          <p className="mt-2 text-sm text-text-secondary">
            A safe space for mothers during the postpartum journey
          </p>
        </div>

        {/* Demo session — one-tap entry for evaluators. Creates a fresh
            isolated account on the backend so reviewers never see each
            other's data. The credentials are never displayed. */}
        <div className="mt-6 rounded-2xl border border-brand/20 bg-brand-light/30 p-4">
          <p className="text-sm font-semibold text-text-primary">
            Just looking around?
          </p>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            Try the app with a fresh demo account — no signup, your data stays separate from other visitors.
          </p>
          <button
            type="button"
            onClick={handleDemo}
            disabled={submitting}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-dark disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Continue as demo user
          </button>
        </div>

        <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-stone-100 p-1">
            <button
              type="button"
              onClick={() => {
                setTab('signin')
                setError(null)
              }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                tab === 'signin' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
              )}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('join')
                setError(null)
              }}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                tab === 'join' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'
              )}
            >
              Join
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-text-primary">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                required
                minLength={6}
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-brand focus:outline-none"
              />
            </div>

            {tab === 'join' && (
              <div className="rounded-xl border border-gray-100 bg-stone-50 p-4">
                <p className="text-sm font-medium text-text-primary">
                  Are you currently expecting, or do you have a baby?
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  This helps us show you what's most relevant. You can skip this.
                </p>
                <div className="mt-3 grid gap-2">
                  {[
                    { value: 'pregnant', label: "I'm expecting" },
                    { value: 'born', label: 'I have a baby' },
                    { value: 'skip', label: "I'd rather not say" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setBabyStatus(opt.value as BabyStatus)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        babyStatus === opt.value
                          ? 'border-brand bg-brand-light text-brand font-medium'
                          : 'border-gray-200 bg-white text-text-secondary hover:border-brand/40'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {babyStatus === 'born' && (
                  <div className="mt-3">
                    <label
                      htmlFor="baby-birth-date"
                      className="mb-1.5 block text-sm font-medium text-text-primary"
                    >
                      When was your baby born?
                    </label>
                    <input
                      id="baby-birth-date"
                      type="date"
                      value={babyBirthDate}
                      onChange={(e) => setBabyBirthDate(e.target.value)}
                      max={new Date().toISOString().slice(0, 10)}
                      className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-text-primary focus:border-brand focus:outline-none"
                    />
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-text-secondary">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {tab === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
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
