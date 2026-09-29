import { describe, it, expect } from 'vitest';
import {
  A4_HEIGHT_MM,
  PX_PER_MM,
  getSliceHeightPx,
  crossesPageBoundary,
  collectBreakableBlocks,
  applySmartPageBreaks,
} from '../src/services/pdf-pagination';

describe('PDF Pagination', () => {
  describe('getSliceHeightPx', () => {
    it('returns one full A4 page height in CSS pixels', () => {
      expect(getSliceHeightPx(1000)).toBeCloseTo(A4_HEIGHT_MM * PX_PER_MM, 5);
    });

    it('falls back to page height for invalid container heights', () => {
      expect(getSliceHeightPx(0)).toBeCloseTo(A4_HEIGHT_MM * PX_PER_MM, 5);
      expect(getSliceHeightPx(-5)).toBeCloseTo(A4_HEIGHT_MM * PX_PER_MM, 5);
    });
  });

  describe('crossesPageBoundary', () => {
    const slice = getSliceHeightPx(0); // ~1122.5px

    it('returns false when element fits fully inside a page', () => {
      expect(crossesPageBoundary(100, 300, 0, slice)).toBe(false);
    });

    it('returns true when element bottom passes the page boundary', () => {
      expect(crossesPageBoundary(slice - 100, slice + 50, 0, slice)).toBe(true);
    });

    it('accounts for container offset (element positioned relative to document)', () => {
      // Container starts at 500px; element ends past the first page of the container
      const top = 500 + slice - 50;
      const bottom = top + 100;
      expect(crossesPageBoundary(top, bottom, 500, slice)).toBe(true);
    });

    it('detects crossings on later pages, not only the first', () => {
      const top = 2 * slice - 10;
      expect(crossesPageBoundary(top, top + 20, 0, slice)).toBe(true);
    });

    it('safety zone marks elements that end just before the boundary', () => {
      const top = slice - 100;
      const bottom = slice - 5; // ends 5px before boundary
      expect(crossesPageBoundary(top, bottom, 0, slice, 0)).toBe(false);
      expect(crossesPageBoundary(top, bottom, 0, slice, 8)).toBe(true);
    });

    it('returns false for degenerate slice height', () => {
      expect(crossesPageBoundary(0, 100, 0, 0)).toBe(false);
    });
  });

  describe('collectBreakableBlocks', () => {
    function buildResume(): HTMLElement {
      const container = document.createElement('div');
      container.id = 'resume-container';
      container.innerHTML = `
        <div class="positioned-block resume-header"><h1 class="layout-line">Name</h1></div>
        <div class="positioned-block section-block">
          <h3 class="layout-line">Experience</h3>
          <div class="positioned-block entity-item"><div class="layout-line">Job 1</div></div>
          <div class="positioned-block entity-item"><div class="layout-line">Job 2</div></div>
        </div>`;
      document.body.appendChild(container);
      return container;
    }

    it('collects headers, section titles and entity items', () => {
      const container = buildResume();
      const blocks = collectBreakableBlocks(container);
      // jsdom reports offsetHeight === 0, so nothing is collected as "visible".
      // Verify selectors match by stubbing heights instead.
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 50 });
      const visible = collectBreakableBlocks(container);
      // header + h3 + 2 entity items + their layout lines
      expect(visible.length).toBeGreaterThanOrEqual(4);
      expect(visible.some(el => el.classList.contains('entity-item'))).toBe(true);
      expect(visible.some(el => el.tagName === 'H3')).toBe(true);
      container.remove();
      void blocks;
    });
  });

  describe('applySmartPageBreaks', () => {
    it('marks blocks that cross a page boundary and cleans up afterwards', () => {
      const slice = getSliceHeightPx(0);
      const container = document.createElement('div');
      container.id = 'resume-container';

      const item1 = document.createElement('div');
      item1.className = 'positioned-block entity-item';
      const item2 = document.createElement('div');
      item2.className = 'positioned-block entity-item';
      container.append(item1, item2);
      document.body.appendChild(container);

      // Stub layout: container at top of document, ~2 pages tall
      const rect = (top: number, height: number) => ({
        top, height, bottom: top + height, left: 0, right: 794, width: 794, x: 0, y: top, toJSON: () => {},
      });
      Object.defineProperty(container, 'getBoundingClientRect', { value: () => rect(0, slice * 2) });
      Object.defineProperty(container, 'scrollHeight', { value: slice * 2 });
      Object.defineProperty(container, 'offsetTop', { value: 0, configurable: true });
      Object.defineProperty(item1, 'getBoundingClientRect', { value: () => rect(100, 200) });
      // item2 straddles the first page boundary
      Object.defineProperty(item2, 'getBoundingClientRect', { value: () => rect(slice - 50, 150) });

      const result = applySmartPageBreaks(container);

      expect(item1.classList.contains('avoid-page-break')).toBe(false);
      expect(item2.classList.contains('avoid-page-break')).toBe(true);
      expect(result.markedCount).toBe(1);
      expect(result.pageCount).toBe(2);

      result.cleanup();
      expect(item2.classList.contains('avoid-page-break')).toBe(false);
      container.remove();
    });

    it('does not mark blocks taller than a printable page (prevents blank pages)', () => {
      const slice = getSliceHeightPx(0);
      const container = document.createElement('div');
      const huge = document.createElement('div');
      huge.className = 'positioned-block entity-item';
      container.appendChild(huge);
      document.body.appendChild(container);

      const rect = (top: number, height: number) => ({
        top, height, bottom: top + height, left: 0, right: 794, width: 794, x: 0, y: top, toJSON: () => {},
      });
      Object.defineProperty(container, 'getBoundingClientRect', { value: () => rect(0, slice * 2) });
      Object.defineProperty(container, 'scrollHeight', { value: slice * 2 });
      Object.defineProperty(container, 'offsetTop', { value: 0, configurable: true });
      // Block taller than a whole page crossing the boundary
      Object.defineProperty(huge, 'getBoundingClientRect', { value: () => rect(slice - 300, slice * 1.5) });

      const result = applySmartPageBreaks(container);
      expect(huge.classList.contains('avoid-page-break')).toBe(false);
      expect(result.markedCount).toBe(0);
      result.cleanup();
      container.remove();
    });
  });
});
