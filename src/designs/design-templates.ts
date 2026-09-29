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
 * - The on-screen theme is applied through the `theme-*` body class, which the
 *   browser turns into CSS. The PDF, however, is laid out directly with jsPDF
 *   and cannot read CSS — so each design also declares a small set of PDF
 *   colour tokens mirroring its CSS variables. `getDesignPdfTokens` resolves
 *   them for a given design id (darkening any colour that would be
 *   unreadable on white paper). Keep these tokens in sync with the CSS in
 *   `src/styles.css` when you change a theme.
 */

/** An RGB triple in 0-255, as consumed by jsPDF's setTextColor/setDrawColor. */
export type Rgb = [number, number, number];

/** The four accents the PDF renderer can apply to a themed resume. */
export interface PdfDesignTokens {
  /** Candidate name in the header. */
  name: Rgb;
  /** Section headings (EXPERIENCE, PROJECTS, ...). */
  section: Rgb;
  /** Underline rule drawn beneath section headings. */
  rule: Rgb;
  /** Job title, contact line and date ranges. */
  muted: Rgb;
}

interface DesignTemplate {
  id: string;
  name: string;
  category: 'professional' | 'creative' | 'minimal' | 'tech' | 'business' | 'elegant' | 'modern' | 'bold';
  description: string;
  cssClass: string;
  /**
   * Raw PDF colour tokens (hex), mirroring the design's CSS variables.
   * `name`/`section`/`muted` feed jsPDF's text colour, `rule` its draw colour.
   */
  pdf: {
    name: string;
    section: string;
    rule: string;
    muted: string;
  };
}

