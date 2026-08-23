import { describe, it, expect, beforeEach } from 'vitest';
import { ExportService, sanitizeForPdf } from '../src/services/ExportService';
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

/**
 * Build the PDF document without triggering a browser download.
 */
async function renderPdf(resume: ResumeData = data) {
  const service = new ExportService();
  return {
    doc: await service.createDocument(resume),
    name: service.buildFileName(resume)
  };
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
