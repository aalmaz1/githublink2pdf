import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { minify } from 'html-minifier-terser';

/**
 * Vite does not minify index.html by default. Collapse the whitespace and
 * strip comments so the served document is as small as possible.
 */
function minifyHtml(): Plugin {
  return {
    name: 'minify-html',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler: (html: string) =>
        minify(html, {
          collapseWhitespace: true,
          removeComments: true
        })
    }
  };
}

/**
 * The @fontsource packages list both woff2 and a legacy woff fallback for
 * every font file. The app's build target is modern browsers, so the woff
 * copies would only bloat the bundle. Strip the woff url() candidates from
 * the bundled CSS and drop the emitted .woff assets so only woff2 ships.
 * Running on the final bundle makes this work no matter how the font CSS
 * is imported (JS imports or CSS @import).
 */
function stripWoffFallbacks(): Plugin {
  return {
    name: 'strip-woff-fallbacks',
    apply: 'build',
    generateBundle(_options, bundle) {
      for (const fileName of Object.keys(bundle)) {
        const entry = bundle[fileName];
        if (fileName.endsWith('.css') && entry.type === 'asset') {
          const source = String(entry.source).replace(/, url\([^)]*\.woff\)/g, '');
          entry.source = source;
        } else if (fileName.endsWith('.woff')) {
          delete bundle[fileName];
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [stripWoffFallbacks(), minifyHtml()],
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
    chunkSizeWarningLimit: 500,
    // Never inline CSS as a data: URI: a tiny stylesheet like fonts.css
    // must stay a real file so it can load non-blocking (media="print" trick).
    assetsInlineLimit: 0
  },
  optimizeDeps: {
    include: ['jspdf']
  }
});
