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

/**
 * Synonym / alias map for keyword matching.
 * Helps the ATS checker match shorthand or alternate forms of the same skill.
 */
export const SYNONYM_MAP: Record<string, string[]> = {
  'javascript': ['js', 'ecmascript', 'es6', 'es2015', 'esnext'],
  'typescript': ['ts'],
  'python': ['py'],
  'react': ['reactjs', 'react.js', 'react-js'],
  'node.js': ['node', 'nodejs'],
  'next.js': ['next', 'nextjs'],
  'express': ['expressjs', 'express.js'],
  'nestjs': ['nest.js', 'nest'],
  'docker': ['container', 'containers', 'containerization'],
  'kubernetes': ['k8s'],
  'machine learning': ['ml', 'artificial intelligence', 'ai'],
  'deep learning': ['dl', 'neural network', 'neural networks'],
  'natural language processing': ['nlp'],
  'computer vision': ['cv'],
  'aws': ['amazon web services'],
  'gcp': ['google cloud', 'google cloud platform'],
  'azure': ['microsoft azure'],
  'ci/cd': ['cicd', 'continuous integration', 'continuous deployment', 'continuous delivery'],
  'rest': ['restful', 'rest api', 'restful api'],
  'graphql': ['gql'],
  'sql': ['mysql', 'postgresql', 'postgres', 'relational database'],
  'mongodb': ['mongo', 'nosql'],
  'frontend': ['front end', 'front-end'],
  'backend': ['back end', 'back-end'],
  'full stack': ['fullstack', 'full-stack'],
  'devops': ['dev ops', 'dev-ops'],
  'software engineer': ['software developer', 'swe', 'programmer'],
  'html': ['html5'],
  'css': ['css3'],
  'figma': ['figma design'],
  'agile': ['scrum', 'kanban'],
  'tdd': ['test driven development'],
  'jest': ['jestjs', 'jest.js'],
  'pytorch': ['torch'],
  'scikit-learn': ['sklearn'],
  'pandas': ['pandas library'],
  'numpy': ['numpy library'],
  'photoshop': ['ps'],
  'illustrator': ['ai'],
  'sketch': ['sketch app'],
};

/**
 * Regular expressions to detect quantifiable achievements in text.
 */
export const QUANTIFIABLE_PATTERNS = [
  /\d+%/g,                       // "40%", "100%"
  /\d+x/g,                       // "2x", "5x"
  /\$\d+[kKmMbB]?/g,             // "$10k", "$5M"
  /\d+[kKmMbB]/g,                // "10k users", "5M requests"
  /increased?|decreased?|reduced?/gi,
  /improved?|optimized?|accelerated?/gi,
  /by \d+/gi,                    // "by 40%"
  /over \d+/gi,                  // "over 2000 users"
  /more than \d+/gi,             // "more than 500"
  /\d+ (percent|users|customers|clients|requests|queries|ms|seconds|hours|days|times)/gi,
  /top \d+/gi,                   // "top 10"
  /\d+ (countries|cities|teams|repositories|commits|projects)/gi,
  /led a team of \d+/gi,
  /managed \d+/gi,
  // "managed 25 engineers"
];
