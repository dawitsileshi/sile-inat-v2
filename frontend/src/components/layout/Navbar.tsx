import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Heart, LogIn } from 'lucide-react'
import { navLinks, isNavActive } from '@/data/navigation'
import { cn } from '@/lib/utils'
import { JoinModal } from '@/components/layout/JoinModal'

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [joinOpen, setJoinOpen] = useState(false)
  const location = useLocation()

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-black/[0.04] bg-cream/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand">
              <Heart className="h-4 w-4 fill-white text-white" />
            </div>
            <span className="text-lg font-bold text-text-primary">MomsHub</span>
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
                    'relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
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
                  <span className="relative">{link.label}</span>
                </Link>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setJoinOpen(true)}
              className="hidden items-center gap-2 rounded-full bg-brand px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-brand-dark sm:flex"
            >
              <LogIn className="h-4 w-4" />
              Join
            </button>

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
              className="overflow-hidden border-t border-black/[0.04] bg-cream lg:hidden"
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
                      {link.label}
                    </Link>
                  )
                })}
                <button
                  onClick={() => {
                    setMobileOpen(false)
                    setJoinOpen(true)
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-medium text-white"
                >
                  <LogIn className="h-4 w-4" />
                  Join
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <JoinModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  )
}
