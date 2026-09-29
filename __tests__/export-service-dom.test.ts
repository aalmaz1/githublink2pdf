import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExportService } from '../src/services/ExportService';
import { ResumeData } from '../src/types';

/**
 * Integration test for the screenshot path WITHOUT mocking html2canvas.
 *
 * In jsdom the real html2canvas cannot render (no canvas 2D context,
 * incomplete CSS engine) and throws quickly — which exercises exactly the
 * fallback contract: a broken capture environment must never break the
 * export, it must fall back to the visible themed text layout.
 */
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

describe('screenshot export with the real html2canvas module', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  function extractText(doc: any): string {
    const raw: string = doc.output('datauristring');
    const binary = Buffer.from(raw.slice(raw.indexOf(',') + 1), 'base64').toString('binary');

    return Array.from(binary.matchAll(/\(((?:[^()\\]|\\.)*)\)\s*Tj/g))
      .map(match => match[1].replace(/\\([()\\])/g, '$1'))
      .join('\n');
  }

  it('falls back to visible text when the environment cannot render a canvas', async () => {
    document.body.innerHTML =
      '<div id="resume-container"><h1>Ada Lovelace</h1></div>';
    const container = document.getElementById('resume-container')!;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const started = Date.now();
      const doc = await new ExportService().createDocument(data, 'classic', container);
      // Must resolve fast (no hang) and yield the fully visible fallback.
      expect(Date.now() - started).toBeLessThan(15000);
      expect(extractText(doc)).toContain('Ada Lovelace');
      expect(extractText(doc)).toContain('Analytical Engines');
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});
