import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  DEFAULT_PAGE_METRICS,
  PaginationService,
  PX_PER_MM,
  PageMetrics,
  PlannedItem,
  planPageBreaks
} from '../src/services/PaginationService';

/**
 * Compact metrics for planner tests: whole numbers make the expected spacer
 * arithmetic easy to check by hand.
 *   page 1 content: 68 .. 1054
 *   page 2 content: 1191 .. 2177
 */
const METRICS: PageMetrics = { contentTop: 68, contentHeight: 986, pageStride: 1123 };

function item(top: number, height: number, extra: Partial<PlannedItem> = {}): PlannedItem {
  return { top, height, canPush: true, avoidAfter: false, ...extra };
}

function makeRect(top: number, height: number): DOMRect {
  return {
    top,
    height,
    bottom: top + height,
    left: 0,
    right: 100,
    width: 100,
    x: 0,
    y: top,
    toJSON: () => ({})
  } as DOMRect;
}

/** Stub a jsdom element with layout numbers, since jsdom performs none. */
function stubRect(el: Element, top: number, height: number): void {
  (el as HTMLElement).getBoundingClientRect = () => makeRect(top, height);
}

function spacerHeightPx(spacer: Element): number {
  return parseFloat((spacer as HTMLElement).style.height);
}

describe('planPageBreaks', () => {
  it('keeps content that fits on one page untouched', () => {
    const breaks = planPageBreaks([item(68, 100), item(168, 200)], METRICS);
    expect(breaks).toEqual([]);
  });

  it('treats a block ending exactly on the page edge as fitting', () => {
    // 968 + 86 = 1054 — the page edge to the pixel.
    const breaks = planPageBreaks([item(68, 900), item(968, 86)], METRICS);
    expect(breaks).toEqual([]);
  });

  it('moves a block that would cross the boundary whole to the next page', () => {
    const breaks = planPageBreaks([item(68, 900), item(968, 100)], METRICS);

    expect(breaks).toEqual([{ anchor: 1, page: 2, targetTop: 1191 }]);
  });

  it('takes the section heading along instead of stranding it', () => {
    const items = [
      item(68, 940),
      item(1008, 20, { avoidAfter: true }), // heading fits on page 1...
      item(1028, 40) // ...but its first entry does not
    ];
    const breaks = planPageBreaks(items, METRICS);

    // The cut anchors on the heading, so it starts page 2 with its entry.
    expect(breaks).toEqual([{ anchor: 1, page: 2, targetTop: 1191 }]);
  });

  it('carries a whole run of keep-with-next blocks across the cut', () => {
    const items = [
      item(68, 900),
      item(968, 20, { avoidAfter: true }),
      item(988, 20, { avoidAfter: true }),
      item(1008, 60)
    ];
    const breaks = planPageBreaks(items, METRICS);

    expect(breaks).toEqual([{ anchor: 1, page: 2, targetTop: 1191 }]);
  });

  it('never anchors a cut on a heading that was already moved', () => {
    const items = [
      item(68, 940),
      item(1008, 20, { avoidAfter: true }),
      item(1028, 40),
      item(1068, 400)
    ];
    const breaks = planPageBreaks(items, METRICS);

    // First cut: heading + entry to page 2. The last entry follows them on
    // page 2 (1068 + 223 + 400 fits), so exactly one break exists.
    expect(breaks).toEqual([{ anchor: 1, page: 2, targetTop: 1191 }]);
  });

  it('lets an oversized block flow instead of pushing it', () => {
    const items = [item(68, 2000), item(2068, 100)];
    const breaks = planPageBreaks(items, METRICS);

    // The oversized block fragments mid-page like in print; the next block
    // continues right after it and still fits on page 2.
    expect(breaks).toEqual([]);
  });

  it('ignores screen-only blocks as anchors but still places the next one', () => {
    const items = [
      item(68, 900),
      item(968, 120, { canPush: false }), // hidden in print: never pushes
      item(1088, 60)
    ];
    const breaks = planPageBreaks(items, METRICS);

    expect(breaks).toEqual([{ anchor: 2, page: 2, targetTop: 1191 }]);
  });

  it('plans consecutive cuts across several pages', () => {
    const items = [item(68, 900), item(968, 900), item(1868, 900)];
    const breaks = planPageBreaks(items, METRICS);

    expect(breaks).toEqual([
      { anchor: 1, page: 2, targetTop: 1191 },
      { anchor: 2, page: 3, targetTop: 2314 }
    ]);
  });

  it('handles an empty plan input', () => {
    expect(planPageBreaks([], METRICS)).toEqual([]);
  });
});

