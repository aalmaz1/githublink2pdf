/**
 * Export Service - generates the resume PDF for the selected design.
 *
 * Two layers, two guarantees:
 *
 * 1. Visual layer (primary path): the themed preview DOM is rasterised
 *    (html2canvas) and placed on the page — the PDF is pixel-for-pixel what
 *    the user saw on screen, in any design.
 * 2. Text layer (always): real, machine-readable text. On the visual path
 *    it is written in PDF render mode 3 (invisible) at the same coordinates
 *    the DOM shows its text, so Applicant Tracking Systems parse exactly
 *    what the image displays. When a screenshot is impossible (no DOM,
 *    capture failure) the document falls back to the fully visible,
 *    design-themed text layout below.
 *
 * The visible fallback is laid out with the design's visual recipe (see
 * `design-templates.ts`): page backgrounds, header and section background
 * boxes, accent bars, rules, frames, fonts and the theme's text colours.
 */
import type { jsPDF as JsPdfType } from 'jspdf';
import { ResumeData, SkillCategory, TimeBoundedEntity } from './../types';
import { getDesignPdfTheme, isWhite, PdfFont, PdfTheme, Rgb } from './../designs/design-templates';

/** A4 page geometry, in millimetres. */
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN_X = 18;
const MARGIN_TOP = 18;
const MARGIN_BOTTOM = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

/** Typography, in points. */
const FONT_NAME = 12;
const FONT_TITLE = 10.5;
const FONT_CONTACT = 9.5;
const FONT_SECTION = 11;
const FONT_BODY = 9.5;

/** Bounds for the screenshot text layer's per-row font size, in points. */
const FONT_MIN = 5;
const FONT_MAX = 48;

/** Clamp a number into [min, max]. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Vertical rhythm, in millimetres. */
const LINE_HEIGHT = 4.6;
const SECTION_GAP = 5.5;
const ENTITY_GAP = 3.4;
const BULLET_INDENT = 4.5;

/** Box paddings, in millimetres. */
const BOX_PAD_V = 1.3;
const BOX_PAD_H = 4;
const CHIP_PAD_V = 2;
const CHIP_PAD_H = 4;

const JSPDF_FONTS: Record<PdfFont, string> = {
  sans: 'helvetica',
  serif: 'times',
  mono: 'courier'
};

/**
 * Strip characters the PDF core fonts cannot encode.
 *
 * jsPDF's built-in Helvetica is a single-byte font. Handing it an emoji (very
 * common in GitHub repository descriptions) makes it emit the raw UTF-16
 * bytes, so the line turns into "\u0000A\u0000w\u0000e..." garbage in every PDF
 * reader and in any ATS parsing the file. Dropping the unsupported glyphs
 * keeps the surrounding sentence readable and machine-parsable.
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
    // Anything else outside Latin-1 that the core fonts cannot represent.
    .replace(/[^\u0000-\u024F\u2010-\u2015\u2018-\u201D\u2022\u2026\u20AC]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** One visible text row of the preview, positioned in container pixels. */
export interface TextRow {
  /** Offset from the container's left edge, in px. */
  x: number;
  /** Offset from the container's top edge, in px. */
  y: number;
  /** Rendered line width in px (wrapping hint for the text layer). */
  width: number;
  /** Rendered font size converted to points. */
  sizePt: number;
  text: string;
}

/**
 * Elements that carry an atomic text row of the preview (see
 * `resume-builder.ts`). None of them nest inside another, so matching each
 * element once yields every visible line exactly once, in document order.
 *
 * Empty placeholder rows (the click-to-edit hints) have no text content and
 * are dropped, so they never reach the PDF — as they never reach any export.
 */
const TEXT_ROW_SELECTOR = 'h1, h2, h3, p, .layout-line, li';

/**
 * Collect the preview's visible text rows with their on-screen positions.
 *
 * Feeds the invisible text layer of the screenshot PDF: the text lands at
 * the same coordinates the image was captured from, so what an ATS parser
 * reads is exactly what the user saw.
 */
