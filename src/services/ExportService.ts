/**
 * PDF export service.
 *
 * The PDF is produced by the browser's own print pipeline ("Save as PDF" in
 * the print dialog) instead of a second, hand-written layout engine.
 *
 * Why: the preview is a real A4 sheet built from the same CSS the printer
 * uses, so the exported file is a 1:1 copy of what the user saw — same
 * design theme, fonts, colours, spacing and page breaks. It stays a vector
 * document: the text is selectable and machine-readable (which is what
 * applicant tracking systems parse) and the file weighs a couple of hundred
 * kilobytes. Rasterising the preview and embedding that bitmap would cost
 * megabytes per page and leave no text layer at all.
 */
import type { ResumeData } from './../types';

/** Query flag that tells the app to print itself once it has rendered. */
export const PRINT_QUERY_FLAG = 'print';

/** Fragment key carrying the resume to a standalone print tab. */
export const PRINT_HASH_KEY = 'print-resume';

/** Everything that must survive the hand-off to a separate printing tab. */
export interface PrintHandoff {
  data: ResumeData;
  design: string;
  align: 'left' | 'center' | 'justify';
  lang: string;
  /** Download name, e.g. `ada-lovelace-resume.pdf`. */
  fileName: string;
}

export class ExportService {
  /**
   * Print the resume.
   *
   * Embedded windows (an iframe preview, a dashboard widget) cannot print
   * themselves — `window.print()` there prints the host page — so the resume
   * is handed over to a standalone tab, which prints it on load.
   */
  public async exportToPdf(handoff: PrintHandoff): Promise<void> {
    if (this.isFramed()) {
      this.openPrintTab(handoff);
      return;
    }

    await this.printCurrentDocument(handoff.fileName);
  }

  /**
   * Open the print dialog for the document as it is right now.
   */
  public async printCurrentDocument(fileName: string): Promise<void> {
    await this.whenReadyToPrint();
    this.preparePrintTitle(fileName);
    window.print();
  }

  /** Derive a download name such as `ada-lovelace-resume.pdf`. */
  public buildFileName(data: ResumeData): string {
    return `${this.slugify(data.personal.name ?? '')}-resume.pdf`;
  }

  /**
   * Encode a hand-off for the fragment of a print tab's URL.
   *
   * The payload travels in the URL rather than in `localStorage`: storage is
   * per-origin *and* partitioned for third-party iframes, so a framed app
   * would write where the top-level print tab cannot read, and the tab would
   * cheerfully print the demo resume instead of the user's.
   */
  public encodeHandoff(handoff: PrintHandoff): string {
    const bytes = new TextEncoder().encode(JSON.stringify(handoff));
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary);
  }

  /** Inverse of {@link encodeHandoff}; returns null for junk input. */
  public decodeHandoff(encoded: string): PrintHandoff | null {
    try {
      const binary = atob(encoded);
      const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));
      const parsed = JSON.parse(new TextDecoder().decode(bytes)) as PrintHandoff;
      return parsed?.data?.personal ? parsed : null;
    } catch {
      return null;
    }
  }

  /**
   * Read the hand-off this tab was opened with, if any.
   *
   * The fragment is stripped immediately: the payload can be a few kilobytes
   * of the user's personal data and must not linger in the address bar,
   * history or a reload.
   */
  public readHandoffFromLocation(): PrintHandoff | null {
    const encoded = new URLSearchParams(window.location.hash.replace(/^#/, '')).get(
      PRINT_HASH_KEY
    );
    if (!encoded) return null;

    const handoff = this.decodeHandoff(encoded);

    const cleanUrl = new URL(window.location.href);
    cleanUrl.hash = '';
    window.history.replaceState(null, '', cleanUrl.toString());

    return handoff;
  }

  /** True when this document is embedded in another page. */
  private isFramed(): boolean {
    try {
      return window.self !== window.top;
    } catch {
      // A cross-origin parent throws on access — which itself means we are
      // framed, and printing here would print the host page.
      return true;
    }
  }

  private openPrintTab(handoff: PrintHandoff): void {
    const url = new URL(window.location.href);
    url.searchParams.set(PRINT_QUERY_FLAG, '1');
    url.hash = `${PRINT_HASH_KEY}=${this.encodeHandoff(handoff)}`;

    if (!window.open(url.toString(), '_blank')) {
      throw new Error('The browser blocked the print tab');
    }
  }

  /**
   * Chrome names a "Save as PDF" file after the document title, so the
   * exported PDF inherits the resume's own name. The title is restored once
   * the dialog closes — either through `afterprint` or, for browsers that
   * never fire it, on a timer that runs as soon as the modal dialog returns.
   */
  private preparePrintTitle(fileName: string): void {
    const previousTitle = document.title;
    let restored = false;

    const restore = (): void => {
      if (restored) return;
      restored = true;
      document.title = previousTitle;
      window.removeEventListener('afterprint', restore);
    };

    document.title = fileName.replace(/\.pdf$/i, '');
    window.addEventListener('afterprint', restore);
    setTimeout(restore, 3000);
  }

  /**
   * The resume is set in Inter/Merriweather, which load asynchronously; print
   * only once they are in, otherwise the PDF falls back to system fonts and
   * the layout shifts by a few millimetres.
   */
  private async whenReadyToPrint(): Promise<void> {
    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      try {
        await fonts.ready;
      } catch {
        // A font failure must not block the export.
      }
    }
  }

  private slugify(value: string): string {
    return (
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'resume'
    );
  }
}
