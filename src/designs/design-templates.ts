/**
 * Resume Design Templates System
 * Contains 30+ professional resume design configurations
 * 
 * Architecture:
 * - Each design is defined by a set of CSS custom properties (variables)
 * - Designs are organized by category: Professional, Creative, Minimal, Tech, Business
 * - Easy to extend: add new design to DESIGNS array and corresponding CSS
 */

export interface DesignTemplate {
  id: string;
  name: string;
  category: 'professional' | 'creative' | 'minimal' | 'tech' | 'business' | 'elegant' | 'modern' | 'bold';
  description: string;
  cssClass: string;
}

export const DESIGNS: DesignTemplate[] = [
  // ==================== PROFESSIONAL (5 designs) ====================
  {
    id: 'classic',
    name: 'Classic',
    category: 'professional',
    description: 'Traditional business style with serif headings',
    cssClass: 'theme-classic'
  },
  {
    id: 'executive',
    name: 'Executive',
    category: 'professional',
    description: 'Authoritative design for senior positions',
    cssClass: 'theme-executive'
  },
  {
    id: 'corporate',
    name: 'Corporate',
    category: 'professional',
    description: 'Clean corporate identity style',
    cssClass: 'theme-corporate'
  },
  {
    id: 'formal',
    name: 'Formal',
    category: 'professional',
    description: 'Strict formal layout for conservative fields',
    cssClass: 'theme-formal'
  },
  {
    id: 'diplomatic',
    name: 'Diplomatic',
    category: 'professional',
    description: 'Balanced and neutral professional style',
    cssClass: 'theme-diplomatic'
  },

  // ==================== CREATIVE (5 designs) ====================
  {
    id: 'creative',
    name: 'Creative',
    category: 'creative',
    description: 'Vibrant design for creative professionals',
    cssClass: 'theme-creative'
  },
  {
    id: 'artistic',
    name: 'Artistic',
    category: 'creative',
    description: 'Bold artistic expression',
    cssClass: 'theme-artistic'
  },
  {
    id: 'designer',
    name: 'Designer',
    category: 'creative',
    description: 'Modern designer portfolio style',
    cssClass: 'theme-designer'
  },
  {
    id: 'vibrant',
    name: 'Vibrant',
    category: 'creative',
    description: 'Colorful and energetic layout',
    cssClass: 'theme-vibrant'
  },
  {
    id: 'playful',
    name: 'Playful',
    category: 'creative',
    description: 'Friendly and approachable design',
    cssClass: 'theme-playful'
  },

  // ==================== MINIMAL (5 designs) ====================
  {
    id: 'minimal',
    name: 'Minimal',
    category: 'minimal',
    description: 'Clean brutalist-inspired design',
    cssClass: 'theme-minimal'
  },
  {
    id: 'pure',
    name: 'Pure',
    category: 'minimal',
    description: 'Ultra-clean minimalist aesthetic',
    cssClass: 'theme-pure'
  },
  {
    id: 'zen',
    name: 'Zen',
    category: 'minimal',
    description: 'Calm and balanced whitespace-focused',
    cssClass: 'theme-zen'
  },
  {
    id: 'mono',
    name: 'Monospace',
    category: 'minimal',
    description: 'Developer-friendly monospace typography',
    cssClass: 'theme-mono'
  },
  {
    id: 'swiss',
    name: 'Swiss',
    category: 'minimal',
    description: 'Swiss design grid-based layout',
    cssClass: 'theme-swiss'
  },

  // ==================== TECH (5 designs) ====================
  {
    id: 'modern',
    name: 'Modern',
    category: 'tech',
    description: 'Contemporary tech industry standard',
    cssClass: 'theme-modern'
  },
  {
    id: 'developer',
    name: 'Developer',
    category: 'tech',
    description: 'IDE-inspired dark accents for devs',
    cssClass: 'theme-developer'
  },
  {
    id: 'startup',
    name: 'Startup',
    category: 'tech',
    description: 'Fresh startup culture vibe',
    cssClass: 'theme-startup'
  },
  {
    id: 'cyber',
    name: 'Cyber',
    category: 'tech',
    description: 'Futuristic cyber aesthetics',
    cssClass: 'theme-cyber'
  },
  {
    id: 'terminal',
    name: 'Terminal',
    category: 'tech',
    description: 'Command-line inspired design',
    cssClass: 'theme-terminal'
  },

  // ==================== BUSINESS (5 designs) ====================
  {
    id: 'business',
    name: 'Business',
    category: 'business',
    description: 'Professional business card style',
    cssClass: 'theme-business'
  },
  {
    id: 'finance',
    name: 'Finance',
    category: 'business',
    description: 'Conservative financial sector design',
    cssClass: 'theme-finance'
  },
  {
    id: 'consulting',
    name: 'Consulting',
    category: 'business',
    description: 'McKinsey-style consulting format',
    cssClass: 'theme-consulting'
  },
  {
    id: 'legal',
    name: 'Legal',
    category: 'business',
    description: 'Law firm traditional style',
    cssClass: 'theme-legal'
  },
  {
    id: 'academic',
    name: 'Academic',
    category: 'business',
    description: 'Research and academia focused',
    cssClass: 'theme-academic'
  },

  // ==================== ELEGANT (3 designs) ====================
  {
    id: 'elegant',
    name: 'Elegant',
    category: 'elegant',
    description: 'Sophisticated luxury design',
    cssClass: 'theme-elegant'
  },
  {
    id: 'luxury',
    name: 'Luxury',
    category: 'elegant',
    description: 'Premium high-end aesthetic',
    cssClass: 'theme-luxury'
  },
  {
    id: 'refined',
    name: 'Refined',
    category: 'elegant',
    description: 'Subtle refined elegance',
    cssClass: 'theme-refined'
  },

  // ==================== BOLD (2 designs) ====================
  {
    id: 'bold',
    name: 'Bold',
    category: 'bold',
    description: 'Strong impactful presence',
    cssClass: 'theme-bold'
  },
  {
    id: 'impact',
    name: 'Impact',
    category: 'bold',
    description: 'Maximum visual impact',
    cssClass: 'theme-impact'
  }
];

export const DESIGN_CATEGORIES = [
  'all',
  'professional',
  'creative',
  'minimal',
  'tech',
  'business',
  'elegant',
  'bold'
] as const;

/**
 * Get design by ID
 */
export function getDesignById(id: string): DesignTemplate | undefined {
  return DESIGNS.find(d => d.id === id);
}

/**
 * Get random design
 */
export function getRandomDesign(): DesignTemplate {
  const randomIndex = Math.floor(Math.random() * DESIGNS.length);
  return DESIGNS[randomIndex];
}

/**
 * Get designs by category
 */
export function getDesignsByCategory(category: string): DesignTemplate[] {
  if (category === 'all') return DESIGNS;
  return DESIGNS.filter(d => d.category === category);
}

/**
 * Get all design IDs for quick lookup
 */
export function getAllDesignIds(): string[] {
  return DESIGNS.map(d => d.id);
}
