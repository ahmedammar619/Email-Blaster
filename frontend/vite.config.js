import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['localhost', 'yeeloz.com', '.yeeloz.com'],
    watch: {
      usePolling: true,
      interval: 1000
    },
    hmr: {
      host: 'localhost',
      port: 5173
    }
  }
})
