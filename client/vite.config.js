import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = parseInt(env.PORT || env.VITE_PORT || '5173', 10)
  const backendUrl = env.VITE_BACKEND_URL || env.BACKEND_URL || 'http://127.0.0.1:5000'

  return {
    plugins: [react()],
    server: {
      port,
      host: true, // Listen on all network interfaces for container/network access
      proxy: {
        '/api': {
          target: backendUrl,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 600,
    },
  }
})
