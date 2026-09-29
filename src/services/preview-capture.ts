/**
 * WYSIWYG capture of the on-screen resume preview.
 *
 * The export must be "what the user saw": the same theme, fonts, colors,
 * alignment and localized section headings they picked in the UI. The only
 * way to guarantee that is to render the actual preview DOM instead of
 * re-laying the data out from scratch (the old approach — a hand-written
 * jsPDF layout — produced a generic document that looked nothing like the
 * preview and ignored the chosen design entirely).
 *
 * Pipeline:
 *   1. Clone the preview into an off-screen staging area (`export-stage`)
 *      where the same theme CSS applies (theme rules are class-based), the
 *      sheet is forced to exact A4 width, and UI-only artefacts (empty
 *      placeholder hints, unfilled sections) are stripped exactly like the
 *      `@media print` rules do.
 *   2. Measure every visible word with DOM Ranges. The word boxes drive
 *      (a) smart page breaks — cut between lines, never through one — and
 *      (b) the invisible text layer the PDF gets on top of each rasterised
 *      page, so the file stays selectable and machine-readable for ATS.
 *   3. Rasterise the sheet page by page (each page is a 210×297 mm frame
 *      with `overflow: hidden`, so cropping happens in the browser layout
 *      engine — no pixel math on the canvas).
 *
 * The rasterizer is injectable so tests can run the whole pipeline without
 * a real canvas.
 */

/** A4 geometry in millimetres (kept in sync with ExportService). */
export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;

/**
 * Raster scale in canvas px per CSS px. 2 ≈ 192 dpi on A4 — crisp on screen
 * and in print, without the memory cost of a full 300 dpi page.
 */
const DEFAULT_RASTER_SCALE = 2;

/** One visible word with its box, in CSS px relative to the sheet. */
export interface TextWord {
  text: string;
  xPx: number;
  topPx: number;
  bottomPx: number;
  heightPx: number;
  fontSizePx: number;
  bold: boolean;
  /** True when the word belongs to a section/person heading. */
  inHeading: boolean;
}

/** One A4 page: the raster plus the words painted on it. */
export interface PreviewPage {
  canvas: HTMLCanvasElement;
  widthMm: number;
  heightMm: number;
  words: TextWord[];
}

export interface CapturedPreview {
  pages: PreviewPage[];
  /** CSS px width of the staged sheet — the basis of the px→mm mapping. */
  sheetWidthPx: number;
}

export type Rasterizer = (element: HTMLElement, scale: number) => Promise<HTMLCanvasElement>;

export interface CaptureOptions {
  /** Canvas px per CSS px. Default `DEFAULT_RASTER_SCALE`. */
  scale?: number;
  /** Injectable renderer. Defaults to html2canvas-pro (lazy-loaded). */
  rasterize?: Rasterizer;
}

/* ------------------------------------------------------------------ *
 * Page-break tuning
 *
 * Breaks snap to the bottom edge of a block or a text line within
 * `BREAK_WINDOW` of the ideal cut; if nothing qualifies (one giant
 * element taller than a page) we fall back to a hard cut, exactly like a
 * printer would. A page is never left less than `MIN_PAGE_FILL` full —
 * that would look like a rendering bug rather than a break.
 * ------------------------------------------------------------------ */
const BREAK_WINDOW = 0.18;
const MIN_PAGE_FILL = 0.2;
/** Words whose tops differ by less than this are on the same line. */
const LINE_TOLERANCE_PX = 4;

/**
 * Capture the live preview as A4 pages.
 *
 * `container` is the live `#resume-container`. It is never mutated; all
 * staging happens on a clone.
 */
