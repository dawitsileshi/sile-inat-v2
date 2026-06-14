import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Heart, LogIn, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { navLinks, isNavActive } from '@/data/navigation'
import { cn } from '@/lib/utils'
import { JoinModal } from '@/components/layout/JoinModal'
// LanguageSwitcher is intentionally hidden for now. The i18n plumbing (locale
// JSON, t() calls, language detector) stays wired so re-enabling is a single
// import + two render sites in this file.
// import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher'

interface StoredAuthUser {
  user_id?: number
  email?: string
  baby_status?: string | null
  baby_birth_date?: string | null
}

function readAuth(): { token: string; user: StoredAuthUser } | null {
  if (typeof localStorage === 'undefined') return null
  const token = localStorage.getItem('auth_token')
  if (!token) return null
  let user: StoredAuthUser = {}
  try {
    const raw = localStorage.getItem('auth_user')
    if (raw) user = JSON.parse(raw)
  } catch {
    /* ignore — token alone is enough for the chip */
  }
  return { token, user }
}

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const [auth, setAuth] = useState<ReturnType<typeof readAuth>>(() => readAuth())
  const [accountOpen, setAccountOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const accountWrapperRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  // Cross-tab + cross-window sign-in/out sync.
  useEffect(() => {
    function refresh() { setAuth(readAuth()) }
    window.addEventListener('storage', refresh)
    window.addEventListener('auth:changed', refresh as EventListener)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('auth:changed', refresh as EventListener)
    }
  }, [])

  // Pages that need auth (Check-In, Journal, Dashboard) fire `auth:open` when
  // the visitor isn't signed in. Same pattern as the crisis modal — the host
  // of the modal listens, the requester just dispatches.
  useEffect(() => {
    function onOpen() { setJoinOpen(true) }
    window.addEventListener('auth:open', onOpen as EventListener)
    return () => window.removeEventListener('auth:open', onOpen as EventListener)
  }, [])

  // Click outside to close the account menu.
  useEffect(() => {
    if (!accountOpen) return
    function onClick(e: MouseEvent) {
      if (!accountWrapperRef.current?.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    window.addEventListener('mousedown', onClick)
    return () => window.removeEventListener('mousedown', onClick)
  }, [accountOpen])

  function handleSignOut() {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('auth_user')
    window.dispatchEvent(new Event('auth:changed'))
    setAccountOpen(false)
    setAuth(null)
    navigate('/')
  }

  const initial = auth?.user.email?.trim().charAt(0).toUpperCase() || '•'

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/[0.04] bg-white/90 backdrop-blur-md">
        <nav className="flex items-center justify-between px-6 py-4 sm:px-8 lg:px-12">
          <Link to="/" className="flex flex-none items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand">
              <Heart className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="whitespace-nowrap text-lg font-bold text-text-primary">
              ስለ እናት
            </span>
          </Link>

          <div className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => {
              const active = isNavActive(location.pathname, link.to)
              const Icon = link.icon
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={cn(
                    'relative flex items-center gap-2 whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition-colors',
                    active ? 'text-brand' : 'text-text-secondary hover:text-text-primary'
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-full bg-brand-light"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <Icon className="relative h-4 w-4" />
                  <span className="relative">{t(link.labelKey, link.label)}</span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            {auth ? (
              <div ref={accountWrapperRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-2 py-1.5 text-sm font-medium text-text-primary ring-1 ring-black/[0.05] transition-shadow hover:shadow-sm"
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                >
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white"
                    aria-hidden
                  >
                    {initial}
                  </span>
                  <span className="hidden max-w-[140px] truncate text-text-secondary xl:inline">
                    {auth.user.email ?? 'You'}
                  </span>
                </button>

                <AnimatePresence>
                  {accountOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.12 }}
                      role="menu"
                      className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl bg-white py-2 shadow-lg ring-1 ring-black/[0.06]"
                    >
                      <div className="px-4 py-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                          Signed in as
                        </p>
                        <p className="mt-0.5 truncate text-sm text-text-primary">
                          {auth.user.email ?? 'You'}
                        </p>
                      </div>
                      <div className="h-px bg-black/[0.05]" />
                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-text-primary hover:bg-stone-100"
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4 text-text-secondary" />
                        Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                onClick={() => setJoinOpen(true)}
                className="hidden items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-dark sm:flex"
              >
                <LogIn className="h-4 w-4" />
                {t('common.join', 'Join')}
              </button>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-text-secondary hover:bg-brand-light lg:hidden"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-black/[0.04] bg-white lg:hidden"
            >
              <div className="space-y-1 px-4 py-3">
                {navLinks.map((link) => {
                  const Icon = link.icon
                  const active = isNavActive(location.pathname, link.to)
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium',
                        active ? 'bg-brand-light text-brand' : 'text-text-secondary'
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t(link.labelKey, link.label)}
                    </Link>
                  )
                })}

                {auth ? (
                  <>
                    <div className="mt-2 flex items-center gap-3 rounded-xl bg-white px-4 py-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-white">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
                          Signed in
                        </p>
                        <p className="truncate text-sm text-text-primary">
                          {auth.user.email ?? 'You'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMobileOpen(false)
                        handleSignOut()
                      }}
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-medium text-text-primary"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setMobileOpen(false)
                      setJoinOpen(true)
                    }}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-medium text-white"
                  >
                    <LogIn className="h-4 w-4" />
                    {t('common.join', 'Join')}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  )
}
