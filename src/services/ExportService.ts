/**
 * Export Service - generates a text-based PDF resume.
 *
 * The previous implementation rasterised the preview with html2canvas, which
 * produced a PDF containing a single flat image. Applicant Tracking Systems
 * parse PDFs as text, so such a file reads as empty to them — the exact
 * failure this app is meant to help users avoid. We therefore lay the resume
 * out directly with jsPDF, emitting real, selectable, machine-readable text.
 */
import type { jsPDF as JsPdfType } from 'jspdf';
import { ResumeData, SkillCategory, TimeBoundedEntity } from './../types';

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

/** Vertical rhythm, in millimetres. */
const LINE_HEIGHT = 4.6;
const SECTION_GAP = 5.5;
const ENTITY_GAP = 3.4;
const BULLET_INDENT = 4.5;

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

export class ExportService {
  private jsPdfCtor: typeof JsPdfType | null = null;

  /**
   * Build the resume PDF and trigger a download.
   */
  public async exportToPdf(data: ResumeData, fileName?: string): Promise<void> {
    const doc = await this.createDocument(data);
    doc.save(fileName ?? this.buildFileName(data));
  }

  /**
   * Lay the resume out and return the document without saving it.
   *
   * Kept public so the output can be inspected in tests: `save()` triggers a
   * browser download and is an own property of each instance, so it cannot be
   * stubbed on the prototype.
   */
  public async createDocument(data: ResumeData): Promise<JsPdfType> {
    const JsPdf = await this.loadJsPdf();

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

  /** Start a new page when the next block would overflow the bottom margin. */
  private ensureSpace(doc: JsPdfType, cursorY: number, needed: number): number {
    if (cursorY + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage();
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
    options: { size: number; style?: 'normal' | 'bold'; indent?: number; align?: 'left' | 'center' }
  ): number {
    const { size, style = 'normal', indent = 0, align = 'left' } = options;
    doc.setFont('helvetica', style);
    doc.setFontSize(size);

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

  private renderHeader(doc: JsPdfType, data: ResumeData, cursorY: number): number {
    let y = cursorY;
    const { personal } = data;

    if (personal.name) {
      y = this.writeText(doc, personal.name, y, { size: FONT_NAME, style: 'bold', align: 'center' });
    }
    if (personal.title) {
      y = this.writeText(doc, personal.title, y, { size: FONT_TITLE, align: 'center' });
    }

    // Keep each contact detail as plain text; ATS parsers look for these.
    const contacts = [personal.email, personal.phone, personal.location, personal.github, personal.linkedin]
      .map(value => value?.trim())
      .filter((value): value is string => Boolean(value));

    if (contacts.length) {
      y = this.writeText(doc, contacts.join('  |  '), y, { size: FONT_CONTACT, align: 'center' });
    }

    return y + SECTION_GAP * 0.6;
  }

  /** Draw a section heading with an underline rule. */
  private renderSectionTitle(doc: JsPdfType, title: string, cursorY: number): number {
    // Keep the heading with at least the first line of its content.
    let y = this.ensureSpace(doc, cursorY, LINE_HEIGHT * 3);
    y = this.writeText(doc, title, y, { size: FONT_SECTION, style: 'bold' });

    doc.setDrawColor(140);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, y - 0.6, PAGE_WIDTH - MARGIN_X, y - 0.6);

    return y + 2;
  }

  private renderEntities(
    doc: JsPdfType,
    title: string,
    entities: TimeBoundedEntity[] | undefined,
    cursorY: number
  ): number {
    if (!entities?.length) return cursorY;

    let y = this.renderSectionTitle(doc, title, cursorY);

    entities.forEach(entity => {
      // Sanitised up front: the heading and period are drawn directly below
      // (not through writeText) so they need the same treatment.
      const heading = sanitizeForPdf(
        [entity.role, entity.institution].filter(Boolean).join(' - ')
      );

      if (heading) {
        y = this.ensureSpace(doc, y, LINE_HEIGHT * 2);
        const period = sanitizeForPdf(entity.period ?? '');

        if (period) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(FONT_BODY);
          const periodWidth = doc.getTextWidth(period);

          // Draw the heading first so text extraction yields a natural
          // reading order ("Role - Company" then the dates) rather than
          // gluing the period onto the front of the line.
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(FONT_BODY);
          // Reserve room so a long heading cannot run into the period.
          const headingLines = doc.splitTextToSize(
            heading,
            CONTENT_WIDTH - periodWidth - 4
          ) as string[];

          const headingTop = y;
          headingLines.forEach((line, index) => {
            if (index > 0) y = this.ensureSpace(doc, y, LINE_HEIGHT);
            doc.text(line, MARGIN_X, y, { baseline: 'top' });
            y += LINE_HEIGHT;
          });

          // Right-align the period on the first heading line.
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(FONT_BODY);
          doc.text(period, PAGE_WIDTH - MARGIN_X - periodWidth, headingTop, { baseline: 'top' });
        } else {
          y = this.writeText(doc, heading, y, { size: FONT_BODY, style: 'bold' });
        }
      } else if (entity.period) {
        y = this.writeText(doc, entity.period, y, { size: FONT_BODY });
      }

      entity.description?.filter(Boolean).forEach(line => {
        // A hyphen bullet keeps the text extractable; glyph bullets often
        // decode as garbage in the standard PDF fonts.
        y = this.writeText(doc, `- ${line}`, y, { size: FONT_BODY, indent: BULLET_INDENT });
      });

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

    let y = this.renderSectionTitle(doc, 'SKILLS', cursorY);

    const plain = skills.filter((skill): skill is string => typeof skill === 'string');
    const grouped = skills.filter((skill): skill is SkillCategory => typeof skill !== 'string');

    if (plain.length) {
      y = this.writeText(doc, plain.join(', '), y, { size: FONT_BODY });
    }

    grouped.forEach(group => {
      const items = group.items?.filter(Boolean).join(', ') ?? '';
      const text = group.category ? `${group.category}: ${items}` : items;
      if (text.trim()) {
        y = this.writeText(doc, text, y, { size: FONT_BODY });
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
