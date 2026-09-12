import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/prana': {
        target: 'http://163.128.209.18:8103',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/prana/, ''),
      },
      '/api/karma': {
        target: 'http://163.128.209.18:8102',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/karma/, ''),
      },
    },
  },
})
