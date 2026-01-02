import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(__dirname, '..'), '')

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    envDir: path.resolve(__dirname, '..'),
    server: {
      port: 3000,
      host: true,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            recharts: ['recharts'],
            'ui-components': [
              '@/components/ui/card',
              '@/components/ui/button',
              '@/components/ui/input',
              '@/components/ui/select',
              '@/components/ui/dialog',
              '@/components/ui/table'
            ]
          }
        }
      }
    },
  }
})
