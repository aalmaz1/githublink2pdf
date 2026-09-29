/**
 * Resume Design Templates System
 * Contains 30+ professional resume design configurations
 *
 * Architecture:
 * - Each design is defined by a set of CSS custom properties (variables)
 * - Designs are organized by category: Professional, Creative, Minimal, Tech, Business
 * - Easy to extend: add new design to DESIGNS array and corresponding CSS
 *
 * PDF export:
 * - The on-screen theme is applied through the `theme-*` body class, which
 *   the browser turns into CSS. The PDF is laid out directly with jsPDF and
 *   cannot read CSS, so each design also declares a PDF "visual recipe"
 *   (`pdf` below) mirroring what the CSS draws: page background, header and
 *   section background boxes, accent bars, rules, frames and text colours.
 * - `getDesignPdfTheme()` resolves a recipe for a design id and makes every
 *   text colour legible on the background it is drawn on (dark themes keep
 *   their neon accents; neon accents on white paper are darkened, hue kept).
 * - Keep these recipes in sync with the CSS in `src/styles.css` when you
 *   change a theme.
 */

/** An RGB triple in 0-255, as consumed by jsPDF's setTextColor/setDrawColor. */
export type Rgb = [number, number, number];

/** Font family, mapped to jsPDF core fonts (helvetica / times / courier). */
export type PdfFont = 'sans' | 'serif' | 'mono';

/** A background or outline box drawn behind the name or a section title. */
export interface PdfBoxSpec {
  /** Background fill (hex). Omit for a transparent, outlined box. */
  fill?: string;
  /** Outline colour (hex), e.g. Cyber's bordered section titles. */
  outline?: string;
  /** Corner radius in mm (0 = square). Clamped to half the box height. */
  rounded?: number;
  /** Full content width; false = shrink-to-fit chip/pill (default true). */
  full?: boolean;
}

/**
 * Raw per-design PDF recipe (hex + flags), mirroring the theme's CSS:
 * everything the browser draws, described for jsPDF instead.
 */
export interface PdfThemeSpec {
  /** Page background (dark themes). Default white. */
  pageBg?: string;
  /** Full-page frame line, e.g. Minimal's border. */
  frame?: string;
  frameDouble?: boolean;
  /** Full-width bar at the top of the page (Corporate). */
  topBar?: string;
  /** Full-height bars on the left/right page edges (Creative). */
  sideBars?: string;
  /** Bullet copy. */
  body?: string;
  /** Role – organisation line. */
  heading?: string;
  /** Date ranges. */
  date?: string;
  /** Candidate name (h1). */
  name: string;
  nameFont?: PdfFont;
  nameUppercase?: boolean;
  nameItalic?: boolean;
  /** Chip drawn behind the name (Bold, Playful). */
  nameBox?: PdfBoxSpec;
  /** Rule under the name (Executive, Modern, Minimal). */
  nameRule?: string;
  /** Job title (h2). Default #475569. */
  title?: string;
  /** Contact line. Defaults to the body colour. */
  contacts?: string;
  /** Full-width block behind the whole header (Business). */
  headerBg?: string;
  /** Rule under the header block (base CSS: 2px accent). */
  headerRule?: string;
  headerRuleDouble?: boolean;
  /** Section heading (h3). */
  section: string;
  sectionFont?: PdfFont;
  sectionUppercase?: boolean;
  sectionItalic?: boolean;
  sectionAlign?: 'left' | 'center';
  /** Background bar/pill behind the section title (Swiss, Vibrant, ...). */
  sectionBox?: PdfBoxSpec;
  /** Vertical accent bar to the left of the section title (Modern, ...). */
  sectionBar?: string;
  /** Underline rule below the section title. */
  sectionRule?: string;
  /** Extra rule above a boxed section title (Academic). */
  sectionRuleTop?: boolean;
  /** Rule width in mm; 0 = full content width (Zen's short centred rule). */
  sectionRuleWidth?: number;
  /** Vertical bar to the left of each entity item (Swiss, Impact). */
  entityBar?: string;
  /** Body copy font family (Mono, Terminal). */
  bodyFont?: PdfFont;
}

