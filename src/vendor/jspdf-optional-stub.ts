/**
 * Dead-weight guard for jsPDF's optional SVG renderer.
 *
 * jsPDF's SVG feature lazily imports `dompurify` and `canvg`. This app never
 * uses it: the resume PDF is a screenshot of the themed preview plus a real
 * (invisible) text layer (see `ExportService`), so that code is never needed.
 *
 * `vite.config.ts` aliases those packages to this module so the production
 * build emits no dead chunks for them. If SVG rendering is ever called
 * anyway, it fails fast with a clear error instead of silently downloading
 * a heavy dependency. (html2canvas is NOT stubbed — the export feature uses
 * it directly for the visual layer.)
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