export function collectTextRows(container: HTMLElement): TextRow[] {
  const origin = container.getBoundingClientRect();
  const rows: TextRow[] = [];

  const walker = document.createTreeWalker(container, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    const el = node as Element;
    // A blank entry the user has not filled in is a hint, not content —
    // its rows (including the lone "-" separator) stay out of the PDF.
    const insidePlaceholder = el.closest('[data-placeholder-entity]') !== null;
    if (el.matches(TEXT_ROW_SELECTOR) && !insidePlaceholder) {
      const box = el.getBoundingClientRect();
      const text = sanitizeForPdf(el.textContent ?? '');
      if (text && /[a-z0-9а-яёії]/i.test(text)) {
        // CSS px -> pt is 0.75. Some engines report non-numeric shorthand
        // (e.g. "medium"), so fall back to the body size; the clamp keeps
        // odd computed values (0 for hidden leftovers) in a readable range.
        const fontSizePx = parseFloat(window.getComputedStyle(el).fontSize);
        const sizePt = clamp(
          Number.isFinite(fontSizePx) ? fontSizePx * 0.75 : 10,
          FONT_MIN,
          FONT_MAX
        );
        rows.push({
          x: box.left - origin.left,
          y: box.top - origin.top,
          width: Math.max(1, box.width),
          sizePt,
          text
        });
      }
    }
    node = walker.nextNode();
  }

  // Document order already is reading order for this single-column layout;
  // the sort only guards against odd DOM orderings.
  rows.sort((a, b) => a.y - b.y || a.x - b.x);
  return rows;
}

export class ExportService {
  private jsPdfCtor: typeof JsPdfType | null = null;
  /** The design recipe being laid out; set per document. */
  private theme: PdfTheme = getDesignPdfTheme(null);

  /**
   * Build the resume PDF and trigger a download.
   *
   * `designId` is the design currently selected in the UI and `container`
   * the live preview element. When the container is available the PDF is a
   * pixel-perfect screenshot of what the user sees, plus an invisible text
   * layer; otherwise it falls back to the visible themed text layout.
   */
  public async exportToPdf(
    data: ResumeData,
    fileName?: string,
    designId?: string,
    container?: HTMLElement | null
  ): Promise<void> {
    const doc = await this.createDocument(data, designId, container);
    doc.save(fileName ?? this.buildFileName(data));
  }

  /**
   * Lay the resume out and return the document without saving it.
   *
   * Kept public so the output can be inspected in tests: `save()` triggers a
   * browser download and is an own property of each instance, so it cannot be
   * stubbed on the prototype.
   */
  public async createDocument(
    data: ResumeData,
    designId?: string,
    container?: HTMLElement | null
  ): Promise<JsPdfType> {
    if (container) {
      try {
        return await this.createDocumentFromDom(data, designId, container);
      } catch (error) {
        // A failed screenshot must never break the export: fall back to the
        // fully visible themed text layout.
        console.warn('Preview screenshot failed, exporting themed text instead.', error);
      }
    }
    return this.createTextDocument(data, designId);
  }

  /**
   * The primary path: a PDF that is exactly what the preview shows.
   *
   * The themed container is rasterised at 2x and sliced into A4 pages; over
   * the image the same text is written again in render mode 3 (invisible),
   * at the DOM's own coordinates, so ATS parsers extract the very text the
   * user sees, in the very places they see it.
   */
  private async createDocumentFromDom(
    data: ResumeData,
    designId: string | undefined,
    container: HTMLElement
  ): Promise<JsPdfType> {
    const JsPdf = await this.loadJsPdf();
    const module = await import('html2canvas');
    const html2canvas = (module.default ?? module) as (el: HTMLElement, opts?: object) => Promise<HTMLCanvasElement>;
    if (typeof html2canvas !== 'function') {
      throw new Error('Preview screenshot library unavailable');
    }

    const theme = getDesignPdfTheme(designId);

    // 2x for crisp text; relax to 1.5x for very long resumes to keep the
    // intermediate canvas (and the PDF) from getting huge.
    const naturalHeight = container.getBoundingClientRect().height;
    const scale = naturalHeight > 3400 ? 1.5 : 2;
    const canvas = await html2canvas(container, {
      scale,
      useCORS: true,
      logging: false,
      // Any transparent pixel (a theme without an explicit sheet background)
      // takes the design's page colour instead of reading as white.
      backgroundColor: `rgb(${theme.pageBg[0]}, ${theme.pageBg[1]}, ${theme.pageBg[2]})`,
      onclone: (_doc: Document, cloned: HTMLElement) => {
        // Drop UI chrome that belongs to the page, not to the sheet.
        cloned.style.boxShadow = 'none';
        cloned.style.margin = '0';
      }
    });

    const doc = new JsPdf({ unit: 'mm', format: 'a4', orientation: 'portrait' });

    const name = data.personal.name?.trim() || 'Resume';
    doc.setProperties({
      title: `${name} - Resume`,
      subject: data.personal.title ?? '',
      author: name,
      creator: 'github-link2pdf'
    });

    const pxPerMm = canvas.width / PAGE_WIDTH;
    const pageHpx = PAGE_HEIGHT * pxPerMm;
    const pages = Math.max(1, Math.ceil((canvas.height - 0.5) / pageHpx));

    for (let page = 0; page < pages; page += 1) {
      if (page > 0) doc.addPage();

      // Area below a short last page keeps the design's page background.
      if (!isWhite(theme.pageBg)) {
        doc.setFillColor(theme.pageBg[0], theme.pageBg[1], theme.pageBg[2]);
        doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
      }

      const y0 = page * pageHpx;
      const sliceHpx = Math.min(pageHpx, canvas.height - y0);
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = Math.max(1, Math.round(sliceHpx));
      const ctx = slice.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');
      ctx.drawImage(canvas, 0, y0, canvas.width, sliceHpx, 0, 0, canvas.width, sliceHpx);
      doc.addImage(slice.toDataURL('image/png'), 'PNG', 0, 0, PAGE_WIDTH, sliceHpx / pxPerMm);
    }

    // Invisible text layer: the DOM's own text at the DOM's own positions.
    this.writeInvisibleTextLayer(doc, container, pageHpx, pxPerMm, pages);

    return doc;
  }