/** Resolved, print-safe recipe (RGB values, readability adjusted). */
export interface PdfTheme {
  pageBg: Rgb;
  frame: Rgb | null;
  frameDouble: boolean;
  topBar: Rgb | null;
  sideBars: Rgb | null;
  body: Rgb;
  heading: Rgb;
  date: Rgb;
  name: Rgb;
  nameFont: PdfFont;
  nameUppercase: boolean;
  nameItalic: boolean;
  nameBox: { fill: Rgb; rounded: number } | null;
  nameRule: Rgb | null;
  title: Rgb;
  titleFont: PdfFont;
  contacts: Rgb;
  headerBg: Rgb | null;
  headerRule: Rgb | null;
  headerRuleDouble: boolean;
  section: Rgb;
  sectionFont: PdfFont;
  sectionUppercase: boolean;
  sectionItalic: boolean;
  sectionAlign: 'left' | 'center';
  sectionBox: {
    fill: Rgb | null;
    outline: Rgb | null;
    rounded: number;
    full: boolean;
  } | null;
  sectionBar: Rgb | null;
  sectionRule: Rgb | null;
  sectionRuleTop: boolean;
  sectionRuleWidth: number;
  entityBar: Rgb | null;
  bodyFont: PdfFont;
}

interface DesignTemplate {
  id: string;
  name: string;
  category: 'professional' | 'creative' | 'minimal' | 'tech' | 'business' | 'elegant' | 'modern' | 'bold';
  description: string;
  cssClass: string;
  /** PDF visual recipe; see `getDesignPdfTheme`. */
  pdf: PdfThemeSpec;
}

