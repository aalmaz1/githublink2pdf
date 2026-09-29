import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExportService, collectTextRows, sanitizeForPdf } from '../src/services/ExportService';
import { ResumeData } from '../src/types';
import html2canvas from 'html2canvas';

vi.mock('html2canvas', () => ({ default: vi.fn() }));
import {
  contrast,
  DESIGNS,
  ensureReadableOn,
  getDesign,
  getDesignPdfTheme,
  Rgb,
  WHITE
} from '../src/designs/design-templates';

const DESIGNS_IDS = DESIGNS.map(design => design.id);

const data: ResumeData = {
  personal: {
    name: 'Ada Lovelace',
    title: 'Software Engineer',
    email: 'ada@example.com',
    phone: '+15550100',
    location: 'London',
    github: 'github.com/ada',
    linkedin: 'linkedin.com/in/ada'
  },
  experience: [
    {
      institution: 'Analytical Engines',
      role: 'Lead Engineer',
      period: '2020 - Present',
      description: ['Reduced latency by 40 percent.']
    }
  ],
  education: [
    {
      institution: 'Royal Institution',
      role: 'Mathematics',
      period: '2014 - 2018',
      description: ['Graduated with honours.']
    }
  ],
  skills: ['Algorithms', { category: 'Tools', items: ['Git'] }]
};

/**
 * Build the PDF document without triggering a browser download.
 */
async function renderPdf(resume: ResumeData = data, designId?: string) {
  const service = new ExportService();
  return {
    doc: await service.createDocument(resume, designId),
    name: service.buildFileName(resume)
  };
}

/**
 * Pull every explicit colour operator out of the raw PDF bytes, rescaled
 * back to 0-255. jsPDF writes RGB as `r g b rg`/`RG` but collapses
 * greys (black text, the legacy grey rule) to the one-value `n g`/`G` form.
 */
function extractRgbColors(doc: any): Array<[number, number, number]> {
  const raw: string = doc.output('datauristring');
  const binary = Buffer.from(raw.slice(raw.indexOf(',') + 1), 'base64').toString('binary');

  const colors: Array<[number, number, number]> = [];

  // Three-value form: `r g b rg` (fill) / `R G` (stroke).
  for (const match of binary.matchAll(/([\d.]+) ([\d.]+) ([\d.]+) [rR][gG]/g)) {
    colors.push([
      parseFloat(match[1]) * 255,
      parseFloat(match[2]) * 255,
      parseFloat(match[3]) * 255
    ]);
  }
  // One-value form: `n g` / `n G` — jsPDF collapses greys (black text, the
  // legacy grey rule) to this shorter operator.
  for (const match of binary.matchAll(/([\d.]+) [gG]\b/g)) {
    const v = parseFloat(match[1]) * 255;
    colors.push([v, v, v]);
  }

  return colors;
}

function expectColorNear(actual: Array<[number, number, number]>, expected: [number, number, number], tolerance = 2) {
  const found = actual.some(
    ([r, g, b]) =>
      Math.abs(r - expected[0]) <= tolerance &&
      Math.abs(g - expected[1]) <= tolerance &&
      Math.abs(b - expected[2]) <= tolerance
  );
  expect(found, `expected rgb(${expected.join(',')}) among ${JSON.stringify(actual)}`).toBe(true);
}

/**
 * Extract the text jsPDF placed on the page.
 *
 * The PDF content stream stores drawn strings in parentheses, which is
 * exactly what an ATS parser reads — if this comes back empty, the export is
 * an image and unreadable to applicant tracking systems.
 */