  /**
   * Write every visible text row of the preview as invisible PDF text
   * (render mode 3 — selectable, extractable, never painted).
   *
   * Each row keeps the size, position and width it has on screen, so the
   * invisible layer sits exactly over what the image shows — parsers that
   * cross-check text against pixels find a match.
   */
  private writeInvisibleTextLayer(
    doc: JsPdfType,
    container: HTMLElement,
    pageHpx: number,
    pxPerMm: number,
    pages: number
  ): void {
    const rows = collectTextRows(container);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    for (let page = 0; page < pages; page += 1) {
      doc.setPage(page + 1);
      const y0 = page * pageHpx;
      for (const row of rows) {
        if (row.y < y0 || row.y >= y0 + pageHpx) continue;
        doc.setFontSize(row.sizePt);
        // maxWidth makes multi-line rows wrap like they do on screen.
        doc.text(row.text, row.x / pxPerMm, (row.y - y0) / pxPerMm, {
          baseline: 'top',
          renderingMode: 'invisible',
          maxWidth: row.width / pxPerMm
        });
      }
    }
  }

  /** The visible, design-themed text layout (fallback and testable path). */
  private createTextDocument(data: ResumeData, designId?: string): Promise<JsPdfType> {
    return this.layoutText(data, designId);
  }

