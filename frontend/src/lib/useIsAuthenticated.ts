import { useEffect, useState } from 'react'

function read(): boolean {
  if (typeof localStorage === 'undefined') return false
  return !!localStorage.getItem('auth_token')
}

/**
 * Reactive boolean — true when a real auth token is in localStorage.
 * Re-evaluates on the `auth:changed` window event (JoinModal + Navbar
 * sign-out both dispatch it) and on cross-tab `storage` events.
 */
export function useIsAuthenticated(): boolean {
  const [signedIn, setSignedIn] = useState<boolean>(() => read())
  useEffect(() => {
    function refresh() { setSignedIn(read()) }
    window.addEventListener('storage', refresh)
    window.addEventListener('auth:changed', refresh as EventListener)
    return () => {
      window.removeEventListener('storage', refresh)
      window.removeEventListener('auth:changed', refresh as EventListener)
    }
  }, [])
  return signedIn
}
