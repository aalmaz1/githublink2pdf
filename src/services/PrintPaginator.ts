/**
 * Print-time page boxing — the bridge between the continuous preview sheet
 * and the printed pages.
 *
 * Why this exists: the PDF is produced by the browser's print pipeline (see
 * ExportService), and that pipeline decorates every printed page with its own
 * running header and footer — date, time, document title, URL, page numbers —
 * drawn inside the @page margin band. A résumé must not carry "30.09.2026,
 * 01:23 sofia-moreau-resume" at the top of every sheet, and the only reliable
 * way to keep that chrome out of the file is `@page { margin: 0 }`: with zero
 * margins the print dialog offers no header/footer at all. But then the page
 * frame has to come from the document itself — a box fragmented across pages
 * paints its padding only on its first fragment, so a padded sheet would
 * leave pages 2+ glued to the paper edge.
 *
 * So, just before printing, the sheet is re-boxed into explicit A4 pages
 * (`.print-page`: 210 × 297 mm with the same 18 mm padding and typography the
 * preview shows). Where the cuts go was already decided on screen: the
 * PaginationService mirrors the print engine's keep-together rules and leaves
 * a `.page-break-spacer` at every planned boundary. This module consumes
 * those spacers as cut marks — no second layout pass, no measuring: what the
 * user approved on screen is literally what prints.
 *
 * A cut can fall inside a block (an oversized entry that has to flow across
 * pages is cut between its bullets): the block is split into two shallow
 * copies carrying the same classes, and the trailing copy is marked
 * `data-print-continuation` so the print stylesheet can strip the padding and
 * margins that stayed behind on the previous page — the continuation then
 * starts exactly at the page's content top, where the on-screen spacer put
 * it.
 *
 * The transformation lives only for the duration of the print job: the
 * container's HTML is snapshotted before boxing and restored afterwards
 * (`afterprint`), so the editable preview — caret, inline edits, spacers — is
 * handed back byte-for-byte as it was taken.
 */

/** Marks the sheet as boxed for printing (`display: contents` in print CSS). */
export const PRINT_PAGINATED_CLASS = 'print-paginated';

/** One A4 page: the same frame the @page margin used to provide. */
export const PRINT_PAGE_CLASS = 'print-page';

/** Set on the trailing copy of a block that a page cut sliced in two. */
export const PRINT_CONTINUATION_ATTR = 'data-print-continuation';

/** Screen-only cut mark left by PaginationService. */
const SPACER_CLASS = 'page-break-spacer';

function isSpacer(node: Node): boolean {
  return (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as Element).classList.contains(SPACER_CLASS)
  );
}

export class PrintPaginator {
  /** Pre-boxing snapshots, so several tabs/containers stay independent. */
  private readonly snapshots = new WeakMap<HTMLElement, string>();

  /**
   * Box the sheet into `.print-page` elements at the planned cuts.
   *
   * Returns true when the sheet was restructured; false when there was
   * nothing to do (one page — the flow prints correctly as is, framed by the
   * sheet's own padding) or a boxing is already active.
   */
  public wrapForPrint(container: HTMLElement): boolean {
    if (container.classList.contains(PRINT_PAGINATED_CLASS)) return false;
    // No spacers → no cuts planned → the resume fits one printed page; the
    // flow prints as it stands and the sheet's own padding frames it.
    if (!container.querySelector(`.${SPACER_CLASS}`)) return false;

    this.snapshots.set(container, container.innerHTML);
    try {
      const pages = this.planPages(container);
      if (pages.length === 0) {
        this.restore(container);
        return false;
      }

      const boxed = document.createDocumentFragment();
      for (const nodes of pages) {
        const page = document.createElement('div');
        page.className = PRINT_PAGE_CLASS;
        for (const node of nodes) page.appendChild(node);
        boxed.appendChild(page);
      }
      // The page boxes replace the flow; nodes were moved out of their old
      // parents by planPages, so the leftover original tree simply goes.
      container.replaceChildren(boxed);
      container.classList.add(PRINT_PAGINATED_CLASS);
      return true;
    } catch (error) {
      // Never leave the sheet half-boxed for the screen to show.
      this.restore(container);
      throw error;
    }
  }

