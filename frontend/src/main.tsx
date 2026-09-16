import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store/store'
import App from './App'
import { clearAppStorage } from './lib/session'
import './index.css'
// Init i18next before App mounts so the first paint uses the right language.
import './lib/i18n'

// `?reset` forgets this browser's stored session, so restarting a test run
// never needs DevTools. It reloads onto a clean URL rather than mounting
// straight away, because i18next and the redux slices read storage as they
// are imported — by the time this runs they already have. The reload gives
// every module an empty slate.
const params = new URLSearchParams(window.location.search)
if (params.has('reset')) {
  clearAppStorage()
  params.delete('reset')
  const query = params.toString()
  window.location.replace(window.location.pathname + (query ? `?${query}` : ''))
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>
  )
}
