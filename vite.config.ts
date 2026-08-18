import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    // Allow the sandbox preview proxy host so the live preview loads
    allowedHosts: true
  },
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
