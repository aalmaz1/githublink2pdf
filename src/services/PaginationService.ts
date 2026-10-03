/**
 * Smart page-break preview — the screen-side mirror of the print engine's
 * fragmentation, so a multi-page resume is laid out truthfully on screen.
 *
 * The exported PDF is produced by the browser's print pipeline (see
 * ExportService), and the print stylesheet in `styles.css` carries the
 * keep-together rules: an entry (`.entity-item`) is never sliced by a page
 * boundary, a section heading always travels with its section, bullets stay
 * whole, and no single line is stranded on either side of a cut. A block the
 * page edge would slice therefore moves whole to the top of the next page,
 * leaving the rest of its page empty — in print.
 *
 * Without help, the on-screen sheet would not show any of that: content
 * would keep flowing straight through the page guide. This module measures
 * the preview with the same block-level rules the print engine applies and
 * inserts screen-only spacers into the 36 mm gap between two pages (bottom
 * margin of one page + top margin of the next). The preview then shows real
 * pages — content ends where the page ends and the next block starts on the
 * next sheet — so what the user approves on screen is what gets printed.
 *
 * The spacers carry no resume data: `resume-editor.ts` reads only
 * `[data-field]` elements, the spacers are `contenteditable="false"`, and
 * the print stylesheet removes them (`display: none`) before the PDF is
 * produced — print fragmentation is computed by the browser alone.
 *
 * After the cuts are placed, the sheet is padded to a whole number of pages
 * (`min-height`), so a two-page resume is previewed as two complete A4
 * sheets rather than a sheet cut off mid-page. Print pins `min-height` back
 * to 0, and trailing blank space produces no extra printed pages.
 *
 * ---- Density autofit -------------------------------------------------------
 *
 * Keep-together rules are what make a slightly-too-long resume expensive: the
 * entry the page edge would slice moves whole to the next page and leaves the
 * rest of its page empty, so a resume that overflows its budget by a few
 * percent ends up with a nearly blank last sheet — the final section (usually
 * Skills) alone at the top of page 3 while half of page 2 stands empty.
 *
 * When the plan needs more than {@link DEFAULT_TARGET_PAGES} sheets, the sheet
 * is therefore re-measured at a slightly denser vertical rhythm — line height,
 * section and entry spacing, list spacing — and the mildest density the resume
 * fits at is kept (see {@link chooseSheetDensity}). Type size, page box and
 * the 18 mm margins never change, so the document still prints as the A4 sheet
 * the user approved; only the air between the lines gives way. A resume that
 * needs more than the ladder can buy keeps its design untouched and simply
 * runs longer.
 */

/** CSS px per mm at the standard 96 dpi. */
export const PX_PER_MM = 96 / 25.4;

/** A4 sheet geometry — keep in sync with the `--page-*` variables in styles.css. */
export const PAGE_HEIGHT_MM = 297;
export const PAGE_PADDING_MM = 18;

/**
 * Page-box numbers, in layout px (the sheet's own coordinate space, i.e.
 * measured with the preview zoom divided out) from the sheet's top edge.
 */
export interface PageMetrics {
  /** Top of the first page's content area — the sheet's 18 mm padding. */
  contentTop: number;
  /** Height of one page's content area: 297 mm minus top and bottom margins. */
  contentHeight: number;
  /** Distance between consecutive pages' content-area tops (one A4 height). */
  pageStride: number;
}

export const DEFAULT_PAGE_METRICS: PageMetrics = {
  contentTop: PAGE_PADDING_MM * PX_PER_MM,
  contentHeight: (PAGE_HEIGHT_MM - PAGE_PADDING_MM * 2) * PX_PER_MM,
  pageStride: PAGE_HEIGHT_MM * PX_PER_MM
};

/**
 * Custom property carrying the sheet's rhythm density: 1 is the design as
 * authored, 0.94 is six percent less air between the blocks. Read by the
 * `--sheet-unit` / `--leading-*` rules in styles.css; set on the sheet only,
 * so the UI chrome keeps its own spacing.
 */
