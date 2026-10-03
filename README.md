<p align="center"><img src="logo.webp" width="220" alt="Github Link2PDF logo"></p>

# Github Link2PDF Resume Builder

A client-side resume builder that turns a GitHub profile into an editable, ATS-aware, print-ready resume. Built as a Vite single-page app in TypeScript — no backend, no framework.

## Features

- **GitHub import** — enter a username or profile URL; the app loads profile data, top repositories, languages, and topics, then drafts experience bullets from that metadata
- **30 resume designs** — professional, creative, minimal, tech, business, elegant, and bold templates, plus a random-design button
- **Inline editing** — click any text on the preview to change it (`contenteditable`)
- **ATS checker** — scores structure, keywords, contacts, format, dates, experience, and education (plus an overall summary verdict), with a side panel of concrete recommendations. Each criterion shows its score and its labelled **weight** (share of the total), so `90% · вес 26%` is never confusing
- **A4 preview** — the editing surface is a real A4 sheet: fixed 210 × 297 mm pages (scaled to fit narrow windows), page guides where the printer will cut, and identical typography, colours and margins on screen and on paper
- **Smart page breaks** — when the content outgrows one page it is not sliced mid-line: a job entry the page edge would cut moves whole onto the next page, section headings travel with their content, bullets never split mid-sentence and no single line is stranded. The preview mirrors the print engine and shows the real cuts (blank rest-of-page included), and every printed page keeps its full 18 mm margins — including pages 2+, because the cuts are made into explicit A4 page boxes just before printing
- **Two-page density autofit** — keep-together rules are what make a slightly-too-long resume expensive: the entry the page edge would cut moves whole to the next page and leaves the rest of its page empty, so a resume overflowing its budget by a few percent used to push its last section (usually Skills) onto a nearly blank third sheet. Now the preview re-measures the sheet at a slightly denser vertical rhythm — line height, section/entry/list spacing, never the type size, the page box or the margins — and keeps the mildest density the resume fits two pages at, telling the user when the spacing changed. A resume that even the densest rhythm cannot fit keeps its design untouched and simply runs longer
- **Export** — PDF through the browser's own print pipeline, so the file is a 1:1 copy of the sheet on screen: the selected design, theme colours, fonts and page breaks, with real, selectable, machine-readable text (ATS parsers can read it) and a weight of roughly 50–150 KB. The exported pages carry no browser stamp either — no date, page title or URL in the margins, because the pages are framed by the document itself. Or download the resume as JSON
- **UI** — interface chrome in English, Russian, and Korean; light/dark theme, text alignment; preferences stored in `localStorage`
- **Demo profile** — a generated sample resume loads immediately so you can try designs without an import

A network connection is required only for GitHub import (unauthenticated GitHub REST API). Everything else runs in the browser.

### Language support

The UI chrome (buttons, labels, toasts) and resume section headings switch between English, Russian, and Korean. ATS recommendations stay in English; a few ATS panel labels are not yet localized.

## Tech stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript |
| Bundler / dev server | Vite |
| Styling | CSS custom properties (one class per design) |
| Fonts | Inter + Merriweather, self-hosted via `@fontsource` (SIL OFL, see `THIRD_PARTY_NOTICES.md`) |
| Tests | Vitest + jsdom |
| PDF | The browser's print pipeline — no PDF library, no rasterisation (vector text, ~50–150 KB per document) |
| Data | GitHub REST API, `localStorage` |

## Getting started

Node.js 20.19+ or 22.12+ is required (Vite 8).

```bash
git clone https://github.com/aalmaz1/githublink2pdf.git
cd githublink2pdf
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Do not open `index.html` as a file — the app is a Vite module graph.

### npm scripts

| Script | What it does |
| --- | --- |
| `npm run dev` / `npm start` | Start the Vite dev server |
| `npm run build` | Type-check, then production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` (both scripts run the same check) |
| `npm test` | Run Vitest once |
| `npm run test:coverage` | Tests with V8 coverage (text, JSON, and HTML reports) |
| `npm run coverage` | Tests with V8 coverage, writing `coverage/coverage-summary.json` (used by CI / Codecov) |

## How to use

1. The page opens with a demo resume.
2. Type a GitHub username (for example `octocat`) or a `github.com/...` URL and click **Import**.
3. Pick a design, alignment, and interface language. Toggle light/dark UI with the floating button.
4. Edit any field on the page.
5. Click **ATS Check** to see a score and recommendations.
6. **Export PDF**, then choose **Save as PDF** as the destination in the browser's print dialog — or **Save JSON** for the raw data.