export const DESIGNS: DesignTemplate[] = [
  // ==================== PROFESSIONAL (5 designs) ====================
  {
    id: 'classic',
    name: 'Classic',
    category: 'professional',
    description: 'Traditional business style with serif headings',
    cssClass: 'theme-classic',
    pdf: {
      name: '#0f172a',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#4f46e5',
      section: '#0f172a',
      sectionRule: '#cbd5e1'
    }
  },
  {
    id: 'executive',
    name: 'Executive',
    category: 'professional',
    description: 'Authoritative design for senior positions',
    cssClass: 'theme-executive',
    pdf: {
      name: '#1a365d',
      nameRule: '#2c5282',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#2c5282',
      section: '#1a202c',
      sectionBox: { fill: '#f7fafc' },
      sectionBar: '#2c5282',
      sectionRule: '#cbd5e0'
    }
  },
  {
    id: 'corporate',
    name: 'Corporate',
    category: 'professional',
    description: 'Clean corporate identity style',
    cssClass: 'theme-corporate',
    pdf: {
      topBar: '#3182ce',
      name: '#2d3748',
      nameUppercase: true,
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#3182ce',
      section: '#3182ce',
      sectionRule: '#3182ce'
    }
  },
  {
    id: 'formal',
    name: 'Formal',
    category: 'professional',
    description: 'Strict formal layout for conservative fields',
    cssClass: 'theme-formal',
    pdf: {
      name: '#000000',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#cccccc',
      headerRuleDouble: true,
      section: '#000000',
      sectionAlign: 'center',
      sectionRule: '#cccccc'
    }
  },
  {
    id: 'diplomatic',
    name: 'Diplomatic',
    category: 'professional',
    description: 'Balanced and neutral professional style',
    cssClass: 'theme-diplomatic',
    pdf: {
      name: '#2d3748',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#718096',
      section: '#4a5568',
      sectionBox: { fill: '#f7fafc', rounded: 1 },
      sectionRule: '#e2e8f0'
    }
  },

  // ==================== CREATIVE (5 designs) ====================
  {
    id: 'creative',
    name: 'Creative',
    category: 'creative',
    description: 'Vibrant design for creative professionals',
    cssClass: 'theme-creative',
    pdf: {
      sideBars: '#ed8936',
      name: '#9a3412',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#ed8936',
      section: '#9a3412',
      sectionBar: '#ed8936',
      sectionRule: '#fed7aa'
    }
  },
  {
    id: 'artistic',
    name: 'Artistic',
    category: 'creative',
    description: 'Bold artistic expression',
    cssClass: 'theme-artistic',
    pdf: {
      name: '#805ad5',
      nameItalic: true,
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#d69e2e',
      section: '#2d3748',
      sectionItalic: true,
      sectionBox: { fill: '#f3eef9' },
      sectionBar: '#d69e2e',
      sectionRule: '#e9d8fd'
    }
  },
  {
    id: 'designer',
    name: 'Designer',
    category: 'creative',
    description: 'Modern designer portfolio style',
    cssClass: 'theme-designer',
    pdf: {
      name: '#ec4899',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#8b5cf6',
      section: '#1f2937',
      sectionBox: { fill: '#f5e4f4', rounded: 5.5, full: false }
    }
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    category: 'creative',
    description: 'Colorful and energetic layout',
    cssClass: 'theme-vibrant',
    pdf: {
      name: '#059669',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#10b981',
      section: '#ffffff',
      sectionBox: { fill: '#10b981', rounded: 2 }
    }
  },
  {
    id: 'playful',
    name: 'Playful',
    category: 'creative',
    description: 'Friendly and approachable design',
    cssClass: 'theme-playful',
    pdf: {
      name: '#f59e0b',
      nameBox: { fill: '#fdf2e0', rounded: 3 },
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#fbbf24',
      section: '#f59e0b',
      sectionRule: '#fbbf24'
    }
  },

  // ==================== MINIMAL (5 designs) ====================
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'minimal',
    description: 'Clean brutalist-inspired design',
    cssClass: 'theme-minimal',
    pdf: {
      frame: '#0f172a',
      name: '#0f172a',
      nameUppercase: true,
      nameRule: '#0f172a',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#0f172a',
      section: '#0f172a',
      sectionRule: '#e2e8f0'
    }
  },
  {
    id: 'pure',
    name: 'Pure',
    category: 'minimal',
    description: 'Ultra-clean minimalist aesthetic',
    cssClass: 'theme-pure',
    pdf: {
      name: '#111827',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#6b7280',
      section: '#9ca3af',
      sectionUppercase: false
    }
  },
  {
    id: 'zen',
    name: 'Zen',
    category: 'minimal',
    description: 'Calm and balanced whitespace-focused',
    cssClass: 'theme-zen',
    pdf: {
      name: '#44403c',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#78716c',
      section: '#78716c',
      sectionAlign: 'center',
      sectionRule: '#78716c',
      sectionRuleWidth: 11
    }
  },
  {
    id: 'mono',
    name: 'Monospace',
    category: 'minimal',
    description: 'Developer-friendly monospace typography',
    cssClass: 'theme-mono',
    pdf: {
      name: '#111827',
      nameFont: 'mono',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      bodyFont: 'mono',
      headerRule: '#10b981',
      section: '#111827',
      sectionFont: 'mono',
      sectionBox: { fill: '#f9fafb', rounded: 1 }
    }
  },
  {
    id: 'swiss',
    name: 'Swiss',
    category: 'minimal',
    description: 'Swiss design grid-based layout',
    cssClass: 'theme-swiss',
    pdf: {
      name: '#000000',
      nameUppercase: true,
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#ff0000',
      section: '#ffffff',
      sectionBox: { fill: '#000000' },
      entityBar: '#000000'
    }
  },

  // ==================== TECH (5 designs) ====================
  {
    id: 'modern',
    name: 'Modern',
    category: 'tech',
    description: 'Contemporary tech industry standard',
    cssClass: 'theme-modern',
    pdf: {
      name: '#4f46e5',
      nameRule: '#4f46e5',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#4f46e5',
      section: '#4f46e5',
      sectionBox: { fill: '#f0f3ff' },
      sectionBar: '#4f46e5'
    }
  },
  {
    id: 'developer',
    name: 'Developer',
    category: 'tech',
    description: 'IDE-inspired dark accents for devs',
    cssClass: 'theme-developer',
    pdf: {
      name: '#282c34',
      nameFont: 'mono',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#00d8ff',
      section: '#e5c07b',
      sectionFont: 'mono',
      sectionBox: { fill: '#282c34', rounded: 1 }
    }
  },
  {
    id: 'startup',
    name: 'Startup',
    category: 'tech',
    description: 'Fresh startup culture vibe',
    cssClass: 'theme-startup',
    pdf: {
      name: '#3b82f6',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#60a5fa',
      section: '#1e3a8a',
      sectionRule: '#60a5fa'
    }
  },
  {
    id: 'cyber',
    name: 'Cyber',
    category: 'tech',
    description: 'Futuristic cyber aesthetics',
    cssClass: 'theme-cyber',
    pdf: {
      pageBg: '#0a0a0a',
      name: '#00ffff',
      nameFont: 'mono',
      title: '#475569',
      contacts: '#00ffff',
      heading: '#00ffff',
      body: '#00ffff',
      date: '#00ffff',
      headerRule: '#ff00ff',
      section: '#ff00ff',
      sectionFont: 'mono',
      sectionBox: { outline: '#ff00ff' }
    }
  },
  {
    id: 'terminal',
    name: 'Terminal',
    category: 'tech',
    description: 'Command-line inspired design',
    cssClass: 'theme-terminal',
    pdf: {
      pageBg: '#0c0a09',
      name: '#22c55e',
      nameFont: 'mono',
      title: '#475569',
      contacts: '#22c55e',
      heading: '#22c55e',
      body: '#22c55e',
      date: '#22c55e',
      bodyFont: 'mono',
      headerRule: '#16a34a',
      section: '#22c55e',
      sectionFont: 'mono'
    }
  },

  // ==================== BUSINESS (5 designs) ====================
  {
    id: 'business',
    name: 'Business',
    category: 'business',
    description: 'Professional business card style',
    cssClass: 'theme-business',
    pdf: {
      headerBg: '#1e40af',
      name: '#ffffff',
      title: '#ffffff',
      contacts: '#ffffff',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      section: '#1e40af',
      sectionRule: '#3b82f6'
    }
  },
  {
    id: 'finance',
    name: 'Finance',
    category: 'business',
    description: 'Conservative financial sector design',
    cssClass: 'theme-finance',
    pdf: {
      name: '#064e3b',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#059669',
      section: '#064e3b',
      sectionBox: { fill: '#ecfdf5' },
      sectionBar: '#059669',
      sectionRule: '#a7f3d0'
    }
  },
  {
    id: 'consulting',
    name: 'Consulting',
    category: 'business',
    description: 'McKinsey-style consulting format',
    cssClass: 'theme-consulting',
    pdf: {
      name: '#1e3a5f',
      nameUppercase: true,
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#3b5998',
      section: '#3b5998',
      sectionRule: '#e5e7eb'
    }
  },
  {
    id: 'legal',
    name: 'Legal',
    category: 'business',
    description: 'Law firm traditional style',
    cssClass: 'theme-legal',
    pdf: {
      name: '#111827',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#d1d5db',
      headerRuleDouble: true,
      section: '#374151',
      sectionRule: '#d1d5db'
    }
  },
  {
    id: 'academic',
    name: 'Academic',
    category: 'business',
    description: 'Research and academia focused',
    cssClass: 'theme-academic',
    pdf: {
      name: '#7c2d12',
      nameItalic: true,
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#ea580c',
      section: '#7c2d12',
      sectionItalic: true,
      sectionBox: { fill: '#fef3c7' },
      sectionRule: '#ea580c',
      sectionRuleTop: true
    }
  },

  // ==================== ELEGANT (3 designs) ====================
  {
    id: 'elegant',
    name: 'Elegant',
    category: 'elegant',
    description: 'Sophisticated luxury design',
    cssClass: 'theme-elegant',
    pdf: {
      name: '#7c3aed',
      nameItalic: true,
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#a78bfa',
      section: '#7c3aed',
      sectionAlign: 'center'
    }
  },
  {
    id: 'luxury',
    name: 'Luxury',
    category: 'elegant',
    description: 'Premium high-end aesthetic',
    cssClass: 'theme-luxury',
    pdf: {
      frame: '#d97706',
      frameDouble: true,
      name: '#b45309',
      nameUppercase: true,
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#d97706',
      section: '#b45309',
      sectionAlign: 'center',
      sectionBox: { fill: '#fdf3e3' }
    }
  },
  {
    id: 'refined',
    name: 'Refined',
    category: 'elegant',
    description: 'Subtle refined elegance',
    cssClass: 'theme-refined',
    pdf: {
      name: '#be185d',
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#ec4899',
      section: '#be185d',
      sectionItalic: true,
      sectionBar: '#ec4899',
      sectionRule: '#fbcfe8'
    }
  },

  // ==================== BOLD (2 designs) ====================
  {
    id: 'bold',
    name: 'Bold',
    category: 'bold',
    description: 'Strong impactful presence',
    cssClass: 'theme-bold',
    pdf: {
      name: '#ffffff',
      nameUppercase: true,
      nameBox: { fill: '#dc2626', rounded: 3 },
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      headerRule: '#b91c1c',
      section: '#ffffff',
      sectionBox: { fill: '#b91c1c', rounded: 2 }
    }
  },
  {
    id: 'impact',
    name: 'Impact',
    category: 'bold',
    description: 'Maximum visual impact',
    cssClass: 'theme-impact',
    pdf: {
      name: '#000000',
      nameUppercase: true,
      title: '#475569',
      heading: '#0f172a',
      body: '#475569',
      date: '#0f172a',
      section: '#ffffff',
      sectionBox: { fill: '#000000' },
      entityBar: '#000000'
    }
  }
];

