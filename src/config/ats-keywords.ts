/**
 * ATS Keywords Configuration
 * Centralized keyword arrays for ATS analysis
 */

// Extended technical keywords including ML/Data Science terms
export const BASE_TECH_KEYWORDS = [
  'TypeScript', 'JavaScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'Ruby', 'PHP', 'Swift', 'Kotlin', 'Scala',
  'React', 'Vue', 'Angular', 'HTML', 'CSS', 'SASS', 'LESS', 'Webpack', 'Vite', 'Next.js', 'Nuxt',
  'Node', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Laravel', 'Rails',
  'SQL', 'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'SQLite', 'Oracle',
  'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'CI/CD', 'Jenkins', 'GitLab', 'GitHub Actions', 'Terraform',
  'Git', 'API', 'REST', 'GraphQL', 'Microservices', 'Agile', 'Scrum', 'TDD', 'Linux', 'Bash',
  'Jest', 'Mocha', 'pytest', 'JUnit', 'Cypress', 'Playwright',
  // ML/Data Science additions
  'machine learning', 'statistics', 'pandas', 'numpy', 'data analysis', 'data science', 'AI', 'ML',
  'TensorFlow', 'PyTorch', 'scikit-learn', 'deep learning', 'neural networks', 'NLP', 'computer vision'
];

// Action verbs for experience evaluation
export const ACTION_VERBS = [
  'developed', 'created', 'built', 'implemented', 'designed', 'architected', 'led', 'managed',
  'optimized', 'improved', 'reduced', 'increased', 'automated', 'deployed', 'maintained',
  'collaborated', 'mentored', 'trained', 'coordinated', 'delivered', 'launched', 'integrated',
  'migrated', 'refactored', 'debugged', 'tested', 'documented', 'analyzed', 'researched',
  'spearheaded', 'orchestrated', 'pioneered', 'transformed', 'accelerated', 'scaled'
];

// Management-specific keywords
export const MANAGEMENT_KEYWORDS = [
  'leadership', 'strategy', 'budget', 'ROI', 'campaign', 'stakeholder', 'KPIs', 'communication', 'planning',
  'team management', 'project management', 'process', 'growth', 'marketing', 'analytics', 'operations',
  'prioritization', 'coordination', 'collaboration', 'P&L', 'business development', 'sales',
  'customer acquisition', 'retention', 'engagement', 'conversion', 'funnel', 'pipeline',
  'executive', 'director', 'vp', 'chief', 'head of', 'founder', 'co-founder'
];

// Design-specific keywords (expanded)
export const DESIGN_KEYWORDS = [
  'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'prototyping', 'wireframing', 'user research',
  'usability testing', 'interaction design', 'visual design', 'UI/UX', 'design system', 'persona',
  'accessibility', 'typography', 'research', 'prototype', 'user flows', 'information architecture',
  'heuristic evaluation', 'A/B testing', 'user journey', 'service design', 'motion design',
  'branding', 'icon design', 'responsive design', 'mobile-first', 'WCAG', 'design thinking'
];

// Extended tech keywords (includes ML/DS)
export const EXTENDED_TECH_KEYWORDS = [
  ...BASE_TECH_KEYWORDS
];
