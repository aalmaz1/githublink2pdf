import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  PrintPaginator,
  PRINT_PAGE_CLASS,
  PRINT_PAGINATED_CLASS,
  PRINT_CONTINUATION_ATTR
} from '../src/services/PrintPaginator';

/** A cut mark as PaginationService leaves it (height only matters on screen). */
const spacer = (page: number): string =>
  `<div class="page-break-spacer" contenteditable="false" aria-hidden="true" ` +
  `data-page="${page}" style="height: 300px"></div>`;

function setupContainer(html: string): HTMLElement {
  const container = document.createElement('main');
  container.id = 'resume-container';
  container.setAttribute('contenteditable', 'true');
  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
}

describe('PrintPaginator', () => {
  let paginator: PrintPaginator;

  beforeEach(() => {
    paginator = new PrintPaginator();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('leaves a one-page sheet alone (no spacers, no boxing)', () => {
    const html = '<div class="positioned-block resume-header">Sofia Moreau</div>';
    const container = setupContainer(html);

    expect(paginator.wrapForPrint(container)).toBe(false);

    expect(container.classList.contains(PRINT_PAGINATED_CLASS)).toBe(false);
    expect(container.querySelectorAll(`.${PRINT_PAGE_CLASS}`).length).toBe(0);
    expect(container.innerHTML).toBe(html);
  });

  it('boxes the flow into ordered pages at the cut marks', () => {
    const container = setupContainer(
      '<div class="positioned-block resume-header">Header</div>' +
        '<div class="positioned-block section-block" data-section="experience">' +
        '<h3 class="layout-line">EXPERIENCE</h3><div class="positioned-block entity-item">Job 1</div>' +
        '</div>' +
        spacer(2) +
        '<div class="positioned-block section-block" data-section="education">' +
        '<h3 class="layout-line">EDUCATION</h3><div class="positioned-block entity-item">Degree</div>' +
        '</div>'
    );

    expect(paginator.wrapForPrint(container)).toBe(true);

    expect(container.classList.contains(PRINT_PAGINATED_CLASS)).toBe(true);
    // The spacers themselves never reach the printed pages.
    expect(container.querySelectorAll('.page-break-spacer').length).toBe(0);

    const pages = Array.from(container.querySelectorAll(`:scope > .${PRINT_PAGE_CLASS}`));
    expect(pages.length).toBe(2);
    expect(pages[0].querySelector('.resume-header')?.textContent).toBe('Header');
    expect(pages[0].querySelector('[data-section="experience"]')?.textContent)
      .toContain('Job 1');
    expect(pages[1].querySelector('[data-section="education"]')?.textContent)
      .toContain('Degree');
    // Document order is preserved across the boxes.
    expect(pages[0].compareDocumentPosition(pages[1]) & Node.DOCUMENT_POSITION_FOLLOWING)
      .toBeTruthy();
  });

  it('splits a section straddling a cut and marks the continuation', () => {
    const container = setupContainer(
      '<div class="positioned-block section-block" data-section="experience">' +
        '<h3 class="layout-line">EXPERIENCE</h3>' +
        '<div class="positioned-block entity-item">Job 1</div>' +
        spacer(2) +
        '<div class="positioned-block entity-item">Job 2</div>' +
        '</div>'
    );

    expect(paginator.wrapForPrint(container)).toBe(true);

    const pages = Array.from(container.querySelectorAll(`:scope > .${PRINT_PAGE_CLASS}`));
    expect(pages.length).toBe(2);

    const first = pages[0].querySelector('[data-section="experience"]');
    const second = pages[1].querySelector('[data-section="experience"]');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    // Each half keeps the section's own classes so theme CSS still applies…
    expect(first?.className).toBe('positioned-block section-block');
    expect(second?.className).toBe('positioned-block section-block');
    // …and holds exactly the entries that belong to its page.
    expect(first?.querySelectorAll('.entity-item').length).toBe(1);
    expect(first?.querySelector('.entity-item')?.textContent).toBe('Job 1');
    expect(second?.querySelectorAll('.entity-item').length).toBe(1);
    expect(second?.querySelector('.entity-item')?.textContent).toBe('Job 2');
    // The page-2 copy is the continuation; the first half is not.
    expect(first?.hasAttribute(PRINT_CONTINUATION_ATTR)).toBe(false);
    expect(second?.hasAttribute(PRINT_CONTINUATION_ATTR)).toBe(true);
    // The heading travelled with the first half.
    expect(first?.querySelector('h3')?.textContent).toBe('EXPERIENCE');
    expect(second?.querySelector('h3')).toBeNull();
  });

  it('splits recursively when a cut falls between bullets of a long entry', () => {
    const container = setupContainer(
      '<div class="positioned-block section-block" data-section="experience">' +
        '<h3 class="layout-line">EXPERIENCE</h3>' +
        '<div class="positioned-block entity-item" data-entity-index="0">' +
        '<div class="layout-line">Role - Company</div>' +
        '<ul>' +
        '<li data-field="description">Bullet one</li>' +
        spacer(2) +
        '<li data-field="description">Bullet two</li>' +
        '</ul>' +
        '</div>' +
        '</div>'
    );

    expect(paginator.wrapForPrint(container)).toBe(true);

    const pages = Array.from(container.querySelectorAll(`:scope > .${PRINT_PAGE_CLASS}`));
    expect(pages.length).toBe(2);

    const firstItem = pages[0].querySelector('[data-entity-index="0"]');
    const secondItem = pages[1].querySelector('[data-entity-index="0"]');
    expect(firstItem?.querySelectorAll('li').length).toBe(1);
    expect(firstItem?.querySelector('li')?.textContent).toBe('Bullet one');
    expect(firstItem?.hasAttribute(PRINT_CONTINUATION_ATTR)).toBe(false);
    // Entry, list and bullet are all part of the continuation chain so the
    // print stylesheet can strip the spacing that stayed on page 1.
    expect(secondItem?.hasAttribute(PRINT_CONTINUATION_ATTR)).toBe(true);
    expect(secondItem?.querySelector('ul')?.hasAttribute(PRINT_CONTINUATION_ATTR)).toBe(true);
    expect(secondItem?.querySelector('li')?.textContent).toBe('Bullet two');
    // The role line stays on the first page with its first bullets.
    expect(firstItem?.querySelector('.layout-line')?.textContent).toBe('Role - Company');
    expect(secondItem?.querySelector('.layout-line')).toBeNull();
  });

  it('drops the empty leading half when a cut precedes a section heading', () => {
    // A heading that moves to the next page takes its section with it: the
    // spacer sits before the h3 inside the section, leaving nothing of the
    // section on the previous page.
    const container = setupContainer(
      '<div class="positioned-block section-block" data-section="skills">' +
        spacer(2) +
        '<h3 class="layout-line">SKILLS</h3>' +
        '<ul class="skills-grid"><li>TypeScript</li></ul>' +
        '</div>'
    );

    expect(paginator.wrapForPrint(container)).toBe(true);

    const pages = Array.from(container.querySelectorAll(`:scope > .${PRINT_PAGE_CLASS}`));
    expect(pages.length).toBe(1);
    const section = pages[0].querySelector('[data-section="skills"]');
    expect(section?.hasAttribute(PRINT_CONTINUATION_ATTR)).toBe(true);
    expect(section?.querySelector('h3')?.textContent).toBe('SKILLS');
    expect(container.querySelectorAll('[data-section="skills"]').length).toBe(1);
  });

  it('skips pages left without printable content', () => {
    const container = setupContainer(
      '<div class="positioned-block resume-header">Header</div>' +
        spacer(2) +
        spacer(3) +
        '<div class="positioned-block section-block">Skills</div>'
    );

    expect(paginator.wrapForPrint(container)).toBe(true);

    const pages = Array.from(container.querySelectorAll(`:scope > .${PRINT_PAGE_CLASS}`));
    expect(pages.length).toBe(2);
    expect(pages[0].querySelector('.resume-header')).not.toBeNull();
    expect(pages[1].querySelector('.section-block')).not.toBeNull();
  });

  it('restores the sheet byte-for-byte after printing', () => {
    const html =
      '<div class="positioned-block resume-header">Header</div>' +
      '<div class="positioned-block section-block" data-section="experience">' +
      '<h3 class="layout-line">EXPERIENCE</h3>' +
      '<div class="positioned-block entity-item">Job 1</div>' +
      spacer(2) +
      '<div class="positioned-block entity-item">Job 2</div>' +
      '</div>';
    const container = setupContainer(html);

    paginator.wrapForPrint(container);
    expect(container.innerHTML).not.toBe(html);

    paginator.unwrapAfterPrint(container);

    expect(container.classList.contains(PRINT_PAGINATED_CLASS)).toBe(false);
    expect(container.innerHTML).toBe(html);
    // The restored spacers keep their page numbers: the preview still shows
    // the cuts it showed before printing.
    expect(container.querySelectorAll('.page-break-spacer').length).toBe(1);
  });

  it('refuses to double-wrap and can wrap again after unwrapping', () => {
    const container = setupContainer(
      '<div class="positioned-block resume-header">Header</div>' +
        spacer(2) +
        '<div class="positioned-block section-block">Skills</div>'
    );

    expect(paginator.wrapForPrint(container)).toBe(true);
    expect(paginator.wrapForPrint(container)).toBe(false);
    expect(container.querySelectorAll(`.${PRINT_PAGE_CLASS}`).length).toBe(2);

    paginator.unwrapAfterPrint(container);
    expect(paginator.wrapForPrint(container)).toBe(true);
    expect(container.querySelectorAll(`.${PRINT_PAGE_CLASS}`).length).toBe(2);
  });

  it('unwrapping is a no-op when nothing is wrapped', () => {
    const html = '<div class="positioned-block resume-header">Header</div>';
    const container = setupContainer(html);

    paginator.unwrapAfterPrint(container);

    expect(container.innerHTML).toBe(html);
    expect(paginator.isWrapped(container)).toBe(false);
  });
});
