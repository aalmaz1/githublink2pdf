# 📐 Typography Guide — Resume Builder

## Three Professional Typography Systems

Your resume builder now supports **3 distinct typography systems**. Switch between them by editing `src/styles.css`.

---

## System A: PROFESSIONAL (Default) ✅

**Fonts:** Merriweather (headings) + Inter (body)

### Best For:
- 💼 Finance & Banking
- ⚖️ Legal & Consulting
- 🎓 Academia & Research
- 🏢 Corporate positions

### Why It Works:
- **Merriweather**: Serif font with strong vertical stress, conveys trust and authority. Optimized for screens with generous x-height.
- **Inter**: Neo-grotesque sans-serif designed for computer interfaces. Excellent readability at small sizes.
- **Contrast**: Classic serif/sans-serif pairing creates clear hierarchy without clashing.

### Weights:
| Element | Font | Weight | Size | Line Height |
|---------|------|--------|------|-------------|
| H1 (Name) | Merriweather | 900 (Black) | 2.25rem (36px) | 1.2 |
| H2 (Section) | Merriweather | 700 (Bold) | 1.5rem (24px) | 1.3 |
| H3 (Subsection) | Merriweather | 700 (Bold) | 1.25rem (20px) | 1.3 |
| Body Text | Inter | 400 (Regular) | 1rem (16px) | 1.6 |
| Meta/Dates | Inter | 400 (Regular) | 0.875rem (14px) | 1.5 |
| Buttons | Inter | 600 (SemiBold) | 1rem (16px) | 1.2 |

### Visual Impact:
> "Looks like a premium financial report. Feels established, serious, and trustworthy. Similar to Harvard Business Review or McKinsey presentations."

---

## System B: FRIENDLY & MODERN

**Fonts:** Poppins (headings) + Open Sans (body)

### How to Activate:
In `src/styles.css`, comment out System A and uncomment System B:
```css
/* System A */
/* --font-heading: 'Merriweather', ...; */
/* --font-body: 'Inter', ...; */

/* System B - UNCOMMENT THESE */
--font-heading: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-body: 'Open Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Best For:
- 💻 Tech Startups
- 🎨 Creative Industries (Design, Marketing)
- 📱 Product Management
- 🌐 Digital Agencies

### Why It Works:
- **Poppins**: Geometric sans-serif with friendly rounded terminals. Modern but not cold.
- **Open Sans**: Humanist sans-serif optimized for legibility across devices. Neutral and approachable.
- **Harmony**: Both are humanist/geometric, creating cohesive modern aesthetic.

### Weights:
| Element | Font | Weight | Size | Line Height |
|---------|------|--------|------|-------------|
| H1 (Name) | Poppins | 700 (Bold) | 2.25rem (36px) | 1.1 |
| H2 (Section) | Poppins | 600 (SemiBold) | 1.5rem (24px) | 1.25 |
| H3 (Subsection) | Poppins | 600 (SemiBold) | 1.25rem (20px) | 1.25 |
| Body Text | Open Sans | 400 (Regular) | 1rem (16px) | 1.6 |
| Meta/Dates | Open Sans | 400 (Regular) | 0.875rem (14px) | 1.5 |
| Buttons | Open Sans | 600 (SemiBold) | 1rem (16px) | 1.2 |

### Visual Impact:
> "Feels like a Silicon Valley startup website. Approachable, energetic, contemporary. Similar to Stripe, Notion, or Figma branding."

---

## System C: NEUTRAL & UNIVERSAL

**Fonts:** System Fonts Only (San Francisco, Segoe UI, Roboto)

### How to Activate:
In `src/styles.css`, comment out System A and uncomment System C:
```css
/* System A */
/* --font-heading: 'Merriweather', ...; */
/* --font-body: 'Inter', ...; */