describe('PaginationService', () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  function buildSheet(): HTMLElement {
    const container = document.createElement('div');
    stubRect(container, 0, 4000);
    document.body.appendChild(container);
    return container;
  }

  function section(children: HTMLElement[]): HTMLElement {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'section-block';
    children.forEach(child => sectionEl.appendChild(child));
    return sectionEl;
  }

  function heading(top: number, height: number): HTMLElement {
    const h3 = document.createElement('h3');
    stubRect(h3, top, height);
    return h3;
  }

  function entry(top: number, height: number): HTMLElement {
    const entryEl = document.createElement('div');
    entryEl.className = 'entity-item';
    stubRect(entryEl, top, height);
    return entryEl;
  }

  it('inserts an inert spacer in front of an entry pushed to the next page', () => {
    const container = buildSheet();
    const h3 = heading(68.031, 40);
    const first = entry(108.031, 860);
    const second = entry(968.031, 120); // 968 + 120 crosses the page edge
    container.appendChild(section([h3, first, second]));

    new PaginationService().update(container);

    const spacers = container.querySelectorAll('.page-break-spacer');
    expect(spacers.length).toBe(1);

    const spacer = spacers[0] as HTMLElement;
    expect(spacer.nextElementSibling).toBe(second);
    expect(spacer.getAttribute('contenteditable')).toBe('false');
    expect(spacer.getAttribute('aria-hidden')).toBe('true');
    // Target: top of page 2 (18 mm + 297 mm) minus the block's clean top.
    const expected = 18 * PX_PER_MM + DEFAULT_PAGE_METRICS.pageStride - 968.031;
    expect(spacerHeightPx(spacer)).toBeCloseTo(expected, 2);
    expect(spacer.dataset.page).toBe('2');
  });

  it('moves a dangling section heading to the next page with its entry', () => {
    const container = buildSheet();
    const pageEdge = DEFAULT_PAGE_METRICS.contentTop + DEFAULT_PAGE_METRICS.contentHeight;
    const firstSection = section([heading(68.031, 40), entry(108.031, pageEdge - 108.031)]);
    const lateHeading = heading(pageEdge - 4, 4); // just fits on page 1...
    const lateEntry = entry(pageEdge, 60); // ...its entry does not
    const secondSection = section([lateHeading, lateEntry]);
    container.append(firstSection, secondSection);

    new PaginationService().update(container);

    const spacers = container.querySelectorAll('.page-break-spacer');
    expect(spacers.length).toBe(1);
    // The cut lands before the heading, not between the heading and its entry.
    expect(spacers[0].nextElementSibling).toBe(lateHeading);
    expect(lateHeading.parentElement).toBe(secondSection);
  });

  it('breaks inside an oversized entry at its children, like print does', () => {
    const container = buildSheet();
    const oversized = document.createElement('div');
    oversized.className = 'entity-item';
    const line = document.createElement('div');
    line.className = 'layout-line';
    const list = document.createElement('ul');
    const firstBullet = document.createElement('li');
    const secondBullet = document.createElement('li');
    list.append(firstBullet, secondBullet);
    oversized.append(line, list);
    container.appendChild(section([oversized]));

    stubRect(oversized, 108.031, 1960);
    stubRect(line, 108.031, 20);
    stubRect(list, 128.031, 1940);
    stubRect(firstBullet, 128.031, 900);
    stubRect(secondBullet, 1028.031, 900); // crosses the page edge

    new PaginationService().update(container);

    const spacers = container.querySelectorAll('.page-break-spacer');
    expect(spacers.length).toBe(1);
    expect(spacers[0].parentElement).toBe(list);
    expect(spacers[0].nextElementSibling).toBe(secondBullet);
  });

  it('never pushes blocks that print hides (empty placeholder sections)', () => {
    const container = buildSheet();
    const empty = document.createElement('div');
    empty.className = 'section-block section-empty';
    empty.append(heading(68.031, 40), entry(108.031, 1200));
    container.appendChild(empty);

    new PaginationService().update(container);

    expect(container.querySelectorAll('.page-break-spacer').length).toBe(0);
  });

  it('leaves a one-page resume untouched', () => {
    const container = buildSheet();
    container.appendChild(section([heading(68.031, 40), entry(108.031, 400)]));

    new PaginationService().update(container);

    expect(container.querySelectorAll('.page-break-spacer').length).toBe(0);
    // The sheet still previews as exactly one whole page.
    expect(parseFloat(container.style.minHeight))
      .toBeCloseTo(DEFAULT_PAGE_METRICS.pageStride, 1);
  });

  it('pads a two-page resume to two whole pages', () => {
    const container = buildSheet();
    container.appendChild(section([heading(68.031, 40), entry(108.031, 940), entry(1100, 120)]));

    new PaginationService().update(container);

    expect(parseFloat(container.style.minHeight))
      .toBeCloseTo(2 * DEFAULT_PAGE_METRICS.pageStride, 1);
  });

  it('clears the padded page height on an empty sheet', () => {
    const container = buildSheet();
    new PaginationService().update(container);
    expect(container.style.minHeight).toBe('');
  });

  it('replaces stale spacers on re-run instead of stacking them', () => {
    const container = buildSheet();
    // entry 1 ends at 1048 — inside page 1; entry 2 crosses the page edge.
    container.appendChild(section([heading(68.031, 40), entry(108.031, 940), entry(1100, 120)]));

    const service = new PaginationService();
    service.update(container);
    service.update(container);

    expect(container.querySelectorAll('.page-break-spacer').length).toBe(1);
  });

  it('clearSpacers removes everything it has inserted', () => {
    const container = buildSheet();
    container.appendChild(section([heading(68.031, 40), entry(108.031, 950), entry(1100, 120)]));

    const service = new PaginationService();
    service.update(container);
    service.clearSpacers(container);

    expect(container.querySelectorAll('.page-break-spacer').length).toBe(0);
  });

  it('skips work when the sheet is not rendered', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    container.appendChild(section([heading(0, 40), entry(40, 2000)]));
    // jsdom leaves every rect at 0×0 — the service must bow out quietly.

    expect(() => new PaginationService().update(container)).not.toThrow();
    expect(container.querySelectorAll('.page-break-spacer').length).toBe(0);
  });

  it('debounces scheduled updates into a single measurement pass', () => {
    vi.useFakeTimers();
    const container = buildSheet();
    const service = new PaginationService();
    const updateSpy = vi.spyOn(service, 'update');

    service.scheduleUpdate(container, 250);
    service.scheduleUpdate(container, 250);
    service.scheduleUpdate(container, 250);
    vi.advanceTimersByTime(249);
    expect(updateSpy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);

    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledWith(container);
  });
});
