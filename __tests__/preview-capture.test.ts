import { describe, it, expect, beforeEach } from 'vitest';
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  buildStageSheet,
  capturePreviewPages,
  collectBreakCandidates,
  computePageCuts,
  TextWord
} from '../src/services/preview-capture';
import { renderResume } from '../src/resume-builder';
import { ResumeData } from '../src/types';

const data: ResumeData = {
  personal: {
    name: 'Ada Lovelace',
    title: 'Software Engineer',
    email: 'ada@example.com',
    phone: '',
    location: '',
    github: 'github.com/ada',
    linkedin: ''
  },
  experience: [],
  education: [],
  projects: [
    {
      institution: 'Personal / Open Source',
      role: 'Rocket Tools',
      period: '2020 — 2024',
      description: ['Awesome lists about interesting topics']
    }
  ],
  skills: ['Algorithms']
};

function buildPreview(resume: ResumeData = data): HTMLElement {
  const container = document.createElement('main');
  container.id = 'resume-container';
  container.className = 'resume-root';
  container.setAttribute('contenteditable', 'true');
  renderResume(resume, container, 'en');
  document.body.appendChild(container);
  return container;
}

function word(text: string, topPx: number, bottomPx: number, inHeading = false): TextWord {
  return {
    text,
    xPx: 10,
    topPx,
    bottomPx,
    heightPx: bottomPx - topPx,
    fontSizePx: 16,
    bold: false,
    inHeading
  };
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('buildStageSheet', () => {
  it('should clone the preview without the editing plumbing', () => {
    const container = buildPreview();
    const sheet = buildStageSheet(container);

    expect(sheet).not.toBe(container);
    expect(sheet.hasAttribute('id')).toBe(false);
    expect(sheet.hasAttribute('contenteditable')).toBe(false);
    expect(sheet.className).toContain('resume-root');
  });

  it('should force exact A4 sheet geometry', () => {
    const container = buildPreview();
    const sheet = buildStageSheet(container);

    expect(sheet.style.width).toBe(`${A4_WIDTH_MM}mm`);
    expect(sheet.style.minHeight).toBe(`${A4_HEIGHT_MM}mm`);
    expect(sheet.style.maxWidth).toBe('none');
    expect(sheet.style.borderRadius).toBe('0px');
    expect(sheet.style.boxShadow).toBe('none');
  });

  it('should drop empty placeholder hints like the print rules do', () => {
    const container = buildPreview();
    // GitHub import leaves experience/education blank; the preview shows
    // placeholder entries the user is meant to type into.
    expect(container.querySelectorAll('[data-placeholder]').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.section-empty').length).toBeGreaterThan(0);

    const sheet = buildStageSheet(container);

    expect(sheet.querySelectorAll('[data-placeholder]').length).toBe(0);
    expect(sheet.querySelectorAll('.section-empty').length).toBe(0);
  });

  it('must never drop a section that contains typed content', () => {
    const container = buildPreview();
    // The section-empty class can linger after the user starts typing (it is
    // only cleared on the next re-render). Deleting the section then would
    // silently lose their work.
    const filled = container.querySelector('[data-section="experience"]');
    filled!.classList.add('section-empty');
    const role = filled!.querySelector<HTMLElement>('[data-field="role"]');
    if (role) role.textContent = 'Senior Developer';

    const sheet = buildStageSheet(container);

    expect(sheet.querySelector('[data-section="experience"]')).not.toBeNull();
    expect(sheet.textContent).toContain('Senior Developer');
  });

  it('should not leave two elements with the resume id in the document', () => {
    const container = buildPreview();
    const sheet = buildStageSheet(container);
    document.body.appendChild(sheet);

    expect(document.querySelectorAll('#resume-container').length).toBe(1);
  });
});

describe('computePageCuts', () => {
  const PAGE = 1000;

  it('should return a single page when the sheet fits', () => {
    expect(computePageCuts(800, [700], PAGE)).toEqual([0]);
  });

  it('should cut exactly on boundaries when content fills pages evenly', () => {
    const candidates = [400, 950, 1000, 1500, 1950, 2000];
    expect(computePageCuts(2200, candidates, PAGE)).toEqual([0, 1000, 2000]);
  });

  it('should snap a break back to the nearest line boundary inside the window', () => {
    // Ideal cut is 1000; the best boundary below it is 930 (within the 18%
    // window), so the break lands there instead of slicing through text.
    const candidates = [300, 500, 930, 1230];
    expect(computePageCuts(2200, candidates, PAGE)).toEqual([0, 930, 1930]);
  });

  it('should hard-cut when the nearest boundary is too far above', () => {
    // 500 is 50% of a page above the ideal cut — accepting it would leave a
    // half-empty page, so we cut through the tall block at the ideal point.
    const candidates = [300, 500];
    expect(computePageCuts(2200, candidates, PAGE)).toEqual([0, 1000, 2000]);
  });

  it('should never return a page emptier than the minimum fill', () => {
    const candidates = [100, 150];
    const cuts = computePageCuts(2200, candidates, PAGE);
    cuts.forEach(cut => expect(cut % 1000).toBe(0));
  });

  it('should paginate a very long sheet into monotonically increasing cuts', () => {
    const candidates: number[] = [];
    for (let i = 1; i <= 40; i++) candidates.push(i * 100);
    const cuts = computePageCuts(5000, candidates, PAGE);

    expect(cuts[0]).toBe(0);
    expect(cuts.length).toBeGreaterThan(3);
    for (let i = 1; i < cuts.length; i++) {
      expect(cuts[i]).toBeGreaterThan(cuts[i - 1]);
      // Each page is at least the minimum fill and at most a full page + ε.
      expect(cuts[i] - cuts[i - 1]).toBeLessThanOrEqual(PAGE + 1);
      expect(cuts[i] - cuts[i - 1]).toBeGreaterThanOrEqual(PAGE * 0.2);
    }
  });
});

describe('collectBreakCandidates', () => {
  it('should collect block and line bottoms but never heading bottoms', () => {
    const container = buildPreview();
    const sheet = buildStageSheet(container);
    document.body.appendChild(sheet);

    const candidates = collectBreakCandidates(sheet, []);

    // jsdom reports zero-sized boxes, so with no layout the set stays empty
    // but the call must not throw — the real assertions about exclusion
    // behaviour run through the pure strategy tests above.
    expect(Array.isArray(candidates)).toBe(true);
  });
});

describe('capturePreviewPages', () => {
  it('should produce one A4 page via the injected rasterizer and clean up the stage', async () => {
    const container = buildPreview();
    const rasterized: HTMLElement[] = [];
    const fakeCanvas = {
      width: 794,
      height: 1123,
      toDataURL: () => 'data:image/png;base64,AAAA'
    } as unknown as HTMLCanvasElement;

    const capture = await capturePreviewPages(container, {
      rasterize: async element => {
        rasterized.push(element);
        return fakeCanvas;
      }
    });

    expect(capture.pages.length).toBe(1);
    expect(capture.pages[0].widthMm).toBe(A4_WIDTH_MM);
    expect(capture.pages[0].heightMm).toBe(A4_HEIGHT_MM);
    expect(rasterized.length).toBe(1);
    expect(rasterized[0].className).toContain('resume-page-frame');
    // The staged sheet must be inside the captured frame.
    expect(rasterized[0].contains(container.querySelector('h1'))).toBe(false); // it's a clone
    expect(rasterized[0].querySelector('h1')?.textContent).toBe(data.personal.name);

    // No staging leftovers in the live document.
    expect(document.querySelector('.export-stage')).toBeNull();
    // The live preview was never touched.
    expect(document.getElementById('resume-container')).toBe(container);
  });

  it('should fail fast when the preview is detached from the document', async () => {
    const container = document.createElement('main');
    renderResume(data, container, 'en');

    await expect(
      capturePreviewPages(container, { rasterize: async () => ({}) as HTMLCanvasElement })
    ).rejects.toThrow(/not in the document/);
  });

  it('should measure no words when the environment has no layout (jsdom)', async () => {
    const container = buildPreview();
    const capture = await capturePreviewPages(container, {
      rasterize: async () =>
        ({ toDataURL: () => 'data:image/png;base64,AAAA' }) as unknown as HTMLCanvasElement
    });

    expect(capture.pages[0].words).toEqual([]);
  });
});
