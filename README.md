# Github Link2PDF Resume Builder

A client-side resume builder that turns a GitHub profile into an editable, ATS-aware, print-ready resume. Built as a Vite single-page app in TypeScript — no backend, no framework.

## Features

- **GitHub import** — enter a username or profile URL; the app loads profile data, top repositories, languages, and topics, then drafts experience bullets from that metadata
- **30 resume designs** — professional, creative, minimal, tech, business, elegant, and bold templates, plus a random-design button
- **Inline editing** — click any text on the preview to change it (`contenteditable`)
- **ATS checker** — scores structure, keywords, contacts, format, dates, experience, and education (plus an overall summary verdict), with a side panel of concrete recommendations. Each criterion shows its score and its labelled **weight** (share of the total), so `90% · вес 26%` is never confusing
- **Export** — A4 PDF via html2pdf.js, or download the resume as JSON
- **UI** — interface chrome in English, Russian, and Korean; light/dark theme, text alignment; preferences stored in `localStorage`
- **Demo profile** — a generated sample resume loads immediately so you can try designs without an import

A network connection is required only for GitHub import (unauthenticated GitHub REST API). Everything else runs in the browser.

### Language support

The UI chrome (buttons, labels, toasts) switches between English, Russian, and Korean. Resume section headings and ATS recommendations remain in English; a few ATS panel labels are not yet localized.

## Tech stack

| Layer | Choice |
| --- | --- |
| Language | TypeScript |
| Bundler / dev server | Vite |
| Styling | CSS custom properties (one class per design) |
| Tests | Vitest + jsdom |
| PDF | html2pdf.js / html2canvas |
| Data | GitHub REST API, `localStorage` |

## Getting started

Node.js 20.19+ or 22.12+ is required (Vite 8).

```bash
git clone https://github.com/aalmaz1/resume_builder.git
cd resume_builder
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
6. **Export PDF** or **Save JSON**.

GitHub unauthenticated API limits apply. If import fails with a rate-limit message, wait and retry.

## Project layout

```
index.html                     # App shell and print styles
src/
  main.ts                      # UI wiring: import, design, ATS, export, i18n
  resume-builder.ts            # Renders resume HTML from data
  github-provider.ts           # GitHub API + username parsing
  demo-profile.ts              # Faker-based sample resume
  translations.ts              # UI chrome strings (EN / RU / KO)
  styles.css                   # UI chrome + 30 design themes
  html2pdf.d.ts                # Type declarations for html2pdf.js
  designs/design-templates.ts  # The 30 design definitions + helpers
  services/ATSService.ts       # ATS scoring
  services/ExportService.ts    # A4 PDF export
  config/ats-keywords.ts       # Keyword banks used by the ATS checker
  i18n/index.ts                # Resume-heading lookup and emoji cleanup
  i18n/en.json                 # English resume section labels
  types.ts, types/ats.ts       # Resume and ATS data types
  utils/github-cache.ts        # localStorage cache for GitHub responses
  utils/logger.ts              # Console logger
__tests__/                     # Vitest unit tests
.github/workflows/ci.yml       # CI: type check, tests, build, coverage
```

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes and pull requests to `main` and `master`. It installs dependencies with `npm ci`, type-checks the project (`tsc --noEmit`), runs the Vitest suite, produces a production build, generates a coverage summary (`coverage/coverage-summary.json`), and uploads it to Codecov.

CodeQL analysis is enabled through GitHub's default setup (repository security settings), so its runs appear in the Actions tab on every push and pull request — there is no CodeQL workflow file in this repository. The app is a client-side SPA with no server, database, or authentication surface, and user-derived resume fields are rendered with `textContent` rather than `innerHTML`.

## License

MIT. See [LICENSE](LICENSE).

Copyright © 2026 Khudayberdiev Almaz