export async function capturePreviewPages(
  container: HTMLElement,
  options: CaptureOptions = {}
): Promise<CapturedPreview> {
  if (!container.isConnected) {
    throw new Error('Resume preview is not in the document');
  }

  const scale = options.scale ?? DEFAULT_RASTER_SCALE;
  const rasterize = options.rasterize ?? defaultRasterizer;

  // A live text selection would paint its highlight into the raster.
  window.getSelection()?.removeAllRanges();
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  const stage = createStage();
  try {
    await settleLayout();

    const sheet = buildStageSheet(container);
    stage.appendChild(sheet);

    const sheetRect = sheet.getBoundingClientRect();
    const sheetWidthPx = sheetRect.width;
    const pageHeightPx = A4_HEIGHT_MM * (sheetWidthPx / A4_WIDTH_MM);
    const sheetHeightPx = Math.max(sheet.scrollHeight, sheetRect.height);

    const words = measureWords(sheet);
    const candidates = collectBreakCandidates(sheet, words);
    const cuts = computePageCuts(sheetHeightPx, candidates, pageHeightPx);

    const pages: PreviewPage[] = [];
    let frame: HTMLElement | null = null;

    for (let index = 0; index < cuts.length; index++) {
      const startPx = cuts[index];
      const endPx =
        index + 1 < cuts.length
          ? cuts[index + 1]
          : Math.max(sheetHeightPx, startPx + pageHeightPx);

      // Move the sheet into a fresh page frame; `margin-top` does the
      // cropping together with the frame's `overflow: hidden`.
      if (frame) frame.remove();
      frame = document.createElement('div');
      frame.className = 'resume-page-frame';
      sheet.style.marginTop = `${-startPx}px`;
      frame.appendChild(sheet);
      stage.appendChild(frame);

      const canvas = await rasterize(frame, scale);
      pages.push({
        canvas,
        widthMm: A4_WIDTH_MM,
        heightMm: A4_HEIGHT_MM,
        words: words.filter(word => word.topPx >= startPx - 0.5 && word.topPx < endPx - 0.5)
      });
    }

    return { pages, sheetWidthPx };
  } finally {
    stage.remove();
  }
}

/* ------------------------------------------------------------------ *
 * Staging
 * ------------------------------------------------------------------ */

/**
 * Clone the preview into a clean A4 sheet for capture.
 *
 * The clone drops the id (CSS is class-based, and duplicate ids would break
 * `getElementById` while the export runs), the contenteditable plumbing, and
 * every empty placeholder — the on-screen hints ("Job title — Company") are
 * editor affordances, not resume content, so they must not be exported.
 * Sections the user left completely empty disappear with them, mirroring the
 * `@media print` rules.
 */
export function buildStageSheet(container: HTMLElement): HTMLElement {
  const sheet = container.cloneNode(true) as HTMLElement;

  sheet.removeAttribute('id');
  sheet.removeAttribute('contenteditable');
  sheet.removeAttribute('spellcheck');
  sheet.removeAttribute('aria-label');
  sheet.removeAttribute('role');

  // Empty fields and hints first, then sections that are still fully empty.
  sheet.querySelectorAll<HTMLElement>('[data-placeholder]').forEach(el => {
    if (!el.textContent?.trim()) el.remove();
  });
  sheet.querySelectorAll<HTMLElement>('.section-empty').forEach(el => {
    // Only drop the section when no data field inside it has content — the
    // separators (" - ") between fields are not content. The section-empty
    // class can linger after the user starts typing (it is cleared on the
    // next re-render), and removing a section with typed content would
    // silently lose their work.
    const hasContent = Array.from(el.querySelectorAll<HTMLElement>('[data-field]')).some(
      field => field.textContent?.trim()
    );
    if (!hasContent) el.remove();
  });

  const style = sheet.style;
  style.width = `${A4_WIDTH_MM}mm`;
  style.maxWidth = 'none';
  style.minHeight = `${A4_HEIGHT_MM}mm`;
  style.margin = '0';
  style.flex = '0 0 auto';
  style.transform = 'none';
  // Screen chrome that must not leak into the document.
  style.borderRadius = '0';
  style.boxShadow = 'none';
  style.outline = 'none';
  style.resize = 'none';

  return sheet;
}

function createStage(): HTMLElement {
  const stage = document.createElement('div');
  stage.className = 'export-stage';
  document.body.appendChild(stage);
  return stage;
}

/**
 * Wait until webfonts are loaded and the staged layout is flushed, so the
 * raster uses exactly the fonts and line breaks the user saw.
 */
async function settleLayout(): Promise<void> {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    try {
      await document.fonts.ready;
    } catch {
      // A font that fails to load must not block the export; the fallback
      // font is what the user sees anyway.
    }
  }
  if (typeof requestAnimationFrame === 'function') {
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
  }
}

/* ------------------------------------------------------------------ *
 * Text measurement
 * ------------------------------------------------------------------ */

/**
 * Measure every visible word of the sheet via DOM Ranges.
 *
 * Per-word boxes give both the page-break candidates (line bottoms) and the
 * coordinates of the invisible text layer. In environments without layout
 * (jsdom tests) this simply yields no words.
 */
