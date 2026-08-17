import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'esnext',
    // Enable tree shaking and minification
    minify: true,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 500
  },
  optimizeDeps: {
    include: ['html2pdf.js', 'html2canvas']
  }
});
