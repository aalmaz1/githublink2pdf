/**
 * Dead-weight guard for jsPDF's optional renderers.
 *
 * jsPDF's `.html()` and SVG features lazily import `html2canvas`, `dompurify`
 * and `canvg` — together roughly 376 KB of extra chunks. This app never uses
 * those features: the resume PDF is laid out as native, selectable,
 * machine-readable text (see `ExportService`), so none of that code is ever
 * fetched or run.
 *
 * `vite.config.ts` aliases those three packages to this module so the
 * production build emits no dead chunks for them. If `.html()` or SVG
 * rendering is ever called anyway, it fails fast with a clear error instead
 * of silently downloading a heavy dependency.
 */

function unavailable(feature: string): never {
  throw new Error(
    `jsPDF's "${feature}" feature is not bundled. ` +
      'This app generates PDFs as native text and does not use jsPDF html/SVG rendering.'
  );
}

// jsPDF resolves each optional import as `module.default ?? module` and then
// uses it as a callable (html2canvas, dompurify) or reads `.fromString`
// (canvg). Expose both shapes so any accidental call fails loudly rather
// than with an opaque "is not a function".
const stub = Object.assign(() => unavailable('html/SVG rendering'), {
  fromString: () => unavailable('SVG rendering')
});

export default stub;