  /**
   * Restore the sheet exactly as it was before boxing (called on
   * `afterprint`). The snapshot carries the spacers too, so the preview
   * keeps showing the cuts until the next re-measure.
   */
  public unwrapAfterPrint(container: HTMLElement): void {
    if (!container.classList.contains(PRINT_PAGINATED_CLASS)) return;
    this.restore(container);
  }

  /** True while a boxing is active (between `beforeprint` and `afterprint`). */
  public isWrapped(container: HTMLElement): boolean {
    return container.classList.contains(PRINT_PAGINATED_CLASS);
  }

  private restore(container: HTMLElement): void {
    const snapshot = this.snapshots.get(container);
    this.snapshots.delete(container);
    container.classList.remove(PRINT_PAGINATED_CLASS);
    if (snapshot !== undefined) container.innerHTML = snapshot;
  }

  /**
   * Walk the sheet's children and group them into pages. A spacer starts a
   * new page; an element containing a spacer is split by
   * {@link fragmentNode} and its pieces distributed over the pages it spans.
   * Whitespace-only groups (and pages left with nothing visible) are dropped.
   */
  private planPages(container: HTMLElement): Node[][] {
    const pages: Node[][] = [[]];

    for (const child of Array.from(container.childNodes)) {
      if (isSpacer(child)) {
        pages.push([]);
        continue;
      }
      const parts = this.fragmentNode(child);
      parts.forEach((part, index) => {
        if (index > 0) pages.push([]);
        if (part) pages[pages.length - 1].push(part);
      });
    }

    // A page needs an element to print; stray text nodes are not content.
    return pages
      .map(nodes => PrintPaginator.trimEdgeWhitespace(nodes))
      .filter(nodes => nodes.some(node => node.nodeType === Node.ELEMENT_NODE));
  }

  /** Drop whitespace-only text nodes at a page's edges: they would stop
   *  :first-child / :last-child from matching the blocks whose margins the
   *  print stylesheet has to adjust. */
  private static trimEdgeWhitespace(nodes: Node[]): Node[] {
    const isBlank = (node: Node): boolean =>
      node.nodeType === Node.TEXT_NODE && !(node.textContent ?? '').trim();

    let start = 0;
    let end = nodes.length;
    while (start < end && isBlank(nodes[start])) start++;
    while (end > start && isBlank(nodes[end - 1])) end--;
    return nodes.slice(start, end);
  }

  /**
   * Split `node` at the spacers it contains. Returns one entry per page the
   * node spans: `null` when the node contributes nothing to that page, or a
   * shallow copy of `node` holding the children that belong to that page
   * (marked `data-print-continuation` for every page after the first).
   * Children are MOVED into the copies, emptying the original node.
   */
  private fragmentNode(node: Node): Array<Node | null> {
    const element = node as Element;
    if (
      node.nodeType !== Node.ELEMENT_NODE ||
      !element.querySelector(`.${SPACER_CLASS}`)
    ) {
      return [node];
    }

    const groups: Node[][] = [[]];
    for (const child of Array.from(node.childNodes)) {
      if (isSpacer(child)) {
        groups.push([]);
        continue;
      }
      const parts = this.fragmentNode(child);
      parts.forEach((part, index) => {
        if (index > 0) groups.push([]);
        if (part) groups[groups.length - 1].push(part);
      });
    }

    return groups.map((children, index) => {
      if (children.length === 0) return null;
      const copy = element.cloneNode(false) as Element;
      if (index > 0) copy.setAttribute(PRINT_CONTINUATION_ATTR, 'true');
      for (const child of children) copy.appendChild(child);
      return copy;
    });
  }
}
