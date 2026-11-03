import '@fontsource/barlow/400.css'
import '@fontsource/barlow/500.css'
import '@fontsource/barlow/600.css'
import '@fontsource/barlow/700.css'
// This package's export map adds ".css" itself.
import '@fontsource/big-shoulders-display/800'
import './styles.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import { resetFromUrl } from './mocks/db'
import { router } from './app/router'
import { ToastProvider } from './ui/toast'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
})

resetFromUrl(location.search)
// The mock API is its own chunk, fetched beside the app; nothing renders until it answers requests.
const { startMocks } = await import('./mocks/browser')
await startMocks()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
)
