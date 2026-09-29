/**
 * Export Service — turns the on-screen preview into a WYSIWYG A4 PDF.
 *
 * The PDF the user receives must be the resume they saw: same design, same
 * theme, same fonts, colors, alignment and localized headings. Re-laying the
 * data out with a hand-written jsPDF layout (the old approach) could never
 * keep up with 30 CSS themes, so the export now works directly from the
 * rendered preview:
 *
 *   1. `preview-capture.ts` rasterises the staged preview into A4 pages and
 *      measures every visible word.
 *   2. Each page is placed in the PDF as its exact visual snapshot.
 *   3. An invisible text layer (PDF text rendering mode 3) is drawn on top
 *      of each page from the measured words. The text is real, selectable
 *      and extractable — ATS parsers and copy/paste still work — while the
 *      visible content is pixel-identical to the preview.
 */
import type { jsPDF as JsPdfType } from 'jspdf';
import { ResumeData } from './../types';
import {
  capturePreviewPages,
  CapturedPreview,
  PreviewPage
} from './preview-capture';

/**
 * Strip characters the invisible PDF text layer cannot encode.
 *
 * The text layer uses the embedded Inter font (full Latin + Cyrillic +
 * Greek coverage). Emoji (very common in GitHub repository descriptions)
 * and CJK text are not covered by that font — jsPDF would emit raw UTF-16
 * bytes, turning the line into "\u0000A\u0000w\u0000e..." garbage for every
 * text extractor. Those characters stay visible — they are part of the page
 * raster — they just don't reach the text layer.
 */
export function sanitizeForPdf(text: string): string {
  return text
    // Emoji, pictographs, symbols, flags and variation selectors.
    .replace(
      /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}\u{200D}]/gu,
      ''
    )
    // GitHub shorthand such as ":zap:" that renders as an emoji on the site.
    .replace(/:[a-z0-9_+-]+:/gi, '')
    // Anything outside Inter's coverage (CJK and other scripts) that would
    // corrupt the text layer. Latin, Greek and Cyrillic are kept.
    .replace(
      /[^\u0000-\u036F\u0370-\u03FF\u0400-\u052F\u2010-\u2015\u2018-\u201D\u2022\u2026\u20AC]/g,
      ''
    )
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** CSS px → PDF pt at the standard 96 dpi. */
const PX_TO_PT = 72 / 96;
/** Where the text baseline sits inside a line box, roughly. */
const BASELINE_RATIO = 0.8;

/**
 * Page raster encoding.
 *
 * A lossless PNG of a text page at 192 dpi weighs megabytes — a multi-page
 * export landed north of 20 MB. Pages are therefore embedded as JPEG: at
 * quality 0.92 the anti-aliased text is visually indistinguishable from the
 * preview, and a full A4 page drops to a few hundred kilobytes. jsPDF
 * passes JPEG bytes through untouched (DCTDecode), so the PDF weighs
 * essentially the sum of its page images.
 */
const PAGE_IMAGE_FORMAT = 'JPEG';
const PAGE_IMAGE_QUALITY = 0.92;

/** Name under which the text-layer font is registered in jsPDF. */
const TEXT_FONT = 'Inter';

/**
 * Embedded text-layer font (lazy).
 *
 * jsPDF's built-in Helvetica cannot encode Cyrillic, so a Russian resume's
 * invisible text layer would come out empty and unreadable to ATS parsers.
 * The same Inter family the preview uses is embedded as a TTF, giving the
 * text layer full Latin + Cyrillic + Greek coverage. The shipped files are
 * statically subset to exactly the ranges `sanitizeForPdf` keeps (and
 * stripped of hinting/layout tables), which cuts them from ~320 KB to
 * ~77 KB each; flate-compressed in the PDF they cost ~40 KB per document.
 * Loaded once, lazily, on first export; if the fetch fails the layer
 * silently falls back to Helvetica (Latin resumes are unaffected).
 */
let embeddedFontCache: { regular: string; bold: string } | null = null;

