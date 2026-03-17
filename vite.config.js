import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('recharts')) return 'vendor-charts';
          if (id.includes('react-router')) return 'vendor-router';
          if (id.includes('react-hot-toast')) return 'vendor-toast';

          return 'vendor';
        },
      },
    },
  },
})