export function measureWords(sheet: HTMLElement): TextWord[] {
  const sheetRect = sheet.getBoundingClientRect();
  const words: TextWord[] = [];
  const range = document.createRange();
  // Environments without a layout engine (jsdom) may not implement range
  // geometry at all; then there is simply nothing to measure.
  const canMeasure = typeof range.getClientRects === 'function';
  const walker = document.createTreeWalker(sheet, NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();
  while (node) {
    const textNode = node as Text;
    node = walker.nextNode();

    const text = textNode.nodeValue ?? '';
    const parent = textNode.parentElement;
    if (!text.trim() || !parent) continue;

    const style = window.getComputedStyle(parent);
    if (style.display === 'none' || style.visibility === 'hidden') continue;

    const inHeading = parent.closest('h1, h2, h3') !== null;
    const fontSizePx = parseFloat(style.fontSize) || 16;
    const bold = parseInt(style.fontWeight, 10) >= 600;

    const pattern = /\S+/g;
    let match: RegExpExecArray | null;
    while (canMeasure && (match = pattern.exec(text)) !== null) {
      range.setStart(textNode, match.index);
      range.setEnd(textNode, match.index + match[0].length);
      const rects = range.getClientRects();
      if (!rects.length) continue;
      const rect = rects[0];
      words.push({
        text: match[0],
        xPx: rect.left - sheetRect.left,
        topPx: rect.top - sheetRect.top,
        bottomPx: rect.bottom - sheetRect.top,
        heightPx: rect.height,
        fontSizePx,
        bold,
        inHeading
      });
    }
  }

  return words;
}

/* ------------------------------------------------------------------ *
 * Pagination
 * ------------------------------------------------------------------ */

/**
 * Bottom edges (in sheet px) where a page break looks natural: block
 * boundaries and text-line boundaries. Heading bottoms are excluded so a
 * section title is never orphaned at the bottom of a page.
 */
export function collectBreakCandidates(sheet: HTMLElement, words: TextWord[]): number[] {
  const sheetTop = sheet.getBoundingClientRect().top;
  const candidates = new Set<number>();

  sheet.querySelectorAll<HTMLElement>('.positioned-block, .entity-item, li, p, ul').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) return;
    if (el.closest('h1, h2, h3')) return;
    candidates.add(rect.bottom - sheetTop);
  });

  // Line bottoms from the measured words — this is what keeps a break from
  // slicing through a line of text inside a long paragraph.
  let lineTop = -Infinity;
  let lineBottom = -Infinity;
  const sorted = [...words].filter(word => !word.inHeading).sort((a, b) => a.topPx - b.topPx);
  for (const word of sorted) {
    if (word.topPx - lineTop > LINE_TOLERANCE_PX) {
      if (lineBottom > 0) candidates.add(lineBottom);
      lineTop = word.topPx;
    }
    lineBottom = Math.max(lineBottom, word.bottomPx);
  }
  if (lineBottom > 0) candidates.add(lineBottom);

  return [...candidates].sort((a, b) => a - b);
}

/**
 * Pick page start offsets.
 *
 * Pure function so the strategy is unit-testable without a browser: cut as
 * low as possible (fullest page) while staying on a candidate boundary
 * within the tolerance window; fall back to a hard cut when a single block
 * is taller than a page.
 */
export function computePageCuts(
  sheetHeightPx: number,
  candidates: number[],
  pageHeightPx: number
): number[] {
  if (sheetHeightPx <= pageHeightPx + 1) return [0];

  const cuts: number[] = [0];
  let start = 0;
  const epsilon = 1;

  while (start + pageHeightPx < sheetHeightPx - epsilon) {
    const ideal = start + pageHeightPx;
    const windowLow = ideal - pageHeightPx * BREAK_WINDOW;
    const minFill = start + pageHeightPx * MIN_PAGE_FILL;

    let best = -1;
    for (const candidate of candidates) {
      if (candidate <= minFill) continue;
      if (candidate > ideal + epsilon) break;
      best = candidate;
    }
    if (best < windowLow) best = ideal; // hard cut through a tall block
    if (best <= start) best = ideal; // never stall on a bad candidate

    cuts.push(best);
    start = best;
  }

  return cuts;
}

/* ------------------------------------------------------------------ *
 * Rasterizer
 * ------------------------------------------------------------------ */

/**
 * Render one page frame to a canvas with html2canvas-pro.
 *
 * Loaded lazily like jsPDF so the raster engine stays out of the initial
 * bundle. html2canvas-pro is the maintained fork that understands modern
 * CSS color syntax used by the themes.
 */
async function defaultRasterizer(element: HTMLElement, scale: number): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import('html2canvas-pro');
  return html2canvas(element, {
    scale,
    backgroundColor: '#ffffff',
    logging: false,
    useCORS: true,
    // High smoothing keeps small text legible in the raster.
    imageSmoothingQuality: 'high'
  });
}