export const SHEET_DENSITY_VAR = '--sheet-density';

/** Sheets a resume is packed into before the density autofit lets it grow. */
export const DEFAULT_TARGET_PAGES = 2;

/**
 * Densities the autofit may try, mildest first. The ladder is deliberately
 * short and shallow: a couple of percent of leading is invisible on paper,
 * while 10 % is the point where the text starts to look squeezed — past it,
 * an extra sheet is the better answer.
 */
export const DEFAULT_FIT_LADDER: readonly number[] = [0.98, 0.96, 0.94, 0.92, 0.9];

/** Page (1-based) a y coordinate falls on, in the sheet's layout px. */
export function pageIndexOf(top: number, metrics: PageMetrics): number {
  return Math.max(
    1,
    Math.floor((top - metrics.contentTop + EPSILON) / metrics.pageStride) + 1
  );
}

/**
 * Pick the density to typeset the sheet at.
 *
 * `pagesAt(density)` measures the flow as it would be laid out at a given
 * density — the caller owns the DOM, this function owns the policy: 1 when the
 * resume already fits its budget, the mildest density that brings it within
 * the budget otherwise, and `null` when even the densest rung of the ladder is
 * not enough (the caller then keeps the design as authored rather than
 * shrinking the type into a block).
 */
export function chooseSheetDensity(
  pagesAt: (density: number) => number,
  options: { targetPages?: number; ladder?: readonly number[] } = {}
): number | null {
  const targetPages = options.targetPages ?? DEFAULT_TARGET_PAGES;
  const ladder = options.ladder ?? DEFAULT_FIT_LADDER;

  if (pagesAt(1) <= targetPages) return 1;
  for (const density of ladder) {
    if (density >= 1) continue; // not a compaction
    if (pagesAt(density) <= targetPages) return density;
  }
  return null;
}

/**
 * One fragmentation candidate: a block the print engine keeps whole, listed
 * in document order. `top` values come from the clean layout (no spacers).
 */
export interface PlannedItem {
  top: number;
  height: number;
  /**
   * false for screen-only scaffolding that print hides (an empty Experience
   * or Education section): it may occupy space in the flow but never causes
   * a page to break early, mirroring print where it does not exist.
   */
  canPush: boolean;
  /**
   * Must not be separated from the next block — a section heading, or an
   * entry's role/company/period line when the entry is too tall to keep
   * together and has to flow. Mirrors `break-after: avoid` in print.
   */
  avoidAfter: boolean;
}

/** A planned page cut: the block at `anchor` and everything after starts on `page`. */
export interface PlannedBreak {
  anchor: number;
  /** 1-based number of the page the anchor block lands on. */
  page: number;
  /** y (layout px) the anchor block's top must land on. */
  targetTop: number;
}

/** Tolerance for fractional-px noise: mm→px conversions rarely land on integers. */
const EPSILON = 0.5;

/** Blocks that must not be separated from whatever follows them. */
const KEEP_WITH_NEXT_SELECTOR = 'h3, .layout-line';

/** Flatten an oversized block at most this deep before treating it as atomic. */
const MAX_FLATTEN_DEPTH = 4;

/**
 * Decide where the page cuts go.
 *
 * Mirrors the print stylesheet's keep-together rules at block granularity:
 *
 * - a "pushable" block that would cross the current page's content edge
 *   moves whole to the top of the next page (a spacer fills the gap);
 * - a run of `avoidAfter` blocks in front of it (heading + entry header
 *   line) moves along, so neither is ever stranded at the foot of a page;
 * - blocks taller than a full page are left to flow — print drops the
 *   keep-together rule for them too and splits them at line boundaries;
 * - blocks that print hides (`canPush: false`) never trigger a cut.
 */
