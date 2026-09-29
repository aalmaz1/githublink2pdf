/**
 * PDF Pagination - smart page break calculation for html2pdf.js export.
 *
 * Why this module exists:
 * html2pdf.js renders the container into a single canvas and slices it by
 * fixed page height. Its built-in 'css' pagebreak mode only honors
 * `page-break-inside: avoid` on BLOCK-level elements (it skips inline
 * elements like <h3>/<p>), so section titles can be cut in half at the
 * bottom of a page.
 *
 * This module measures real element heights in the DOM before export and
 * adds the `.avoid-page-break` class to every block that crosses a page
 * boundary. The library then moves such blocks entirely onto the next
 * page. If a block is taller than a full printable page (rare, but possible
 * with very long descriptions), it is left unmarked so it can split freely
 * instead of producing an empty page.
 */

/** A4 portrait height in mm (jsPDF unit used by ExportService). */
export const A4_HEIGHT_MM = 297;

/** Top/bottom content padding of #resume-container in mm. */
export const CONTAINER_PADDING_MM = 20;

/** CSS px per physical mm at 96dpi (CSS spec: 1in = 96px = 25.4mm). */
export const PX_PER_MM = 96 / 25.4;

/**
 * Height of one printable slice in CSS pixels: the part of the canvas
 * html2pdf.js maps onto a single A4 page after margins are applied.
 *
 * @param containerHeightPx measured scrollHeight of the resume container
 */
export function getSliceHeightPx(containerHeightPx: number): number {
  const pageHeightPx = A4_HEIGHT_MM * PX_PER_MM;
  // With margin [0,0,0,0] html2pdf scales the whole canvas to fit page width,
  // so each slice is exactly one page tall in the same scale.
  if (!containerHeightPx || containerHeightPx <= 0) return pageHeightPx;
  return pageHeightPx;
}

/** Returns true when the element's top edge falls inside the forbidden
 *  bottom zone of its current page (where content would be clipped). */
export function crossesPageBoundary(
  elementTopPx: number,
  elementBottomPx: number,
  offsetTopPx: number,
  sliceHeightPx: number,
  safetyZonePx: number = 0
): boolean {
  const relTop = elementTopPx - offsetTopPx;
  const relBottom = elementBottomPx - offsetTopPx;
  if (sliceHeightPx <= 0) return false;
  const pageIndex = Math.floor(relTop / sliceHeightPx);
  const pageEnd = (pageIndex + 1) * sliceHeightPx;
  // Element ends beyond the page boundary (with optional safety zone)?
  return relBottom > pageEnd - safetyZonePx;
}

/** Collects candidate blocks that must not be split across pages. */
export function collectBreakableBlocks(container: HTMLElement): HTMLElement[] {
  const selectors = [
    '.positioned-block.entity-item',
    '.positioned-block.section-block > h3',
    '.positioned-block.resume-header',
    '.layout-line',
  ];
  const blocks: HTMLElement[] = [];
  selectors.forEach((sel) => {
    container.querySelectorAll<HTMLElement>(sel).forEach((el) => {
      // Skip invisible nodes (zero-height elements produce no meaningful breaks)
      if (el.offsetHeight > 0) blocks.push(el);
    });
  });
  return blocks;
}

export interface PaginationResult {
  /** Number of blocks marked with .avoid-page-break */
  markedCount: number;
  /** Estimated total number of PDF pages */
  pageCount: number;
}

/**
 * Measures the container and marks blocks that cross page boundaries.
 * Must be called while `.pdf-export-mode` styles are applied and the
 * container has its final layout. Returns a cleanup function that
 * removes all added classes.
 */
export function applySmartPageBreaks(container: HTMLElement): PaginationResult & {
  cleanup: () => void;
} {
  const containerRect = container.getBoundingClientRect();
  // html2canvas captures the element at its offset from the TOP of the
  // document (element.offsetTop), not from the current viewport. Use the
  // same reference so our predicted page boundaries match the real slices.
  const containerTopPx = container.offsetTop;
  const containerHeightPx = container.scrollHeight || containerRect.height;
  const sliceHeightPx = getSliceHeightPx(containerHeightPx);

  // Safety zone: if a block ends within ~8px of the boundary, treat it as
  // crossing too - prevents hairline clipping from rounding errors.
  const SAFETY_ZONE_PX = 8;

  const marked: HTMLElement[] = [];
  collectBreakableBlocks(container).forEach((el) => {
    const rect = el.getBoundingClientRect();
    // Absolute position inside the document, matching html2canvas capture.
    const docTop = window.scrollY + rect.top;
    const bottom = docTop + rect.height;
    // Never mark blocks taller than a printable area minus padding:
    // they could never fit on one page and would create blank pages.
    const maxFitHeight = ((A4_HEIGHT_MM - 2 * CONTAINER_PADDING_MM) / A4_HEIGHT_MM) * sliceHeightPx;
    if (rect.height >= maxFitHeight) return;
    if (crossesPageBoundary(docTop, bottom, containerTopPx, sliceHeightPx, SAFETY_ZONE_PX)) {
      el.classList.add('avoid-page-break');
      marked.push(el);
    }
  });

  const pageCount = Math.max(1, Math.ceil(containerHeightPx / sliceHeightPx));

  return {
    markedCount: marked.length,
    pageCount,
    cleanup: () => marked.forEach((el) => el.classList.remove('avoid-page-break')),
  };
}