function extractText(doc: any): string {
  const raw: string = doc.output('datauristring');
  const base64 = raw.slice(raw.indexOf(',') + 1);
  const binary = Buffer.from(base64, 'base64').toString('binary');

  return Array.from(binary.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g))
    .map(match => match[1].replace(/\\([()\\])/g, '$1'))
    .join('\n');
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('ExportService', () => {
  it('should produce a real PDF document', async () => {
    const { doc } = await renderPdf();
    expect(doc.output('datauristring')).toContain('data:application/pdf');
  });

  it('should embed selectable text, not a rasterised image', async () => {
    const text = extractText((await renderPdf()).doc);

    // An html2canvas-based export would yield no text at all here.
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('Software Engineer');
  });

  it('should include contact details an ATS looks for', async () => {
    const text = extractText((await renderPdf()).doc);

    expect(text).toContain('ada@example.com');
    expect(text).toContain('+15550100');
    expect(text).toContain('github.com/ada');
    expect(text).toContain('linkedin.com/in/ada');
  });

  it('should include every section with its entries', async () => {
    const text = extractText((await renderPdf()).doc);

    expect(text).toContain('EXPERIENCE');
    expect(text).toContain('Lead Engineer');
    expect(text).toContain('Analytical Engines');
    expect(text).toContain('2020 - Present');
    expect(text).toContain('Reduced latency by 40 percent.');

    expect(text).toContain('EDUCATION');
    expect(text).toContain('Royal Institution');

    expect(text).toContain('SKILLS');
    expect(text).toContain('Algorithms');
    expect(text).toContain('Tools: Git');
  });

  it('should name the file after the candidate', async () => {
    expect((await renderPdf()).name).toBe('ada-lovelace-resume.pdf');
  });

  it('should set PDF metadata', async () => {
    const { doc } = await renderPdf();
    const raw: string = doc.output('datauristring');
    const binary = Buffer.from(raw.slice(raw.indexOf(',') + 1), 'base64').toString('binary');

    // Many parsers read the document info dictionary before the page content.
    expect(binary).toContain('Ada Lovelace - Resume');
    expect(binary).toContain('Ada Lovelace');
  });

  it('should paginate long resumes instead of clipping them', async () => {
    const long: ResumeData = {
      ...data,
      experience: Array.from({ length: 12 }, (_, i) => ({
        institution: `Company ${i}`,
        role: `Engineer ${i}`,
        period: `${2000 + i} - ${2001 + i}`,
        description: [
          'Delivered a significant improvement to the platform and its tooling.',
          'Worked across teams to ship features on a predictable schedule.'
        ]
      }))
    };

    const { doc } = await renderPdf(long);

    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(extractText(doc)).toContain('Engineer 11');
  });

  it('should handle a resume with empty optional sections', async () => {
    const sparse: ResumeData = {
      personal: {
        name: 'Grace Hopper',
        title: '',
        email: 'grace@example.com',
        phone: '',
        location: '',
        github: '',
        linkedin: ''
      },
      experience: [],
      education: [],
      skills: []
    };

    const text = extractText((await renderPdf(sparse)).doc);

    expect(text).toContain('Grace Hopper');
    expect(text).not.toContain('EXPERIENCE');
    expect(text).not.toContain('SKILLS');
  });
});

