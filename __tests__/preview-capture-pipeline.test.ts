import { describe, it, expect, afterEach } from 'vitest';
import { capturePreviewPages, measureWords, TextWord } from '../src/services/preview-capture';
import { renderResume } from '../src/resume-builder';
import { generateDemoProfile } from '../src/demo-profile';

/**
 * End-to-end pipeline test with a synthetic layout.
 *
 * jsdom has no layout engine, so we patch the geometry APIs with a simple,
 * deterministic fake: words flow left-to-right (5 per line), lines are
 * 100 px tall, the sheet is 794 px wide (A4) and 2400 px tall. The capture
 * must then measure every word, paginate the sheet into ~1123 px A4 pages
 * (297 mm at 794 px width) and split the words across the pages without
 * losing or duplicating a single one.
 */

const SHEET_WIDTH = 794;
const SHEET_HEIGHT = 2400;
const LINE_HEIGHT = 100;
const WORDS_PER_LINE = 5;
/** SHEET_HEIGHT / LINE_HEIGHT — the sheet holds exactly this many lines. */
const LINES = 24;

let wordCounter = 0;

function fakeRect(top: number, left: number, height: number, width = 90) {
  return {
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    x: left,
    y: top,
    toJSON: () => ({})
  } as DOMRect;
}

function installFakeLayout(): void {
  // Words are measured strictly in document order, so a running counter is
  // enough to model a linear layout.
  (Range.prototype as unknown as { getClientRects: () => DOMRect[] }).getClientRects =
    function () {
      const index = wordCounter++;
      // Words wrap into the sheet's 24 lines so the fake word count can
      // never exceed the fake sheet height.
      const top = (Math.floor(index / WORDS_PER_LINE) % LINES) * LINE_HEIGHT;
      const left = (index % WORDS_PER_LINE) * 100;
      return [fakeRect(top, left, 20)];
    };

  (Element.prototype as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect =
    function () {
      return fakeRect(0, 0, SHEET_HEIGHT, SHEET_WIDTH);
    };

  Object.defineProperty(Element.prototype, 'scrollHeight', {
    configurable: true,
    get: () => SHEET_HEIGHT
  });
}

function removeFakeLayout(): void {
  delete (Range.prototype as unknown as { getClientRects?: unknown }).getClientRects;
  delete (Element.prototype as unknown as { getBoundingClientRect?: unknown }).getBoundingClientRect;
  delete (Element.prototype as unknown as { scrollHeight?: unknown }).scrollHeight;
}

async function withFakeLayout(run: () => Promise<void>): Promise<void> {
  installFakeLayout();
  try {
    await run();
  } finally {
    removeFakeLayout();
  }
}

function buildPreview(): HTMLElement {
  const container = document.createElement('main');
  container.id = 'resume-container';
  container.className = 'resume-root';
  renderResume(generateDemoProfile(), container, 'en');
  document.body.appendChild(container);
  return container;
}

const fakeCanvas = {
  width: SHEET_WIDTH * 2,
  height: Math.round((SHEET_HEIGHT / SHEET_WIDTH) * 794 * 2),
  toDataURL: () => 'data:image/png;base64,AAAA'
} as unknown as HTMLCanvasElement;

let rasterizedFrames: HTMLElement[] = [];

describe('capturePreviewPages with synthetic layout', () => {
  afterEach(() => {
    removeFakeLayout();
    document.body.innerHTML = '';
    rasterizedFrames = [];
  });

  it('should paginate the sheet and distribute every word to exactly one page', async () => {
    const container = buildPreview();

    await withFakeLayout(async () => {
      wordCounter = 0;
      rasterizedFrames = [];
      const capture = await capturePreviewPages(container, {
        rasterize: async element => {
          rasterizedFrames.push(element);
          return fakeCanvas;
        }
      });

      const totalWords = wordCounter;

      // A 2400 px sheet cannot fit one page and must not need four.
      expect(capture.pages.length).toBeGreaterThanOrEqual(2);
      expect(capture.pages.length).toBeLessThanOrEqual(3);
      expect(rasterizedFrames.length).toBe(capture.pages.length);
      expect(capture.sheetWidthPx).toBe(SHEET_WIDTH);

      // Every measured word lands on exactly one page.
      const distributed = capture.pages.reduce((sum, page) => sum + page.words.length, 0);
      expect(distributed).toBe(totalWords);
      expect(totalWords).toBeGreaterThan(50);

      // Pages are ordered vertical slices: every word of a later page sits
      // strictly below the previous page's lowest line, so no two pages ever
      // show the same line of text.
      for (let i = 1; i < capture.pages.length; i++) {
        const prevMax = Math.max(...capture.pages[i - 1].words.map(w => w.topPx));
        const nextMin = Math.min(...capture.pages[i].words.map(w => w.topPx));
        expect(nextMin).toBeGreaterThan(prevMax);
      }
    });
  });

  it('should never cut a page through the middle of a text line', async () => {
    const container = buildPreview();

    await withFakeLayout(async () => {
      wordCounter = 0;
      const capture = await capturePreviewPages(container, {
        rasterize: async () => fakeCanvas
      });

      const pageHeightPx = 297 * (SHEET_WIDTH / 210);
      for (const page of capture.pages) {
        const tops = new Set(page.words.map(word => word.topPx));
        for (const top of tops) {
          // A whole line always sits on one page: no other line's words may
          // straddle the page's slice.
          const sameLineOnOtherPages = capture.pages
            .filter(other => other !== page)
            .flatMap(other => other.words)
            .filter(word => Math.abs(word.topPx - top) < LINE_HEIGHT / 2);
          expect(sameLineOnOtherPages).toHaveLength(0);
        }
      }
      // Silence the unused variable lint-wise via an assertion.
      expect(pageHeightPx).toBeGreaterThan(1000);
    });
  });

  it('should keep measureWords deterministic across runs', async () => {
    const container = buildPreview();

    await withFakeLayout(async () => {
      wordCounter = 0;
      const sheet = container.cloneNode(true) as HTMLElement;
      document.body.appendChild(sheet);
      const first = measureWords(sheet);
      const firstRun = first.map((word: TextWord) => `${word.text}@${word.topPx}`);

      wordCounter = 0;
      const second = measureWords(sheet);
      const secondRun = second.map(word => `${word.text}@${word.topPx}`);

      expect(secondRun).toEqual(firstRun);
      expect(first.length).toBeGreaterThan(50);
    });
  });
});