/* System C - UNCOMMENT THESE */
--font-heading: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
--font-body: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
```

### Best For:
- 🌍 Any industry (truly universal)
- ⚡ Maximum performance (0ms font load time)
- 📱 Mobile-first applications
- 🔒 Enterprise/Government (no external dependencies)

### Why It Works:
- **Native Feel**: Uses platform-native fonts (SF on Mac/iOS, Segoe UI on Windows, Roboto on Android).
- **Zero Load Time**: No network requests = instant rendering.
- **Accessibility**: System fonts are optimized for each OS's accessibility settings.

### Weights:
| Element | Weight | Size | Line Height |
|---------|--------|------|-------------|
| H1 (Name) | 700 (Bold) | 2.25rem (36px) | 1.1 |
| H2 (Section) | 600 (SemiBold) | 1.5rem (24px) | 1.25 |
| H3 (Subsection) | 600 (SemiBold) | 1.25rem (20px) | 1.25 |
| Body Text | 400 (Regular) | 1rem (16px) | 1.6 |
| Meta/Dates | 400 (Regular) | 0.875rem (14px) | 1.5 |
| Buttons | 600 (SemiBold) | 1rem (16px) | 1.2 |

### Visual Impact:
> "Feels native to your device. Clean, invisible, professional without trying too hard. Similar to GitHub, Apple.com, or Microsoft products."

---

## Quick Comparison

| Feature | System A (Professional) | System B (Friendly) | System C (Neutral) |
|---------|------------------------|---------------------|--------------------|
| **Personality** | Authoritative, Classic | Energetic, Modern | Invisible, Native |
| **Load Time** | ~150ms | ~150ms | **0ms** ✅ |
| **Best Industry** | Finance, Law, Academia | Tech, Creative | Universal |
| **Print Quality** | Excellent ★★★★★ | Very Good ★★★★☆ | Excellent ★★★★★ |
| **Mobile Readability** | Excellent | Excellent | Best |
| **Similar To** | NYT, Economist | Stripe, Airbnb | GitHub, Apple |

---

## Type Scale (All Systems)

Based on **Major Third (1.25)** ratio for harmonious proportions:

```
36px (2.25rem) — H1, Name
24px (1.5rem)  — H2, Section Titles
20px (1.25rem) — H3, Subsections
16px (1rem)    — Body Text (Base)
14px (0.875rem)— Secondary Text, Dates
12px (0.75rem) — Captions, Metadata
```

### Line Heights:
- **Headings**: 1.1–1.3 (tight for impact)
- **Body**: 1.6 (optimal for reading)
- **Secondary**: 1.5 (balanced)

---

## Color & Contrast

For accessibility (WCAG AA compliance):

| Use Case | Color | Contrast Ratio |
|----------|-------|----------------|
| Primary Text | `#0f172a` (slate-900) | 16:1 ✅ |
| Secondary Text | `#64748b` (slate-500) | 5.5:1 ✅ |
| Links/Buttons | `#4f46e5` (indigo-600) | 4.7:1 ✅ |
| Disabled | `#cbd5e1` (slate-300) | 2.5:1 |

---

## Performance Tips

1. **Preload Critical Fonts**: Already configured in `index.html`
2. **Use `font-display: swap`**: Prevents FOIT (Flash of Invisible Text)
3. **Limit Weights**: Only load weights you actually use (currently 3 per family)
4. **Consider System Fonts**: For maximum performance, use System C

---

## How to Test

1. Open `src/styles.css`
2. Comment/uncomment the desired system
3. Save and refresh browser
4. Compare visual impact on:
   - Desktop (Chrome, Safari, Firefox)
   - Mobile (iOS Safari, Chrome Android)
   - Print preview (Ctrl+P / Cmd+P)

---

## Recommendation

**Start with System A (Professional)** as default—it's the safest choice for most job seekers. 

Then offer users a **toggle in the UI** to switch between systems based on their target industry:
- Finance/Law → System A
- Tech/Creative → System B  
- General/Unknown → System C

This gives your app a competitive edge over single-font generators!