export function planPageBreaks(
  items: PlannedItem[],
  metrics: PageMetrics
): PlannedBreak[] {
  const breaks: PlannedBreak[] = [];
  const pushed = new Set<number>();
  let shift = 0; // total height of the spacers planned so far

  const pageStart = (page: number): number =>
    metrics.contentTop + (page - 1) * metrics.pageStride;
  const pageOf = (top: number): number => pageIndexOf(top, metrics);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (!item.canPush) continue;
    // Taller than a page: print lets it fragment, so no spacer can help.
    if (item.height > metrics.contentHeight + EPSILON) continue;

    const top = item.top + shift;
    const page = pageOf(top);
    const pageEnd = pageStart(page) + metrics.contentHeight;
    if (top + item.height <= pageEnd + EPSILON) continue;

    // Walk backwards over the run of blocks that must travel with this one.
    let anchor = i;
    let clusterHeight = item.height;
    while (anchor > 0) {
      const prev = items[anchor - 1];
      if (!prev.canPush || !prev.avoidAfter || pushed.has(anchor - 1)) break;
      if (pageOf(prev.top + shift) !== page) break;
      if (clusterHeight + prev.height > metrics.contentHeight + EPSILON) break;
      clusterHeight += prev.height;
      anchor--;
    }

    const targetTop = pageStart(page + 1);
    const spacerHeight = Math.max(0, targetTop - (items[anchor].top + shift));
    breaks.push({ anchor, page: page + 1, targetTop });
    pushed.add(anchor);
    shift += spacerHeight;
  }

  return breaks;
}

/** A planned item together with the element it was measured from. */
interface CollectedItem extends PlannedItem {
  el: HTMLElement;
}

export interface PaginationOptions {
  metrics?: PageMetrics;
  /**
   * Sheets the density autofit packs a resume into. Pass `Infinity` to keep
   * every resume at the design's authored rhythm.
   */
  targetPages?: number;
  /** Densities the autofit may try, mildest first. */
  fitLadder?: readonly number[];
  /**
   * Called when the applied density changes — the preview can then tell the
   * user why the spacing just tightened. Not called for re-measurements that
   * keep the same density.
   */
  onDensityChange?: (density: number) => void;
}

/**
 * Measures the preview and pads the inter-page gaps so it shows real pages.
 * The class holds no state besides the debounce timer, so one instance can
 * serve the whole app (and its print tab).
 */
export class PaginationService {
  private readonly metrics: PageMetrics;
  private readonly targetPages: number;
  private readonly fitLadder: readonly number[];
  private readonly onDensityChange?: (density: number) => void;
  private timer: number | null = null;
  /** Density currently applied to the sheet (1 = the design as authored). */
  private density = 1;
  /** Density of the last finished layout — what subscribers were told about. */
  private publishedDensity = 1;

  constructor(options: PaginationOptions = {}) {
    this.metrics = options.metrics ?? DEFAULT_PAGE_METRICS;
    this.targetPages = options.targetPages ?? DEFAULT_TARGET_PAGES;
    this.fitLadder = options.fitLadder ?? DEFAULT_FIT_LADDER;
    this.onDensityChange = options.onDensityChange;
  }