async function loadFontAsset(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font asset unavailable: ${url}`);
  const buffer = await response.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function loadEmbeddedFonts(): Promise<{ regular: string; bold: string }> {
  if (embeddedFontCache) return embeddedFontCache;

  const [regularUrl, boldUrl] = await Promise.all([
    import('../assets/fonts/Inter-Regular.ttf?url').then(module => module.default),
    import('../assets/fonts/Inter-Bold.ttf?url').then(module => module.default)
  ]);
  const [regular, bold] = await Promise.all([loadFontAsset(regularUrl), loadFontAsset(boldUrl)]);

  embeddedFontCache = { regular, bold };
  return embeddedFontCache;
}

export class ExportService {
  private jsPdfCtor: typeof JsPdfType | null = null;

  /**
   * Capture the live preview and download it as a PDF.
   *
   * `container` is the live `#resume-container` — the single source of truth
   * for both the visuals and (through `readResumeFromDom`) the text.
   */
  public async exportToPdf(
    container: HTMLElement,
    data: ResumeData,
    fileName?: string
  ): Promise<void> {
    const capture = await capturePreviewPages(container);
    const doc = await this.createDocument(capture, data);
    doc.save(fileName ?? this.buildFileName(data));
  }

  /**
   * Assemble the PDF from a captured preview without saving it.
   *
   * Kept public (and taking the capture as input) so tests can feed a fake
   * capture and inspect the produced document.
   */
  public async createDocument(
    capture: CapturedPreview,
    data: ResumeData
  ): Promise<JsPdfType> {
    const JsPdf = await this.loadJsPdf();

    const doc = new JsPdf({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    // PDF metadata is indexed by many parsers, so fill it in properly.
    const name = data.personal.name?.trim() || 'Resume';
    doc.setProperties({
      title: `${name} - Resume`,
      subject: data.personal.title ?? '',
      author: name,
      creator: 'github-link2pdf'
    });

    const textFontFamily = (await this.embedTextLayerFont(doc)) ? TEXT_FONT : 'helvetica';

    capture.pages.forEach((page, index) => {
      if (index > 0) doc.addPage();
      this.renderPageImage(doc, page);
      this.writeInvisibleTextLayer(doc, page, capture.sheetWidthPx, textFontFamily);
    });

    return doc;
  }

  /** Derive a download name such as `ada-lovelace-resume.pdf`. */
  public buildFileName(data: ResumeData): string {
    return `${this.slugify(data.personal.name ?? '')}-resume.pdf`;
  }

  /**
   * Start loading jsPDF before the user actually clicks export (e.g. on
   * hover or keyboard focus of the export button) so the export feels
   * instant. Failures are swallowed — a real export call retries and
   * surfaces any error to the user then.
   */
  public prefetchPdf(): void {
    this.loadJsPdf().catch(() => undefined);
  }

  /**
   * Place one page's raster, scaled to fill the A4 page exactly.
   *
   * JPEG (see PAGE_IMAGE_FORMAT): jsPDF passes the encoded bytes through
   * with DCTDecode, so no re-compression bloat happens and the page costs
   * what the browser's encoder produced. The raster is drawn on a white
   * background by the capture stage, so the opaque JPEG has no artifacts
   * from fake transparency.
   */
  private renderPageImage(doc: JsPdfType, page: PreviewPage): void {
    doc.addImage(
      page.canvas.toDataURL(PAGE_IMAGE_FORMAT, PAGE_IMAGE_QUALITY),
      PAGE_IMAGE_FORMAT,
      0,
      0,
      page.widthMm,
      page.heightMm
    );
  }

  /**
   * Register the embedded Inter TTFs for the invisible text layer.
   *
   * Per-document: jsPDF font registration is instance-scoped, so every new
   * document registers the (cached) font binaries again. Failure is
   * non-fatal: the layer falls back to Helvetica, which covers Latin
   * resumes; Cyrillic words are then filtered out by sanitizeForPdf instead
   * of corrupting the content stream.
   */
  private async embedTextLayerFont(doc: JsPdfType): Promise<boolean> {
    try {
      const { regular, bold } = await loadEmbeddedFonts();
      doc.addFileToVFS(`${TEXT_FONT}-Regular.ttf`, regular);
      doc.addFont(`${TEXT_FONT}-Regular.ttf`, TEXT_FONT, 'normal');
      doc.addFileToVFS(`${TEXT_FONT}-Bold.ttf`, bold);
      doc.addFont(`${TEXT_FONT}-Bold.ttf`, TEXT_FONT, 'bold');
      return true;
    } catch {
      // Helvetica fallback — Latin text still reaches the layer.
      return false;
    }
  }

  /**
   * Draw the page's words again as invisible text.
   *
   * Rendering mode 3 ("invisible") paints nothing, but the text stays in
   * the content stream: PDF viewers can select and search it, and ATS
   * parsers read it like any other text layer. Positions are derived from
   * the same word boxes the page was cut with, so highlight order follows
   * the visible layout.
   */
  private writeInvisibleTextLayer(
    doc: JsPdfType,
    page: PreviewPage,
    sheetWidthPx: number,
    fontFamily: string
  ): void {
    const mmPerPx = page.widthMm / Math.max(sheetWidthPx, 1);

    for (const word of page.words) {
      const text = sanitizeForPdf(word.text);
      if (!text) continue;

      doc.setFont(fontFamily, word.bold ? 'bold' : 'normal');
      doc.setFontSize(Math.max(1, word.fontSizePx * PX_TO_PT));
      doc.text(text, word.xPx * mmPerPx, (word.topPx + word.heightPx * BASELINE_RATIO) * mmPerPx, {
        renderingMode: 'invisible',
        baseline: 'alphabetic'
      });
    }
  }

  /**
   * Load jsPDF on demand so its weight stays out of the initial page load.
   */
  private async loadJsPdf(): Promise<typeof JsPdfType> {
    if (this.jsPdfCtor) return this.jsPdfCtor;

    try {
      const module = await import('jspdf');
      this.jsPdfCtor = module.jsPDF;
    } catch {
      throw new Error('Failed to load PDF export library');
    }

    return this.jsPdfCtor;
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'resume'
    );
  }
}