export const DESIGNS: DesignTemplate[] = [
  // ==================== PROFESSIONAL (5 designs) ====================
  {
    id: 'classic',
    name: 'Classic',
    category: 'professional',
    description: 'Traditional business style with serif headings',
    cssClass: 'theme-classic',
    pdf: { name: '#1e293b', section: '#1e293b', rule: '#4f46e5', muted: '#64748b' }
  },
  {
    id: 'executive',
    name: 'Executive',
    category: 'professional',
    description: 'Authoritative design for senior positions',
    cssClass: 'theme-executive',
    pdf: { name: '#1a365d', section: '#1a202c', rule: '#2c5282', muted: '#4a5568' }
  },
  {
    id: 'corporate',
    name: 'Corporate',
    category: 'professional',
    description: 'Clean corporate identity style',
    cssClass: 'theme-corporate',
    pdf: { name: '#2d3748', section: '#3182ce', rule: '#3182ce', muted: '#718096' }
  },
  {
    id: 'formal',
    name: 'Formal',
    category: 'professional',
    description: 'Strict formal layout for conservative fields',
    cssClass: 'theme-formal',
    pdf: { name: '#000000', section: '#000000', rule: '#cccccc', muted: '#333333' }
  },
  {
    id: 'diplomatic',
    name: 'Diplomatic',
    category: 'professional',
    description: 'Balanced and neutral professional style',
    cssClass: 'theme-diplomatic',
    pdf: { name: '#2d3748', section: '#4a5568', rule: '#718096', muted: '#a0aec0' }
  },

  // ==================== CREATIVE (5 designs) ====================
  {
    id: 'creative',
    name: 'Creative',
    category: 'creative',
    description: 'Vibrant design for creative professionals',
    cssClass: 'theme-creative',
    pdf: { name: '#9a3412', section: '#9a3412', rule: '#ed8936', muted: '#a0aec0' }
  },
  {
    id: 'artistic',
    name: 'Artistic',
    category: 'creative',
    description: 'Bold artistic expression',
    cssClass: 'theme-artistic',
    pdf: { name: '#805ad5', section: '#805ad5', rule: '#d69e2e', muted: '#718096' }
  },
  {
    id: 'designer',
    name: 'Designer',
    category: 'creative',
    description: 'Modern designer portfolio style',
    cssClass: 'theme-designer',
    pdf: { name: '#ec4899', section: '#1f2937', rule: '#8b5cf6', muted: '#9ca3af' }
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    category: 'creative',
    description: 'Colorful and energetic layout',
    cssClass: 'theme-vibrant',
    pdf: { name: '#059669', section: '#059669', rule: '#10b981', muted: '#6ee7b7' }
  },
  {
    id: 'playful',
    name: 'Playful',
    category: 'creative',
    description: 'Friendly and approachable design',
    cssClass: 'theme-playful',
    pdf: { name: '#f59e0b', section: '#f59e0b', rule: '#fbbf24', muted: '#d97706' }
  },

  // ==================== MINIMAL (5 designs) ====================
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'minimal',
    description: 'Clean brutalist-inspired design',
    cssClass: 'theme-minimal',
    pdf: { name: '#0f172a', section: '#0f172a', rule: '#0f172a', muted: '#94a3b8' }
  },
  {
    id: 'pure',
    name: 'Pure',
    category: 'minimal',
    description: 'Ultra-clean minimalist aesthetic',
    cssClass: 'theme-pure',
    pdf: { name: '#111827', section: '#6b7280', rule: '#f3f4f6', muted: '#9ca3af' }
  },
  {
    id: 'zen',
    name: 'Zen',
    category: 'minimal',
    description: 'Calm and balanced whitespace-focused',
    cssClass: 'theme-zen',
    pdf: { name: '#44403c', section: '#78716c', rule: '#78716c', muted: '#a8a29e' }
  },
  {
    id: 'mono',
    name: 'Monospace',
    category: 'minimal',
    description: 'Developer-friendly monospace typography',
    cssClass: 'theme-mono',
    pdf: { name: '#1f2937', section: '#111827', rule: '#10b981', muted: '#6b7280' }
  },
  {
    id: 'swiss',
    name: 'Swiss',
    category: 'minimal',
    description: 'Swiss design grid-based layout',
    cssClass: 'theme-swiss',
    pdf: { name: '#000000', section: '#000000', rule: '#ff0000', muted: '#666666' }
  },

  // ==================== TECH (5 designs) ====================
  {
    id: 'modern',
    name: 'Modern',
    category: 'tech',
    description: 'Contemporary tech industry standard',
    cssClass: 'theme-modern',
    pdf: { name: '#4f46e5', section: '#1e1e2e', rule: '#4f46e5', muted: '#64748b' }
  },
  {
    id: 'developer',
    name: 'Developer',
    category: 'tech',
    description: 'IDE-inspired dark accents for devs',
    cssClass: 'theme-developer',
    pdf: { name: '#282c34', section: '#e5c07b', rule: '#00d8ff', muted: '#abb2bf' }
  },
  {
    id: 'startup',
    name: 'Startup',
    category: 'tech',
    description: 'Fresh startup culture vibe',
    cssClass: 'theme-startup',
    pdf: { name: '#3b82f6', section: '#1e3a8a', rule: '#60a5fa', muted: '#93c5fd' }
  },
  {
    id: 'cyber',
    name: 'Cyber',
    category: 'tech',
    description: 'Futuristic cyber aesthetics',
    cssClass: 'theme-cyber',
    pdf: { name: '#00ffff', section: '#ff00ff', rule: '#ff00ff', muted: '#666666' }
  },
  {
    id: 'terminal',
    name: 'Terminal',
    category: 'tech',
    description: 'Command-line inspired design',
    cssClass: 'theme-terminal',
    pdf: { name: '#22c55e', section: '#22c55e', rule: '#16a34a', muted: '#86efac' }
  },

  // ==================== BUSINESS (5 designs) ====================
  {
    id: 'business',
    name: 'Business',
    category: 'business',
    description: 'Professional business card style',
    cssClass: 'theme-business',
    pdf: { name: '#1e40af', section: '#1e40af', rule: '#3b82f6', muted: '#60a5fa' }
  },
  {
    id: 'finance',
    name: 'Finance',
    category: 'business',
    description: 'Conservative financial sector design',
    cssClass: 'theme-finance',
    pdf: { name: '#064e3b', section: '#064e3b', rule: '#059669', muted: '#6ee7b7' }
  },
  {
    id: 'consulting',
    name: 'Consulting',
    category: 'business',
    description: 'McKinsey-style consulting format',
    cssClass: 'theme-consulting',
    pdf: { name: '#1e3a5f', section: '#3b5998', rule: '#3b5998', muted: '#6b7280' }
  },
  {
    id: 'legal',
    name: 'Legal',
    category: 'business',
    description: 'Law firm traditional style',
    cssClass: 'theme-legal',
    pdf: { name: '#374151', section: '#374151', rule: '#d1d5db', muted: '#9ca3af' }
  },
  {
    id: 'academic',
    name: 'Academic',
    category: 'business',
    description: 'Research and academia focused',
    cssClass: 'theme-academic',
    pdf: { name: '#7c2d12', section: '#7c2d12', rule: '#ea580c', muted: '#9a3412' }
  },

  // ==================== ELEGANT (3 designs) ====================
  {
    id: 'elegant',
    name: 'Elegant',
    category: 'elegant',
    description: 'Sophisticated luxury design',
    cssClass: 'theme-elegant',
    pdf: { name: '#7c3aed', section: '#7c3aed', rule: '#a78bfa', muted: '#c4b5fd' }
  },
  {
    id: 'luxury',
    name: 'Luxury',
    category: 'elegant',
    description: 'Premium high-end aesthetic',
    cssClass: 'theme-luxury',
    pdf: { name: '#b45309', section: '#b45309', rule: '#d97706', muted: '#fcd34d' }
  },
  {
    id: 'refined',
    name: 'Refined',
    category: 'elegant',
    description: 'Subtle refined elegance',
    cssClass: 'theme-refined',
    pdf: { name: '#be185d', section: '#be185d', rule: '#ec4899', muted: '#f9a8d4' }
  },

  // ==================== BOLD (2 designs) ====================
  {
    id: 'bold',
    name: 'Bold',
    category: 'bold',
    description: 'Strong impactful presence',
    cssClass: 'theme-bold',
    pdf: { name: '#dc2626', section: '#b91c1c', rule: '#b91c1c', muted: '#f87171' }
  },
  {
    id: 'impact',
    name: 'Impact',
    category: 'bold',
    description: 'Maximum visual impact',
    cssClass: 'theme-impact',
    // The on-screen accent is white-on-black; on white paper the same
    // "block" identity becomes solid black rules and headings.
    pdf: { name: '#000000', section: '#000000', rule: '#000000', muted: '#666666' }
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

/**
 * Fallback tokens: the historical unthemed output — black text, grey rule.
 * Used only when a design id is missing or unknown.
 */
export const DEFAULT_PDF_DESIGN: PdfDesignTokens = {
  name: [0, 0, 0],
  section: [0, 0, 0],
  rule: [140, 140, 140],
  muted: [0, 0, 0]
};

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

/** WCAG contrast of the colour against a white page. */
export function contrastAgainstWhite(color: Rgb): number {
  return 1.05 / (relativeLuminance(color) + 0.05);
}

/**
 * Darken a colour (towards black, hue preserved) until it is legible on
 * white paper.
 *
 * Several themes use neon accents (cyber cyan, terminal green, luxury gold)
 * that are meant for dark backgrounds. They would be almost invisible as PDF
 * text on a white page, so we keep the hue but pull the lightness down until
 * the WCAG AA 4.5:1 threshold is met.
 */
export function ensureReadable(color: Rgb, minContrast = 4.5): Rgb {
  if (contrastAgainstWhite(color) >= minContrast) return color;

  let [r, g, b] = color;
  let guard = 0;
  while (contrastAgainstWhite([r, g, b]) < minContrast && r + g + b > 0 && guard < 64) {
    r = Math.round(r * 0.88);
    g = Math.round(g * 0.88);
    b = Math.round(b * 0.88);
    guard += 1;
  }
  return [r, g, b];
}

/**
 * Resolve the PDF colour tokens for a design id.
 *
 * Body copy is always left black by the renderer — the tokens only style the
 * accents (name, section headings, the rule under them, dates and contacts).
 */
export function getDesignPdfTokens(designId?: string | null): PdfDesignTokens {
  const design = getDesign(designId);
  if (!design) return { ...DEFAULT_PDF_DESIGN };

  return {
    name: ensureReadable(hexToRgb(design.pdf.name)),
    section: ensureReadable(hexToRgb(design.pdf.section)),
    rule: ensureReadable(hexToRgb(design.pdf.rule)),
    muted: ensureReadable(hexToRgb(design.pdf.muted))
  };
}