  /**
   * Re-measure after a short delay. Editing, re-renders, theme changes and
   * font swaps all funnel through here; the debounce keeps typing smooth
   * (one measurement pass per burst of input events).
   */
  public scheduleUpdate(container: HTMLElement, delayMs = 100): void {
    if (this.timer !== null) window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.update(container);
    }, delayMs);
  }

  /** Measure the sheet and (re)build the page-break spacers. */
  public update(container: HTMLElement): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }

    // Stale spacers would poison the measurements: with them removed the
    // sheet is back to the clean layout print will see.
    this.clearSpacers(container);

    const zoom = this.readZoom(container);
    const layoutTopOf = (el: HTMLElement): number => {
      const sheet = container.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      return (rect.top - sheet.top) / zoom;
    };

    const sheetBox = container.getBoundingClientRect();
    if (sheetBox.width <= 0 && sheetBox.height <= 0) return; // not rendered

    // Decide the rhythm first: the cuts are planned on the layout the density
    // produces, and the spacers are measured against those same boxes.
    const items = this.fitToPages(container, layoutTopOf, zoom);
    if (items.length === 0) {
      container.style.minHeight = '';
      return;
    }

    const breaks = planPageBreaks(
      items.map(({ el: _el, top, height, canPush, avoidAfter }) => ({
        top,
        height,
        canPush,
        avoidAfter
      })),
      this.metrics
    );
    if (breaks.length > 0) {
      this.applyBreaks(container, items, breaks, layoutTopOf);
    }

    this.padToWholePages(container, items);
    this.publishDensity();
  }

  /**
   * Measure the clean flow and, if the plan would run past the page budget,
   * look for the mildest denser rhythm the resume still fits at. Returns the
   * layout the cuts must be planned on — the authored one when the resume
   * fits as is, or the ladder is exhausted.
   */
  private fitToPages(
    container: HTMLElement,
    layoutTopOf: (el: HTMLElement) => number,
    zoom: number
  ): CollectedItem[] {
    this.applyDensity(container, 1);
    const natural = this.collectItems(container, layoutTopOf, zoom);
    if (natural.length === 0) return natural;

    let packed = natural;
    const density = chooseSheetDensity(
      candidate => {
        if (candidate !== 1) {
          this.applyDensity(container, candidate);
          packed = this.collectItems(container, layoutTopOf, zoom);
        }
        return this.plannedPages(candidate === 1 ? natural : packed);
      },
      { targetPages: this.targetPages, ladder: this.fitLadder }
    );

    if (density === null || density === 1) {
      // Either the resume already fits, or no rung of the ladder does: keep
      // the design as authored. `natural` was measured at density 1, which is
      // exactly what the sheet is put back to here.
      this.applyDensity(container, 1);
      return natural;
    }

    this.applyDensity(container, density);
    return packed;
  }

  /**
   * Sheets the flow will occupy once the planner has placed its cuts: every
   * spacer becomes one `.print-page` box (see PrintPaginator), so the page the
   * last printable block lands on after the last shift is the page count.
   */
  private plannedPages(items: CollectedItem[]): number {
    const printable = items.filter(item => item.canPush);
    if (printable.length === 0) return 1;

    const breaks = planPageBreaks(items, this.metrics);
    const last = printable[printable.length - 1];
    let lastTop = last.top;
    let page = 1;
    if (breaks.length > 0) {
      const cut = breaks[breaks.length - 1];
      // Blocks after the final cut keep their offset from its anchor, which
      // now sits at the top of its page.
      lastTop += cut.targetTop - items[cut.anchor].top;
      page = cut.page;
    }
    return Math.max(page, pageIndexOf(lastTop + last.height, this.metrics));
  }

  /** Set the sheet's rhythm density (see SHEET_DENSITY_VAR in styles.css). */
  private applyDensity(container: HTMLElement, density: number): void {
    if (density === this.density) return;
    if (density === 1) {
      container.style.removeProperty(SHEET_DENSITY_VAR);
    } else {
      container.style.setProperty(SHEET_DENSITY_VAR, String(density));
    }
    this.density = density;
  }

  /**
   * Announce the density the finished layout uses. The measurement itself
   * flips the sheet back to 1 on every pass, so only the settled value is
   * reported — a subscriber hears about a change of typesetting, not about
   * the intermediate probes of a single re-measure.
   */
  private publishDensity(): void {
    if (this.density === this.publishedDensity) return;
    this.publishedDensity = this.density;
    this.onDensityChange?.(this.density);
  }

  /**
   * Pad the sheet to a whole number of pages, so the preview ends with a
   * complete blank page instead of stopping mid-sheet. What is printed is
   * unaffected: the print stylesheet pins `min-height` back to 0, and extra
   * blank space below the content generates no extra printed pages.
   */
  private padToWholePages(container: HTMLElement, items: CollectedItem[]): void {
    // Symmetric geometry: the bottom margin equals the top margin.
    const used = Math.max(...items.map(item => item.top + item.height)) + this.metrics.contentTop;
    const pages = Math.max(1, Math.ceil((used - EPSILON) / this.metrics.pageStride));
    container.style.minHeight = `${pages * this.metrics.pageStride}px`;
  }

  /** Remove every spacer this service has inserted. */
  public clearSpacers(container: HTMLElement): void {
    container.querySelectorAll('.page-break-spacer').forEach(spacer => {
      spacer.remove();
    });
  }

  /**
   * Collect the fragmentation candidates, in document order, mirroring the
   * print stylesheet: header, section headings, entries, skills grid, list
   * items — atomic while they fit on a page; the children of an oversized
   * block become the candidates instead (that is how print fragments it).
   */
  private collectItems(
    container: HTMLElement,
    layoutTopOf: (el: HTMLElement) => number,
    zoom: number
  ): CollectedItem[] {
    const items: CollectedItem[] = [];
    const contentHeight = this.metrics.contentHeight;

    const pushItem = (el: HTMLElement, canPush: boolean, avoidAfter: boolean): void => {
      const rect = el.getBoundingClientRect();
      const height = rect.height / zoom;
      if (height < EPSILON) return;
      items.push({ el, top: layoutTopOf(el), height, canPush, avoidAfter });
    };

    const flatten = (el: Element, canPush: boolean, depth: number): void => {
      const height = el.getBoundingClientRect().height / zoom;
      const oversized = height > contentHeight + EPSILON;
      const canDescend = depth < MAX_FLATTEN_DEPTH && el.children.length > 0;
      if (!oversized || !canDescend) {
        pushItem(
          el as HTMLElement,
          canPush,
          canPush && el.matches(KEEP_WITH_NEXT_SELECTOR)
        );
        return;
      }
      Array.from(el.children).forEach(child => flatten(child, canPush, depth + 1));
    };

    Array.from(container.children).forEach(topLevel => {
      const el = topLevel as HTMLElement;
      if (el.classList.contains('section-block')) {
        // Empty Experience/Education sections exist only for on-screen
        // editing; print hides them, so they never push anything.
        const visibleInPrint = !el.classList.contains('section-empty');
        Array.from(el.children).forEach(child => {
          if (child.matches('h3')) {
            if (visibleInPrint) {
              pushItem(child as HTMLElement, true, true);
            }
            return;
          }
          flatten(child, visibleInPrint, 1);
        });
        return;
      }
      flatten(el, true, 0);
    });

    return items;
  }

  /**
   * Insert the spacers and size them so each anchor block lands exactly on
   * its page's top. Spacers start at 0 height (margins collapse through a
   * 0-height box, so the layout is untouched) and are sized in document
   * order — each measurement already includes the spacers sized before it.
   */
  private applyBreaks(
    container: HTMLElement,
    items: CollectedItem[],
    breaks: PlannedBreak[],
    layoutTopOf: (el: HTMLElement) => number
  ): void {
    const inserted: Array<{ spacer: HTMLElement; anchor: HTMLElement; targetTop: number }> = [];

    for (const br of breaks) {
      const anchor = items[br.anchor]?.el;
      if (!anchor?.parentElement) continue;

      const spacer = document.createElement('div');
      spacer.className = 'page-break-spacer';
      spacer.setAttribute('contenteditable', 'false');
      spacer.setAttribute('aria-hidden', 'true');
      spacer.dataset.page = String(br.page);
      spacer.style.height = '0px';
      anchor.parentElement.insertBefore(spacer, anchor);
      inserted.push({ spacer, anchor, targetTop: br.targetTop });
    }

    for (const { spacer, anchor, targetTop } of inserted) {
      const height = Math.max(0, targetTop - layoutTopOf(anchor));
      spacer.style.height = `${height}px`;
    }
  }

  /**
   * The fit-to-width preview zoom (`--preview-zoom`) scales every visual
   * rect; dividing it back out yields the sheet's own layout px, which is
   * what the printed page is typeset in.
   */
  private readZoom(container: HTMLElement): number {
    const raw = (getComputedStyle(container) as CSSStyleDeclaration & { zoom?: string }).zoom;
    const zoom = parseFloat(raw ?? '');
    return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
  }
}
