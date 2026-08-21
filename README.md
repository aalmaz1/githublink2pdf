# Pretext Resume Builder

A client-side resume builder that turns a GitHub profile into an editable, ATS-aware, print-ready resume. Built as a Vite single-page app in TypeScript — no backend, no framework.

## Features

- **GitHub import** — enter a username or profile URL; the app loads profile data, top repositories, languages, and topics, then drafts experience bullets from that metadata
- **30 resume designs** — professional, creative, minimal, tech, business, elegant, and bold templates, plus a random-design button
- **Inline editing** — click any text on the preview to change it (`contenteditable`)
- **ATS checker** — scores structure, keywords, contacts, format, dates, experience, and education, with a side panel of recommendations
- **Export** — A4 PDF via html2pdf.js, or download the resume as JSON
- **UI** — English / Russian / Korean, light or dark chrome, text alignment, preferences stored in `localStorage`
- **Demo profile** — a generated sample resume loads immediately so you can try designs without an import

A network connection is required only for GitHub import (GitHub REST API). Everything else runs in the browser.

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

Node.js 20+ is recommended.

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
| `npm run typecheck` / `npm run lint` | `tsc --noEmit` |
| `npm test` | Run Vitest once |
| `npm run coverage` | Tests with V8 coverage |

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
index.html                 # App shell and print styles
src/
  main.ts                  # UI wiring: import, design, ATS, export, i18n
  resume-builder.ts        # Renders resume HTML from data
  github-provider.ts       # GitHub API + username parsing
  demo-profile.ts          # Faker-based sample resume
  translations.ts          # EN / RU / KO chrome strings
  styles.css               # UI chrome + 30 design themes
  designs/design-templates.ts
  services/ATSService.ts   # ATS scoring
  services/ExportService.ts
  config/ats-keywords.ts
  i18n/                    # Section labels and ATS message maps
  types.ts / types/ats.ts
__tests__/                 # Vitest unit tests
.github/workflows/ci.yml   # Typecheck, tests, production build
```

## Continuous integration

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs on pushes and pull requests to `main`. It installs dependencies, type-checks the project, runs Vitest, and produces a production build.

There is no CodeQL workflow in this repository. GitHub’s default CodeQL setup is not useful here: the app has no server, no database, and no authentication surface. Security-sensitive rendering uses `textContent` rather than `innerHTML` for user-derived resume fields.

## License

MIT. See [LICENSE](LICENSE).

Copyright © 2026 Khudayberdiev Almaz
