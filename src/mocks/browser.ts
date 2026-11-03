import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

/**
 * The demo's only data source, in production too. Fonts, scripts and any other request go to the network.
 * Resolves once the worker controls the page, so the first query is already mocked.
 */
export const startMocks = () =>
  worker.start({ onUnhandledRequest: 'bypass', quiet: true, serviceWorker: { url: '/mockServiceWorker.js' } })