  private async layoutText(data: ResumeData, designId?: string): Promise<JsPdfType> {
    const JsPdf = await this.loadJsPdf();
    this.theme = getDesignPdfTheme(designId);

    const doc = new JsPdf({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    doc.setFont('helvetica', 'normal');

    // PDF metadata is indexed by many parsers, so fill it in properly.
    const name = data.personal.name?.trim() || 'Resume';
    doc.setProperties({
      title: `${name} - Resume`,
      subject: data.personal.title ?? '',
      author: name,
      creator: 'github-link2pdf'
    });

    this.paintPage(doc);

    let cursorY = MARGIN_TOP;
    cursorY = this.renderHeader(doc, data, cursorY);
    cursorY = this.renderEntities(doc, 'EXPERIENCE', data.experience, cursorY);
    cursorY = this.renderEntities(doc, 'PROJECTS', data.projects, cursorY);
    cursorY = this.renderEntities(doc, 'EDUCATION', data.education, cursorY);
    this.renderSkills(doc, data.skills, cursorY);

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

  /**
   * Paint the design's page decorations: background fill, top bar, side
   * bars and the full-page frame. Called for every page, since jsPDF pages
   * start blank.
   */
  private paintPage(doc: JsPdfType): void {
    const t = this.theme;

    if (!isWhite(t.pageBg)) {
      doc.setFillColor(t.pageBg[0], t.pageBg[1], t.pageBg[2]);
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, 'F');
    }

    if (t.topBar) {
      doc.setFillColor(t.topBar[0], t.topBar[1], t.topBar[2]);
      doc.rect(0, 0, PAGE_WIDTH, 1.8, 'F');
    }

    if (t.sideBars) {
      doc.setFillColor(t.sideBars[0], t.sideBars[1], t.sideBars[2]);
      doc.rect(0, 0, 1, PAGE_HEIGHT, 'F');
      doc.rect(PAGE_WIDTH - 1, 0, 1, PAGE_HEIGHT, 'F');
    }

    if (t.frame) {
      doc.setDrawColor(t.frame[0], t.frame[1], t.frame[2]);
      doc.setLineWidth(0.4);
      const inset = 5;
      doc.rect(inset, inset, PAGE_WIDTH - inset * 2, PAGE_HEIGHT - inset * 2);
      if (t.frameDouble) {
        const inner = inset + 1;
        doc.rect(inner, inner, PAGE_WIDTH - inner * 2, PAGE_HEIGHT - inner * 2);
      }
    }
  }

  /** Start a new page when the next block would overflow the bottom margin. */
  private ensureSpace(doc: JsPdfType, cursorY: number, needed: number): number {
    if (cursorY + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage();
      this.paintPage(doc);
      return MARGIN_TOP;
    }
    return cursorY;
  }

  /**
   * Write wrapped text and return the new vertical cursor.
   */
  private writeText(
    doc: JsPdfType,
    text: string,
    cursorY: number,
    options: {
      size: number;
      style?: 'normal' | 'bold' | 'italic' | 'bolditalic';
      font?: PdfFont;
      indent?: number;
      align?: 'left' | 'center';
      color?: Rgb;
    }
  ): number {
    const { size, style = 'normal', font = 'sans', indent = 0, align = 'left', color = [0, 0, 0] } = options;
    doc.setFont(JSPDF_FONTS[font], style);
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);

    const maxWidth = CONTENT_WIDTH - indent;
    const lines = doc.splitTextToSize(sanitizeForPdf(text), maxWidth) as string[];
    let y = cursorY;

    for (const line of lines) {
      y = this.ensureSpace(doc, y, LINE_HEIGHT);
      const x = align === 'center' ? PAGE_WIDTH / 2 : MARGIN_X + indent;
      doc.text(line, x, y, { align: align === 'center' ? 'center' : undefined, baseline: 'top' });
      y += LINE_HEIGHT;
    }

    return y;
  }

  /** Draw a horizontal rule; `double` draws a second, close line beneath. */
  private drawRule(
    doc: JsPdfType,
    y: number,
    color: Rgb,
    options: { double?: boolean; width?: number; centered?: boolean; thickness?: number } = {}
  ): void {
    const { double = false, width = 0, centered = false, thickness = 0.5 } = options;
    doc.setDrawColor(color[0], color[1], color[2]);
    doc.setLineWidth(thickness);

    if (centered && width > 0) {
      const half = width / 2;
      doc.line(PAGE_WIDTH / 2 - half, y, PAGE_WIDTH / 2 + half, y);
    } else {
      doc.line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
    }
    if (double) {
      doc.line(MARGIN_X, y + 0.9, PAGE_WIDTH - MARGIN_X, y + 0.9);
    }
  }

  /**
   * Render the header block: name, job title and contact line, on top of
   * the design's header decorations (background block, name chip, rules).
   */
  private renderHeader(doc: JsPdfType, data: ResumeData, cursorY: number): number {
    const t = this.theme;
    const { personal } = data;
    const nameFont = JSPDF_FONTS[t.nameFont];
    const nameStyle = t.nameItalic ? 'bolditalic' : 'bold';

    // Pre-measure the header text so background boxes can be sized before
    // anything is drawn (jsPDF has no "draw behind" mode).
    const nameRaw = personal.name
      ? sanitizeForPdf(t.nameUppercase ? personal.name.toUpperCase() : personal.name)
      : '';
    doc.setFont(nameFont, nameStyle);
    doc.setFontSize(FONT_NAME);
    const nameLines = nameRaw ? (doc.splitTextToSize(nameRaw, CONTENT_WIDTH - 4) as string[]) : [];
    const nameH = nameLines.length * LINE_HEIGHT;
    const nameW = nameLines.reduce((max, line) => Math.max(max, doc.getTextWidth(line)), 0);

    const contacts = [personal.email, personal.phone, personal.location, personal.github, personal.linkedin]
      .map(value => value?.trim())
      .filter((value): value is string => Boolean(value));

    const titleRaw = personal.title ? sanitizeForPdf(personal.title) : '';
    doc.setFont(JSPDF_FONTS[t.titleFont], 'normal');
    doc.setFontSize(FONT_TITLE);
    const titleLines = titleRaw ? (doc.splitTextToSize(titleRaw, CONTENT_WIDTH - 4) as string[]) : [];
    const titleH = titleLines.length * LINE_HEIGHT;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(FONT_CONTACT);
    const contactLines = contacts.length
      ? (doc.splitTextToSize(contacts.join('  |  '), CONTENT_WIDTH - 4) as string[])
      : [];
    const contactH = contactLines.length * LINE_HEIGHT;

    const nameRuleH = t.nameRule ? 2.4 : 0;
    const contentTop = cursorY + (t.headerBg ? CHIP_PAD_V : 0);

    // Header background block (Business): one rounded block behind everything.
    const headerBgH = t.headerBg
      ? nameH + titleH + contactH + nameRuleH + CHIP_PAD_V * 2 + 1
      : 0;
    if (t.headerBg) {
      doc.setFillColor(t.headerBg[0], t.headerBg[1], t.headerBg[2]);
      doc.roundedRect(MARGIN_X, cursorY, CONTENT_WIDTH, headerBgH, 2, 2, 'F');
    }

    // Name chip (Bold, Playful): a centred pill behind the name only. Its
    // bottom edge is remembered so the job title does not overlap it.
    let nameChipBottom = 0;
    if (t.nameBox && nameLines.length) {
      const chipW = nameW + CHIP_PAD_H * 2;
      const chipH = nameH + CHIP_PAD_V * 2;
      const chipX = (PAGE_WIDTH - chipW) / 2;
      doc.setFillColor(t.nameBox.fill[0], t.nameBox.fill[1], t.nameBox.fill[2]);
      doc.roundedRect(chipX, contentTop - CHIP_PAD_V, chipW, chipH, t.nameBox.rounded, t.nameBox.rounded, 'F');
      nameChipBottom = contentTop + nameH + CHIP_PAD_V;
    }

    let y = contentTop;

    // Keep each contact detail as plain text; ATS parsers look for these.
    for (const line of nameLines) {
      y = this.ensureSpace(doc, y, LINE_HEIGHT);
      doc.setFont(nameFont, nameStyle);
      doc.setFontSize(FONT_NAME);
      doc.setTextColor(t.name[0], t.name[1], t.name[2]);
      doc.text(line, PAGE_WIDTH / 2, y, { align: 'center', baseline: 'top' });
      y += LINE_HEIGHT;
    }
    // The next line must clear the name chip's bottom padding.
    y = Math.max(y, nameChipBottom);

    if (t.nameRule) {
      y += 0.5;
      this.drawRule(doc, y, t.nameRule, { thickness: 0.6 });
      y += 1.2;
    }

    for (const line of titleLines) {
      y = this.ensureSpace(doc, y, LINE_HEIGHT);
      doc.setFont(JSPDF_FONTS[t.titleFont], 'normal');
      doc.setFontSize(FONT_TITLE);
      doc.setTextColor(t.title[0], t.title[1], t.title[2]);
      doc.text(line, PAGE_WIDTH / 2, y, { align: 'center', baseline: 'top' });
      y += LINE_HEIGHT;
    }

    for (const line of contactLines) {
      y = this.ensureSpace(doc, y, LINE_HEIGHT);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(FONT_CONTACT);
      doc.setTextColor(t.contacts[0], t.contacts[1], t.contacts[2]);
      doc.text(line, PAGE_WIDTH / 2, y, { align: 'center', baseline: 'top' });
      y += LINE_HEIGHT;
    }

    if (t.headerRule && !t.headerBg) {
      this.drawRule(doc, y + 1.2, t.headerRule, { double: t.headerRuleDouble });
      y += 2.6;
    }

    // The first section must start below the header block, not below the
    // last text line (the block keeps its own bottom padding).
    const headerBottom = t.headerBg ? cursorY + headerBgH : y;
    return headerBottom + SECTION_GAP * 0.6;
  }

  /**
   * Draw a section heading with the design's decorations: background box,
   * left accent bar, underline rule, centred alignment and/or uppercase.
   */
  private renderSectionTitle(doc: JsPdfType, title: string, cursorY: number): number {
    const t = this.theme;
    // Keep the heading with at least the first line of its content.
    let y = this.ensureSpace(doc, cursorY, LINE_HEIGHT * 3 + 4);

    const text = sanitizeForPdf(t.sectionUppercase ? title.toUpperCase() : title);
    const font = JSPDF_FONTS[t.sectionFont];
    const style = t.sectionItalic ? 'bolditalic' : 'bold';
    doc.setFont(font, style);
    doc.setFontSize(FONT_SECTION);

    const boxH = LINE_HEIGHT + BOX_PAD_V * 2;
    const boxY = y - BOX_PAD_V;

    if (t.sectionBox) {
      const full = t.sectionBox.full;
      const textW = doc.getTextWidth(text);
      const boxW = full ? CONTENT_WIDTH : textW + BOX_PAD_H * 2;
      const radius = Math.min(t.sectionBox.rounded, boxH / 2);

      if (t.sectionBox.fill) {
        doc.setFillColor(t.sectionBox.fill[0], t.sectionBox.fill[1], t.sectionBox.fill[2]);
        if (radius > 0) doc.roundedRect(MARGIN_X, boxY, boxW, boxH, radius, radius, 'F');
        else doc.rect(MARGIN_X, boxY, boxW, boxH, 'F');
      }
      if (t.sectionBox.outline) {
        doc.setDrawColor(t.sectionBox.outline[0], t.sectionBox.outline[1], t.sectionBox.outline[2]);
        doc.setLineWidth(0.3);
        if (radius > 0) doc.roundedRect(MARGIN_X, boxY, boxW, boxH, radius, radius, 'S');
        else doc.rect(MARGIN_X, boxY, boxW, boxH);
      }
      if (t.sectionRuleTop) {
        this.drawRule(doc, boxY - 0.7, t.sectionRule ?? t.sectionBox.outline ?? [0, 0, 0], { thickness: 0.5 });
      }
    }

    doc.setTextColor(t.section[0], t.section[1], t.section[2]);

    if (t.sectionBox) {
      // Text sits inside the box, clear of the accent bar when there is one
      // (CSS: padding is measured after the left border).
      const indent = t.sectionBar ? 1.2 : 0;
      doc.text(text, MARGIN_X + BOX_PAD_H + indent, y, { baseline: 'top' });
      if (t.sectionBar) {
        doc.setFillColor(t.sectionBar[0], t.sectionBar[1], t.sectionBar[2]);
        doc.rect(MARGIN_X, boxY, 1.2, boxH, 'F');
      }
    } else if (t.sectionAlign === 'center') {
      doc.text(text, PAGE_WIDTH / 2, y, { align: 'center', baseline: 'top' });
    } else {
      if (t.sectionBar) {
        doc.setFillColor(t.sectionBar[0], t.sectionBar[1], t.sectionBar[2]);
        doc.rect(MARGIN_X, y - 0.6, 1.2, LINE_HEIGHT + 1.2, 'F');
        doc.text(text, MARGIN_X + 2.6, y, { baseline: 'top' });
      } else {
        doc.text(text, MARGIN_X, y, { baseline: 'top' });
      }
    }

    let bottom = t.sectionBox ? boxY + boxH : y + LINE_HEIGHT;

    if (t.sectionRule && !t.sectionRuleTop) {
      this.drawRule(doc, bottom + 0.7, t.sectionRule, {
        width: t.sectionRuleWidth,
        centered: t.sectionAlign === 'center' || t.sectionRuleWidth > 0
      });
      bottom += 1.6;
    } else if (t.sectionRule && t.sectionRuleTop) {
      // Academic: rules on both sides of the box.
      this.drawRule(doc, bottom + 0.7, t.sectionRule, { thickness: 0.5 });
      bottom += 1.6;
    }

    return bottom + 2.2;
  }

  private renderEntities(
    doc: JsPdfType,
    title: string,
    entities: TimeBoundedEntity[] | undefined,
    cursorY: number
  ): number {
    if (!entities?.length) return cursorY;

    const t = this.theme;
    const font = t.bodyFont;
    let y = this.renderSectionTitle(doc, title, cursorY);

    entities.forEach(entity => {
      const blockTop = y;

      // Sanitised up front: the heading and period are drawn directly below
      // (not through writeText) so they need the same treatment.
      const role = sanitizeForPdf(entity.role ?? '');
      const institution = sanitizeForPdf(entity.institution ?? '');
      const period = sanitizeForPdf(entity.period ?? '');

      if (role || institution) {
        y = this.ensureSpace(doc, y, LINE_HEIGHT * 2);

        doc.setFont(font, 'normal');
        doc.setFontSize(FONT_BODY);
        const periodWidth = period ? doc.getTextWidth(period) : 0;

        // Draw the heading first so text extraction yields a natural
        // reading order ("Role - Company" then the dates) rather than
        // gluing the period onto the front of the line.
        doc.setFont(font, 'bold');
        doc.setFontSize(FONT_BODY);
        doc.setTextColor(t.heading[0], t.heading[1], t.heading[2]);
        // Reserve room so a long heading cannot run into the period.
        const roleLines = role
          ? (doc.splitTextToSize(role, CONTENT_WIDTH - periodWidth - 4) as string[])
          : [];

        let headingTop = y;
        let headingY = y;
        roleLines.forEach((line, index) => {
          if (index > 0) headingY = this.ensureSpace(doc, headingY, LINE_HEIGHT);
          doc.text(line, MARGIN_X, headingY, { baseline: 'top' });
          headingY += LINE_HEIGHT;
        });

        if (institution) {
          doc.setFont(font, 'normal');
          doc.setFontSize(FONT_BODY);
          doc.setTextColor(t.heading[0], t.heading[1], t.heading[2]);
          const orgLines = doc.splitTextToSize(
            roleLines.length ? `  ${institution}` : institution,
            CONTENT_WIDTH - periodWidth - 4
          ) as string[];
          orgLines.forEach((line, index) => {
            if (index > 0) headingY = this.ensureSpace(doc, headingY, LINE_HEIGHT);
            doc.text(line, MARGIN_X, headingY, { baseline: 'top' });
            headingY += LINE_HEIGHT;
          });
        }

        // Right-align the period on the first heading line.
        if (period) {
          doc.setFont(font, 'normal');
          doc.setFontSize(FONT_BODY);
          doc.setTextColor(t.date[0], t.date[1], t.date[2]);
          doc.text(period, PAGE_WIDTH - MARGIN_X - periodWidth, headingTop, { baseline: 'top' });
        }

        y = headingY;
      } else if (period) {
        y = this.writeText(doc, period, y, { size: FONT_BODY, font, color: t.date });
      }

      entity.description?.filter(Boolean).forEach(line => {
        // A hyphen bullet keeps the text extractable; glyph bullets often
        // decode as garbage in the standard PDF fonts.
        y = this.writeText(doc, `- ${line}`, y, { size: FONT_BODY, font, indent: BULLET_INDENT, color: t.body });
      });

      // Entity accent bar (Swiss, Impact): drawn after the block so it
      // spans exactly the item's height.
      if (t.entityBar) {
        doc.setFillColor(t.entityBar[0], t.entityBar[1], t.entityBar[2]);
        doc.rect(MARGIN_X - 1.8, blockTop - 0.5, 0.9, y - blockTop - ENTITY_GAP + 0.5, 'F');
      }

      y += ENTITY_GAP;
    });

    return y + SECTION_GAP * 0.5;
  }

  private renderSkills(
    doc: JsPdfType,
    skills: (string | SkillCategory)[] | undefined,
    cursorY: number
  ): number {
    if (!skills?.length) return cursorY;

    const t = this.theme;
    const font = t.bodyFont;
    let y = this.renderSectionTitle(doc, 'SKILLS', cursorY);

    const plain = skills.filter((skill): skill is string => typeof skill === 'string');
    const grouped = skills.filter((skill): skill is SkillCategory => typeof skill !== 'string');

    if (plain.length) {
      y = this.writeText(doc, plain.join(', '), y, { size: FONT_BODY, font, color: t.body });
    }

    grouped.forEach(group => {
      const items = group.items?.filter(Boolean).join(', ') ?? '';
      const text = group.category ? `${group.category}: ${items}` : items;
      if (text.trim()) {
        y = this.writeText(doc, text, y, { size: FONT_BODY, font, color: t.body });
      }
    });

    return y;
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