describe('themed PDF export', () => {
  it('should draw the Swiss design: black section bars, white section text, red header rule', async () => {
    const theme = getDesignPdfTheme('swiss');
    const { doc } = await renderPdf(data, 'swiss');
    const colors = extractRgbColors(doc);

    // Black section-title background boxes.
    expectColorNear(colors, theme.sectionBox!.fill!);
    // White section headings on top of them.
    expectColorNear(colors, theme.section);
    // Red rule under the header (Swiss accent).
    expectColorNear(colors, theme.headerRule!);
    // And it must still be text a parser can read. Swiss uppercases the
    // name (its h1 is text-transform: uppercase), so match that casing.
    const text = extractText(doc);
    expect(text).toContain('ADA LOVELACE');
    expect(text).toContain('EXPERIENCE');
  });

  it('should paint dark pages and neon text for dark themes', async () => {
    const theme = getDesignPdfTheme('cyber');
    const { doc } = await renderPdf(data, 'cyber');
    const colors = extractRgbColors(doc);

    // Dark page background, neon body text — as the preview shows.
    expectColorNear(colors, theme.pageBg);
    expectColorNear(colors, theme.body);
    expect(contrast(theme.body, theme.pageBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('should draw the Business header as a filled blue block with white text', async () => {
    const theme = getDesignPdfTheme('business');
    const { doc } = await renderPdf(data, 'business');
    const colors = extractRgbColors(doc);

    expectColorNear(colors, theme.headerBg!);
    // Name, title and contacts turn white inside the block.
    expectColorNear(colors, [255, 255, 255]);
    expect(theme.name).toEqual([255, 255, 255]);
  });

  it('should render the accent name chip for the Bold design', async () => {
    const theme = getDesignPdfTheme('bold');
    const { doc } = await renderPdf(data, 'bold');
    const colors = extractRgbColors(doc);

    // Red chip behind the name, red section bars.
    expectColorNear(colors, theme.nameBox!.fill);
    expectColorNear(colors, theme.sectionBox!.fill!);
    expect(theme.name).toEqual([255, 255, 255]);
  });

  it('should produce different output for different designs', async () => {
    const classic = extractRgbColors((await renderPdf(data, 'classic')).doc);
    const swiss = extractRgbColors((await renderPdf(data, 'swiss')).doc);
    const cyber = extractRgbColors((await renderPdf(data, 'cyber')).doc);

    expect(classic).not.toEqual(swiss);
    expect(swiss).not.toEqual(cyber);
  });

  it('should fall back to the Classic recipe for unknown design ids', () => {
    const classic = getDesignPdfTheme(getDesign('classic')!.id);
    expect(getDesignPdfTheme('no-such-design')).toEqual(classic);
    expect(getDesignPdfTheme()).toEqual(classic);
  });

  it('should keep every text colour legible on the background it is drawn on', () => {
    for (const design of getDesign('classic') ? DESIGNS_IDS : []) {
      const t = getDesignPdfTheme(design);
      const pageBg = t.pageBg;
      const headerBg = t.headerBg ?? pageBg;
      const nameBg = t.nameBox ? t.nameBox.fill : headerBg;
      const sectionBg = t.sectionBox?.fill ?? pageBg;

      const pairs: Array<[string, Rgb, Rgb]> = [
        ['name', t.name, nameBg],
        ['title', t.title, headerBg],
        ['contacts', t.contacts, headerBg],
        ['section', t.section, sectionBg],
        ['body', t.body, pageBg],
        ['heading', t.heading, pageBg],
        ['date', t.date, pageBg]
      ];

      for (const [role, color, bg] of pairs) {
        // Either the resolved contrast meets WCAG AA, or the colour is fully
        // saturated (nothing further to adjust) — e.g. white on a mid-green
        // section bar, which the preview itself uses.
        const saturated = color.every(c => c >= 250) || color.every(c => c <= 5);
        expect(
          contrast(color, bg) >= 4.5 || saturated,
          `${design}/${role} rgb(${color.join(',')}) on rgb(${bg.join(',')}) = ${contrast(color, bg).toFixed(2)}`
        ).toBe(true);
      }
    }
  });

  it('should darken print-hostile accents on white paper, hue preserved', () => {
    // Playful amber fails 4.5:1 on white raw; the resolver darkens it.
    const raw: Rgb = [245, 158, 11];
    const resolved = ensureReadableOn(raw, WHITE);
    expect(contrast(resolved, WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(resolved[0]).toBeLessThan(raw[0]); // pulled down, not greyed out
    expect(resolved[0]).toBeGreaterThan(resolved[2]); // still amber (r > g > b)
  });

  it('should keep neon accents untouched on their dark backgrounds', () => {
    const cyber = getDesignPdfTheme('cyber');
    expect(cyber.name).toEqual([0, 255, 255]); // cyan, unchanged
    expect(cyber.body).toEqual([0, 255, 255]);
    const terminal = getDesignPdfTheme('terminal');
    expect(terminal.name).toEqual([34, 197, 94]); // green, unchanged
  });

  it('should brighten dim text on dark pages until it is legible', () => {
    // #475569 (the default job-title grey) is dim on Cyber's #0a0a0a page.
    const dim: Rgb = [71, 85, 105];
    const resolved = ensureReadableOn(dim, [10, 10, 10]);
    expect(contrast(resolved, [10, 10, 10])).toBeGreaterThanOrEqual(4.5);
    expect(resolved[0]).toBeGreaterThan(dim[0]); // lightened, hue preserved
  });
});

describe('screenshot export (visual layer + invisible text)', () => {
  /** A valid 1x1 PNG for jsPDF's addImage. */
  const ONE_PIXEL_PNG =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  function buildPreviewDom(): HTMLElement {
    document.body.innerHTML = `
      <div id="resume-container">
        <div class="resume-header">
          <h1 class="layout-line">Ada Lovelace</h1>
          <h2 class="layout-line">Software Engineer</h2>
          <p class="layout-line">ada@example.com | London</p>
        </div>
        <div class="section-block">
          <h3>EXPERIENCE</h3>
          <div class="entity-item">
            <div class="layout-line"><strong>Lead Engineer</strong> - <span>Engines</span> <span>2020 - Present</span></div>
            <ul><li>Reduced latency by 40 percent.</li></ul>
          </div>
        </div>
      </div>`;
    return document.getElementById('resume-container') as HTMLElement;
  }

  /** The service creates a canvas per page slice; hand it a working stand-in. */
  function stubSliceCanvas(): void {
    const nativeCreate = document.createElement.bind(document);
    const slice = {
      width: 0,
      height: 0,
      style: {},
      getContext: () => ({ drawImage: vi.fn() }),
      toDataURL: () => ONE_PIXEL_PNG
    };
    vi.spyOn(document, 'createElement').mockImplementation((tag: string, ...rest: unknown[]) => {
      if (tag === 'canvas') return slice as unknown as HTMLCanvasElement;
      return nativeCreate(tag as string, ...(rest as []));
    });
  }

  function rawBinary(doc: any): string {
    const raw: string = doc.output('datauristring');
    return Buffer.from(raw.slice(raw.indexOf(',') + 1), 'base64').toString('binary');
  }

  /**
   * jsdom reports zero-sized boxes, which would make the text layer's
   * maxWidth wrap every character onto its own line. Give the DOM plausible
   * geometry so the layer behaves like it does in a real browser.
   */
  function stubBoxes(widthPx = 1400): void {
    const rect = {
      left: 0,
      top: 0,
      right: widthPx,
      bottom: 24,
      width: widthPx,
      height: 24,
      x: 0,
      y: 0,
      toJSON: () => ({})
    };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect as DOMRect);
  }

  afterEach(() => vi.restoreAllMocks());

  it('screenshots the preview and layers invisible text over it', async () => {
    const container = buildPreviewDom();
    stubSliceCanvas();
    stubBoxes();
    // 1588 x 2200px = 210mm x ~291mm, i.e. a single A4 page.
    (html2canvas as any).mockResolvedValue({ width: 1588, height: 2200 });

    const doc = await new ExportService().createDocument(data, 'swiss', container);

    expect(html2canvas).toHaveBeenCalledWith(container, expect.objectContaining({ scale: 2 }));
    expect(doc.getNumberOfPages()).toBe(1);

    const binary = rawBinary(doc);
    // Render mode 3 ("3 Tr") is the signature of the invisible text layer.
    expect(binary).toContain('3 Tr');
    // ...and that layer carries the preview's text, readable by parsers.
    expect(binary).toContain('Ada Lovelace');
    expect(binary).toContain('Reduced latency by 40 percent.');
  });

  it('splits a long resume into one image slice per A4 page', async () => {
    const container = buildPreviewDom();
    stubSliceCanvas();
    stubBoxes();
    // 4500px tall at 210mm width is just over two A4 pages.
    (html2canvas as any).mockResolvedValue({ width: 1588, height: 4500 });

    const doc = await new ExportService().createDocument(data, 'swiss', container);
    expect(doc.getNumberOfPages()).toBe(3);
  });

  it('falls back to the visible themed text when the screenshot fails', async () => {
    const container = buildPreviewDom();
    (html2canvas as any).mockRejectedValue(new Error('canvas unsupported'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const doc = await new ExportService().createDocument(data, 'swiss', container);
      // The fallback is the fully visible, selectable themed layout
      // (swiss uppercases the name, as on screen).
      expect(extractText(doc)).toContain('ADA LOVELACE');
      expect(extractText(doc)).toContain('EXPERIENCE');
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe('collectTextRows', () => {
  it('collects visible rows in reading order and skips empty placeholders', () => {
    document.body.innerHTML = `
      <div id="c">
        <div class="resume-header">
          <h1 class="layout-line">Ada Lovelace</h1>
          <h2 class="layout-line">Software Engineer</h2>
          <p class="layout-line">ada@example.com | London</p>
        </div>
        <div class="section-block">
          <h3>EXPERIENCE</h3>
          <div class="entity-item">
            <div class="layout-line"><strong>Lead Engineer</strong> - <span>Engines</span> <span>2020 - Present</span></div>
            <ul><li>Reduced latency by 40 percent.</li></ul>
          </div>
        </div>
        <div class="section-block section-empty">
          <h3>EDUCATION</h3>
          <div class="entity-item" data-placeholder-entity="true">
            <div class="layout-line"><strong data-placeholder="Add a degree"></strong> - <span data-placeholder="Add a school"></span> <span data-placeholder="Dates"></span></div>
            <ul><li data-placeholder="Add an achievement"></li></ul>
          </div>
        </div>
      </div>`;

    const rows = collectTextRows(document.getElementById('c') as HTMLElement);

    // The placeholder hints live in CSS ::before, so they are absent from
    // textContent and never reach the PDF; the empty section's visible
    // heading is kept, because it is visible on screen.
    expect(rows.map(row => row.text)).toEqual([
      'Ada Lovelace',
      'Software Engineer',
      'ada@example.com | London',
      'EXPERIENCE',
      'Lead Engineer - Engines 2020 - Present',
      'Reduced latency by 40 percent.',
      'EDUCATION'
    ]);
  });
});

describe('sanitizeForPdf', () => {
  it('should drop emoji the PDF core fonts cannot encode', () => {
    // A real GitHub description: emoji here used to make jsPDF emit raw
    // UTF-16 bytes, turning the whole line into unreadable garbage.
    expect(sanitizeForPdf('😎 Awesome lists about all kinds of topics'))
      .toBe('Awesome lists about all kinds of topics');
  });

  it('should drop GitHub emoji shorthand', () => {
    expect(sanitizeForPdf(':zap: Delightful Node.js packages'))
      .toBe('Delightful Node.js packages');
  });

  it('should keep punctuation resumes actually rely on', () => {
    expect(sanitizeForPdf('2014 — 2026')).toBe('2014 — 2026');
    expect(sanitizeForPdf("Reduced latency by 40% — Jane's team")).toBe(
      "Reduced latency by 40% — Jane's team"
    );
    expect(sanitizeForPdf('Café résumé naïve')).toBe('Café résumé naïve');
  });

  it('should leave ordinary text untouched', () => {
    const text = 'Built a REST API using Node.js and PostgreSQL.';
    expect(sanitizeForPdf(text)).toBe(text);
  });
});

describe('emoji in exported PDF', () => {
  it('should not write unencodable characters into the document', async () => {
    const resume: ResumeData = {
      ...data,
      projects: [
        {
          institution: 'Personal / Open Source',
          role: '🚀 Rocket Tools',
          period: '2020 — 2024',
          description: ['😎 Awesome lists about interesting topics']
        }
      ]
    };

    const { doc } = await renderPdf(resume);
    const text = extractText(doc);

    expect(text).toContain('Rocket Tools');
    expect(text).toContain('Awesome lists about interesting topics');
    // NUL bytes are the signature of the broken UTF-16 fallback.
    expect(text).not.toContain('\u0000');
  });
});
