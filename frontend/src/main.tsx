import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routeTree } from './router'
// Disable file-based route generation by not importing routeTree.gen
import './index.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Service workers require HTTPS with a valid (non-self-signed) cert.
    // Skip registration in local dev to avoid console noise.
    const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname)
    if (!isLocalhost || location.protocol === 'http:') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silently ignore — push notifications just won't work without SW
      })
    }
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
)
