import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// VITE_BACKEND_URL is the full URL of the backend, used by the dev-server proxy only.
// It is NOT exposed to the browser bundle.
const backendTarget = process.env.VITE_BACKEND_URL || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: backendTarget,
        changeOrigin: true,
      },
    },
  },
})