/**
 * Get random design
 */
export function getRandomDesign(): DesignTemplate {
  const randomIndex = Math.floor(Math.random() * DESIGNS.length);
  return DESIGNS[randomIndex];
}

/** Find a design by id, or undefined when the id is unknown. */
export function getDesign(designId?: string | null): DesignTemplate | undefined {
  if (!designId) return undefined;
  return DESIGNS.find(design => design.id === designId);
}

export const WHITE: Rgb = [255, 255, 255];

function hexToRgb(hex: string): Rgb {
  const value = hex.replace('#', '');
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16)
  ];
}

function linearChannel(channel: number): number {
  const s = channel / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b);
}

/** WCAG contrast ratio between two colours (1 = identical, 21 = max). */
export function contrast(colorA: Rgb, colorB: Rgb): number {
  const l1 = relativeLuminance(colorA);
  const l2 = relativeLuminance(colorB);
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Move a text colour (towards black or towards white, hue preserved) until
 * it is legible on its background.
 *
 * Neon accents (Cyber cyan, Terminal green, Luxury gold) are only readable
 * on the dark backgrounds their themes provide; on white paper the same hue
 * is pulled down until WCAG AA 4.5:1 is met. Colours that already pass are
 * returned untouched.
 */
export function ensureReadableOn(color: Rgb, bg: Rgb, minContrast = 4.5): Rgb {
  if (contrast(color, bg) >= minContrast) return color;

  const brighten = relativeLuminance(bg) < 0.35;
  let [r, g, b] = color;
  let guard = 0;
  while (contrast([r, g, b], bg) < minContrast && guard < 96) {
    if (brighten) {
      r = Math.round(255 - (255 - r) * 0.88);
      g = Math.round(255 - (255 - g) * 0.88);
      b = Math.round(255 - (255 - b) * 0.88);
    } else {
      r = Math.round(r * 0.88);
      g = Math.round(g * 0.88);
      b = Math.round(b * 0.88);
    }
    guard += 1;
    if ((brighten && r >= 255 && g >= 255 && b >= 255) || (!brighten && r === 0 && g === 0 && b === 0)) {
      break; // fully saturated: nothing further to do
    }
  }
  return [r, g, b];
}

/** Convenience wrapper: readability against a white page. */
export function ensureReadable(color: Rgb, minContrast = 4.5): Rgb {
  return ensureReadableOn(color, WHITE, minContrast);
}

/** True when a colour is indistinguishable from white for fill purposes. */
export function isWhite(color: Rgb): boolean {
  return color[0] > 245 && color[1] > 245 && color[2] > 245;
}

/**
 * Resolve the PDF visual recipe for a design id.
 *
 * Text colours are adjusted against the background they are actually drawn
 * on (page, header block or section box); box fills, rules and bars keep
 * their raw colours. Unknown or missing ids fall back to Classic — the
 * app's default selection.
 */
export function getDesignPdfTheme(designId?: string | null): PdfTheme {
  const spec = getDesign(designId)?.pdf ?? getDesign('classic')!.pdf;

  const pageBg = spec.pageBg ? hexToRgb(spec.pageBg) : WHITE;
  const headerBg = spec.headerBg ? hexToRgb(spec.headerBg) : null;
  const nameBg = spec.nameBox ? hexToRgb(spec.nameBox.fill ?? '#ffffff') : headerBg ?? pageBg;
  const sectionBg = spec.sectionBox?.fill ? hexToRgb(spec.sectionBox.fill) : pageBg;
  const headerTextBg = headerBg ?? pageBg;
  const bodyFont = spec.bodyFont ?? 'sans';

  return {
    pageBg,
    frame: spec.frame ? hexToRgb(spec.frame) : null,
    frameDouble: !!spec.frameDouble,
    topBar: spec.topBar ? hexToRgb(spec.topBar) : null,
    sideBars: spec.sideBars ? hexToRgb(spec.sideBars) : null,
    body: ensureReadableOn(hexToRgb(spec.body ?? '#475569'), pageBg),
    heading: ensureReadableOn(hexToRgb(spec.heading ?? '#0f172a'), pageBg),
    date: ensureReadableOn(hexToRgb(spec.date ?? '#0f172a'), pageBg),
    name: ensureReadableOn(hexToRgb(spec.name), nameBg),
    nameFont: spec.nameFont ?? 'serif',
    nameUppercase: !!spec.nameUppercase,
    nameItalic: !!spec.nameItalic,
    nameBox: spec.nameBox
      ? { fill: hexToRgb(spec.nameBox.fill ?? '#ffffff'), rounded: spec.nameBox.rounded ?? 0 }
      : null,
    nameRule: spec.nameRule ? hexToRgb(spec.nameRule) : null,
    title: ensureReadableOn(hexToRgb(spec.title ?? '#475569'), headerTextBg),
    titleFont: bodyFont === 'mono' ? 'mono' : 'serif',
    contacts: ensureReadableOn(hexToRgb(spec.contacts ?? spec.body ?? '#0f172a'), headerTextBg),
    headerBg,
    headerRule: spec.headerRule ? hexToRgb(spec.headerRule) : null,
    headerRuleDouble: !!spec.headerRuleDouble,
    section: ensureReadableOn(hexToRgb(spec.section), sectionBg),
    sectionFont: spec.sectionFont ?? 'serif',
    sectionUppercase: spec.sectionUppercase ?? true,
    sectionItalic: !!spec.sectionItalic,
    sectionAlign: spec.sectionAlign ?? 'left',
    sectionBox: spec.sectionBox
      ? {
          fill: spec.sectionBox.fill ? hexToRgb(spec.sectionBox.fill) : null,
          outline: spec.sectionBox.outline ? hexToRgb(spec.sectionBox.outline) : null,
          rounded: spec.sectionBox.rounded ?? 0,
          full: spec.sectionBox.full ?? true
        }
      : null,
    sectionBar: spec.sectionBar ? hexToRgb(spec.sectionBar) : null,
    sectionRule: spec.sectionRule ? hexToRgb(spec.sectionRule) : null,
    sectionRuleTop: !!spec.sectionRuleTop,
    sectionRuleWidth: spec.sectionRuleWidth ?? 0,
    entityBar: spec.entityBar ? hexToRgb(spec.entityBar) : null,
    bodyFont
  };
}
