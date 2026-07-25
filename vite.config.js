import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('react-is') || id.includes('victory') || id.includes('d3')) {
              return 'vendor-recharts'
            }
            if (id.includes('motion') || id.includes('framer')) {
              return 'vendor-motion'
            }
            if (id.includes('lucide')) {
              return 'vendor-lucide'
            }
            if (id.includes('@radix-ui')) {
              return 'vendor-radix'
            }
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-is') || id.includes('scheduler')) {
              return 'vendor-react'
            }
          }
        },
      },
    },
  },
})
