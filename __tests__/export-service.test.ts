import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ExportService,
  PRINT_HASH_KEY,
  PRINT_QUERY_FLAG
} from '../src/services/ExportService';
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

const PAGE_TITLE = 'Github Link2PDF Resume Builder';

function handoff() {
  return {
    data,
    design: 'classic',
    align: 'left' as const,
    lang: 'en',
    fileName: 'ada-lovelace-resume.pdf'
  };
}

describe('ExportService', () => {
  let printSpy: ReturnType<typeof vi.fn>;
  let openSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    document.title = PAGE_TITLE;
    printSpy = vi.fn();
    openSpy = vi.fn(() => ({}));
    window.print = printSpy as unknown as () => void;
    window.open = openSpy as unknown as typeof window.open;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('derives a download name from the candidate name', () => {
    const service = new ExportService();

    expect(service.buildFileName(data)).toBe('ada-lovelace-resume.pdf');
    expect(service.buildFileName({ ...data, personal: { ...data.personal, name: '' } }))
      .toBe('resume-resume.pdf');
  });

  it('prints the live document instead of laying the resume out a second time', async () => {
    vi.useFakeTimers();
    const service = new ExportService();

    await service.exportToPdf(handoff());

    expect(printSpy).toHaveBeenCalledTimes(1);
    // The preview is a real A4 sheet, so the print pipeline is the renderer:
    // no second layout engine, no rasterised pages.
    expect(openSpy).not.toHaveBeenCalled();
  });

  it('names the print job after the resume and restores the tab title', async () => {
    vi.useFakeTimers();
    const service = new ExportService();

    await service.exportToPdf(handoff());

    expect(document.title).toBe('ada-lovelace-resume');

    window.dispatchEvent(new Event('afterprint'));

    expect(document.title).toBe(PAGE_TITLE);
  });

  it('carries the resume to a printing tab when embedded in another page', async () => {
    const service = new ExportService();
    vi.spyOn(service as unknown as { isFramed: () => boolean }, 'isFramed')
      .mockReturnValue(true);

    await service.exportToPdf(handoff());

    // An iframe cannot print itself: the resume travels to a standalone tab.
    expect(printSpy).not.toHaveBeenCalled();
    expect(openSpy).toHaveBeenCalledTimes(1);

    const target = new URL(String(openSpy.mock.calls[0][0]));
    expect(target.searchParams.get(PRINT_QUERY_FLAG)).toBe('1');

    const carried = service.decodeHandoff(
      new URLSearchParams(target.hash.replace(/^#/, '')).get(PRINT_HASH_KEY) ?? ''
    );
    expect(carried?.data.personal.name).toBe('Ada Lovelace');
    expect(carried?.data.experience[0].role).toBe('Lead Engineer');
    expect(carried?.design).toBe('classic');
    expect(carried?.align).toBe('left');
    expect(carried?.fileName).toBe('ada-lovelace-resume.pdf');
  });

  it('reports a blocked print tab instead of failing silently', async () => {
    openSpy.mockReturnValue(null);
    const service = new ExportService();
    vi.spyOn(service as unknown as { isFramed: () => boolean }, 'isFramed')
      .mockReturnValue(true);

    await expect(service.exportToPdf(handoff())).rejects.toThrow(/blocked/i);
  });

  it('round-trips a hand-off, non-Latin text included', () => {
    const service = new ExportService();
    const payload = handoff();
    payload.data.personal.name = 'Худайбердиев Алмаз';
    payload.data.personal.location = '안산시';
    payload.lang = 'ru';

    const carried = service.decodeHandoff(service.encodeHandoff(payload));

    expect(carried?.data.personal.name).toBe('Худайбердиев Алмаз');
    expect(carried?.data.personal.location).toBe('안산시');
    expect(carried?.lang).toBe('ru');
  });

  it('survives a corrupted or missing hand-off', () => {
    const service = new ExportService();

    expect(service.decodeHandoff('{not base64')).toBeNull();
    expect(service.decodeHandoff(btoa('{"nope":true}'))).toBeNull();
  });

  it('reads the hand-off from the fragment and strips it from the address', () => {
    const service = new ExportService();
    const encoded = service.encodeHandoff(handoff());
    window.history.replaceState(null, '', `/?${PRINT_QUERY_FLAG}=1#${PRINT_HASH_KEY}=${encoded}`);

    const carried = service.readHandoffFromLocation();

    expect(carried?.data.personal.email).toBe('ada@example.com');
    // The resume must not linger in the URL, history or a reload.
    expect(window.location.hash).toBe('');
  });
});
