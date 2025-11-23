import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    open: true,
    // Memory optimization
    hmr: {
      overlay: false
    }
  },
  build: {
    // Memory optimization for builds
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
          router: ['react-router-dom']
        }
      }
    }
  },
  optimizeDeps: {
    // Pre-bundle large dependencies
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'antd',
      '@ant-design/icons',
      'axios'
    ],
    // Reduce memory usage during optimization
    force: false,
    esbuildOptions: {
      target: 'esnext'
    }
  },
  // Reduce memory usage
  esbuild: {
    target: 'esnext',
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