GitHub unauthenticated API limits apply. If import fails with a rate-limit message, wait and retry.

## How the PDF export works

There is no PDF library in the bundle. The preview *is* a page: `#resume-container`
is 210 × 297 mm with the same padding, fonts and type size the printer uses.
**Export PDF** just calls `window.print()`: pick *Save as PDF* as the destination
and the file contains exactly what was on screen.

That choice buys three things at once:

- **Fidelity** — one layout engine produces both the preview and the PDF, so a
  second renderer can never drift from the design the user approved.
- **Weight** — the pages are vectors and text, not bitmaps: a two-page resume is
  about 50–150 KB, where a rasterised screenshot of the same page costs
  megabytes per page and hides the text from ATS parsers. Theme colours survive
  the export (`print-color-adjust: exact`), including dark designs.
- **Selectable text** — the PDF carries a real text layer, so applicant
  tracking systems and copy-paste work.

Details worth knowing:

- **No browser chrome in the file.** The print pipeline stamps its own running
  header and footer — date, time, document title, URL, page numbers — into the
  `@page` margin band. A résumé must not ship with "30.09.2026, 00:52
  sofia-moreau-resume" at the top of every sheet, so the print stylesheet sets
  `@page { margin: 0 }` (no band, and the print dialog drops its
  "Headers and footers" option) and the page frame comes from the document
  instead: on `beforeprint`, `PrintPaginator` (`src/services/PrintPaginator.ts`)
  boxes the flow into explicit `.print-page` elements — one 210 × 297 mm sheet
  per page, cut exactly where the on-screen page guides showed the cuts, with
  the same 18 mm padding and typography. A cut that falls inside a block (an
  entry taller than a page has to flow on) splits that block into marked
  continuation copies so the next page starts flush. When the dialog closes,
  the editable sheet is restored from a snapshot, byte-for-byte.
- **Page guides.** The hairline every 297 mm marks exactly where the printed
  page breaks — and it is a contract: the spacers the preview inserts are the
  same cut marks the export boxes pages at, so what you see is literally what
  prints. When a section heading or entry would be split by the boundary, the
  whole block moves onto the next page — correct typesetting, and the reason a
  page can end with blank space.
- **Embedded windows.** An iframe cannot print itself (`window.print()` would
  print the host page), so the resume is handed to a standalone tab through
  `localStorage` plus a `?print=1` flag, restored there, and printed once the
  webfonts have loaded. A blocked pop-up surfaces as an error toast.
- **Narrow windows.** On screens narrower than A4 the sheet is scaled with CSS
  `zoom` for display only; the print stylesheet forces it back to 100 %, so a
  phone-sized window exports the same file as a desktop one.

## Project layout

```
index.html                     # App shell and print styles
src/
  main.ts                      # UI wiring: import, design, ATS, export, i18n
  resume-builder.ts            # Renders resume HTML from data (language-aware)
  github-provider.ts           # GitHub API + username parsing
  demo-profile.ts              # Built-in sample resume (no faker dependency)
  translations.ts              # UI + resume-heading strings (EN / RU / KO)
  i18n/ru.ts, i18n/ko.ts       # Lazy-loaded RU / KO string dictionaries
  styles.css                   # UI chrome + 30 design themes
  designs/design-templates.ts  # The 30 design definitions + helpers
  services/ATSService.ts       # ATS scoring
  services/ExportService.ts    # PDF export via the browser print dialog
  services/PaginationService.ts# On-screen mirror of the print page breaks
  services/PrintPaginator.ts   # Boxes the sheet into A4 pages at print time
  config/ats-keywords.ts       # Keyword banks used by the ATS checker
  types.ts, types/ats.ts       # Resume and ATS data types
  utils/github-cache.ts        # localStorage cache for GitHub responses
  utils/logger.ts              # Console logger
  utils/text.ts                # Text helpers (emoji cleanup)
__tests__/                     # Vitest unit tests
.github/workflows/ci.yml       # CI: type check, tests, build, coverage
```

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes and pull requests to `main` and `master`. It installs dependencies with `npm ci`, type-checks the project (`tsc --noEmit`), runs the Vitest suite, produces a production build, generates a coverage summary (`coverage/coverage-summary.json`), and uploads it to Codecov.

CodeQL analysis is enabled through GitHub's default setup (repository security settings), so its runs appear in the Actions tab on every push and pull request — there is no CodeQL workflow file in this repository. The app is a client-side SPA with no server, database, or authentication surface, and user-derived resume fields are rendered with `textContent` rather than `innerHTML`.

## License

MIT. See [LICENSE](LICENSE).

Copyright © 2026 Khudayberdiev Almaz
