import { describe, it, expect, beforeEach } from 'vitest';
import { ExportService, sanitizeForPdf } from '../src/services/ExportService';
import { CapturedPreview, PreviewPage, TextWord } from '../src/services/preview-capture';
import { ResumeData } from '../src/types';

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

/** A 1×1 white JPEG — enough for jsPDF to embed as a page image. */
const TINY_JPEG =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDs0NDT/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AVN//2Q==';

function makeWord(text: string, topPx: number, xPx = 10): TextWord {
  return {
    text,
    xPx,
    topPx,
    bottomPx: topPx + 19,
    heightPx: 19,
    fontSizePx: 16,
    bold: false,
    inHeading: false
  };
}

/**
 * Build a fake capture: pages already rasterised (a stub canvas is enough —
 * jsPDF only reads its `toDataURL`), with the words each page shows.
 */
function makeCapture(wordsPerPage: TextWord[][]): CapturedPreview {
  const pages: PreviewPage[] = wordsPerPage.map(words => ({
    canvas: { toDataURL: () => TINY_JPEG } as unknown as HTMLCanvasElement,
    widthMm: 210,
    heightMm: 297,
    words
  }));
  return { pages, sheetWidthPx: 794 };
}

async function renderPdf(pages: TextWord[][], resume: ResumeData = data) {
  const service = new ExportService();
  return {
    doc: await service.createDocument(makeCapture(pages), resume),
    name: service.buildFileName(resume)
  };
}

/**
 * Extract the text jsPDF placed on the pages.
 *
 * The PDF content stream stores drawn strings in parentheses, which is
 * exactly what an ATS parser reads — if this comes back empty, the export
 * has no machine-readable text layer.
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
    const { doc } = await renderPdf([[makeWord('Ada Lovelace', 20)]]);
    expect(doc.output('datauristring')).toContain('data:application/pdf');
  });

  it('should embed the visible words as a machine-readable text layer', async () => {
    const { doc } = await renderPdf([
      [
        makeWord('Ada', 20),
        makeWord('Lovelace', 20, 60),
        makeWord('Software', 45),
        makeWord('Engineer', 45, 80)
      ]
    ]);
    const text = extractText(doc);

    expect(text).toContain('Ada');
    expect(text).toContain('Lovelace');
    expect(text).toContain('Software');
    expect(text).toContain('Engineer');
    expect(text).not.toContain('\u0000');
  });

  it('should draw the text layer invisibly on top of the page raster', async () => {
    const { doc } = await renderPdf([[makeWord('Ada Lovelace', 20)]]);
    const raw: string = doc.output('datauristring');
    const binary = Buffer.from(raw.slice(raw.indexOf(',') + 1), 'base64').toString('binary');

    // PDF text rendering mode 3 ("invisible") is what keeps the page a
    // visual copy of the preview while the text stays extractable.
    expect(binary).toContain('3 Tr');
    // And the page itself is an image.
    expect(binary).toContain('/Image');
  });

  it('should produce one PDF page per captured page', async () => {
    const { doc } = await renderPdf([
      [makeWord('first page', 20)],
      [makeWord('second page', 20)],
      [makeWord('third page', 20)]
    ]);

    expect(doc.getNumberOfPages()).toBe(3);
    const text = extractText(doc);
    expect(text).toContain('first page');
    expect(text).toContain('second page');
    expect(text).toContain('third page');
  });

  it('should name the file after the candidate', async () => {
    expect((await renderPdf([])).name).toBe('ada-lovelace-resume.pdf');
  });

  it('should set PDF metadata', async () => {
    const { doc } = await renderPdf([[makeWord('Ada Lovelace', 20)]]);
    const raw: string = doc.output('datauristring');
    const binary = Buffer.from(raw.slice(raw.indexOf(',') + 1), 'base64').toString('binary');

    // Many parsers read the document info dictionary before the page content.
    expect(binary).toContain('Ada Lovelace - Resume');
    expect(binary).toContain('Ada Lovelace');
  });

  it('should keep unencodable characters out of the text layer', async () => {
    const pages = [
      [
        makeWord('😎', 20),
        makeWord(':zap:', 20, 60),
        makeWord('Awesome', 45),
        makeWord('Rocket', 45, 80)
      ]
    ];
    const { doc } = await renderPdf(pages);
    const text = extractText(doc);

    expect(text).toContain('Awesome');
    expect(text).toContain('Rocket');
    // NUL bytes are the signature of the broken UTF-16 fallback.
    expect(text).not.toContain('\u0000');
    expect(text).not.toContain('😎');
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

  it('should keep Cyrillic for the embedded Unicode font', () => {
    // The invisible text layer embeds Inter, which covers Cyrillic — a
    // Russian resume must stay machine-readable for ATS parsers.
    expect(sanitizeForPdf('Резюме разработчика')).toBe('Резюме разработчика');
    expect(sanitizeForPdf('Опыт: 2020 — 2026, ООО «Ромашка»')).toBe(
      'Опыт: 2020 — 2026, ООО «Ромашка»'
    );
  });

  it('should leave ordinary text untouched', () => {
    const text = 'Built a REST API using Node.js and PostgreSQL.';
    expect(sanitizeForPdf(text)).toBe(text);
  });
});
