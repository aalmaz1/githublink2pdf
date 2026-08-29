import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';

/**
 * The @fontsource packages list both woff2 and a legacy woff fallback for
 * every font file. The app's build target is modern browsers, so the woff
 * copies would only bloat the bundle. Drop them from the CSS before Vite
 * resolves the url()s so only the woff2 assets ship.
 */
function stripWoffFallbacks(): Plugin {
  return {
    name: 'strip-woff-fallbacks',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('@fontsource')) return;
      return code.replace(/, url\([^)]*\.woff\)/g, '');
    }
  };
}

export default defineConfig({
  plugins: [stripWoffFallbacks()],
  server: {
    host: '0.0.0.0',
    // Allow the sandbox preview proxy host so the live preview loads
    allowedHosts: true
  },
  resolve: {
    alias: [
      // jsPDF lazily imports these renderers for its `.html()`/SVG features,
      // which this app never uses. Pointing them at a throwing stub stops
      // ~376 KB of dead chunks (html2canvas, canvg, dompurify) from shipping.
      { find: 'html2canvas', replacement: fileURLToPath(new URL('./src/vendor/jspdf-optional-stub.ts', import.meta.url)) },
      { find: 'canvg', replacement: fileURLToPath(new URL('./src/vendor/jspdf-optional-stub.ts', import.meta.url)) },
      { find: 'dompurify', replacement: fileURLToPath(new URL('./src/vendor/jspdf-optional-stub.ts', import.meta.url)) }
    ]
  },
  build: {
    target: 'esnext',
    // Enable tree shaking and minification
    minify: true,
    // Reduce chunk size warnings
    chunkSizeWarningLimit: 500
  },
  optimizeDeps: {
    include: ['jspdf']
  }
});
