import { ResumeData, SkillCategory } from './types';

/**
 * Sample data pools for the demo resume.
 *
 * This module is imported by the app at startup, so it must stay free of
 * heavyweight dependencies: a faker-style data library would ship its entire
 * locale database (megabytes) to every visitor just to render one placeholder
 * resume. Small hand-written pools keep the production bundle lean.
 *
 * The demo is intentionally built to score 100 on the ATS checker. It is the
 * example the user sees first, so it should demonstrate what an optimised,
 * ATS-friendly resume looks like rather than one that needs work.
 */
const FIRST_NAMES = ['Ava', 'Noah', 'Mia', 'Liam', 'Sofia', 'Ethan', 'Nora', 'Lucas', 'Iris', 'Marco'];
const LAST_NAMES = ['Bennett', 'Okafor', 'Lindqvist', 'Moreau', 'Ivanova', 'Tanaka', 'Silva', 'Novak'];
const CITIES = [
  'Berlin, Germany',
  'Lisbon, Portugal',
  'Toronto, Canada',
  'Austin, USA',
  'Amsterdam, Netherlands',
  'Seoul, South Korea'
];
const COMPANIES = ['Northwind Labs', 'Helix Systems', 'Bluepeak Digital', 'Orbit Software', 'Cardinal Analytics'];
const UNIVERSITIES = ['Riverside University', 'Northgate Institute of Technology', 'Lakeview University'];
const DEGREES = ['B.S. Computer Science', 'B.S. Software Engineering', 'M.S. Information Systems', 'B.S. Data Science'];

const TITLES = [
  'Senior Full Stack Engineer — TypeScript, React, Node.js',
  'Backend Engineer — Python, PostgreSQL, Docker, AWS',
  'Frontend Engineer — TypeScript, React, GraphQL',
  'Platform Engineer — Kubernetes, Docker, AWS, CI/CD',
  'Software Engineer — TypeScript, Node.js, SQL'
];

const ROLES = ['Senior Software Engineer', 'Software Engineer', 'Full Stack Developer', 'Backend Developer'];

// A broad, keyword-rich skill set. Listing 20+ tracked skills is realistic for
// a senior engineer and is what lets the ATS keyword score reach 100.
const CORE_SKILLS = [
  'TypeScript', 'JavaScript', 'React', 'Node.js', 'HTML', 'CSS', 'Git', 'SQL',
  'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'Python', 'Go', 'GraphQL',
  'REST', 'CI/CD', 'GitHub Actions', 'Linux', 'Bash'
];

const EXTRA_SKILLS = [
  'Next.js', 'Jest', 'Cypress', 'Terraform', 'Redis', 'MongoDB', 'GraphQL',
  'Agile', 'Scrum', 'Microservices'
];

const EDITORS = ['VS Code', 'IntelliJ IDEA', 'WebStorm', 'Neovim'];
const DESIGN_TOOLS = ['Figma', 'Sketch', 'Adobe XD'];

/**
 * Achievement bullets written to look like a real resume: each one leads with
 * an action verb and carries a metric, which is also what the ATS checker
 * rewards, so the demo profile is the ideal the tool guides users toward.
 */
const ACHIEVEMENTS = [
  'Led the migration of a legacy dashboard to TypeScript and React, cutting page load time by 42% over two months.',
  'Designed and shipped a REST API serving 1.2M requests per day with 99.95% uptime.',
  'Reduced CI pipeline duration from 18 to 6 minutes by parallelising builds and caching dependencies.',
  'Implemented automated regression tests, lowering production defects by 35% across two quarters.',
  'Optimised PostgreSQL queries and indexing, improving p95 response time from 800ms to 180ms.',
  'Mentored 4 junior engineers and introduced code review guidelines adopted by 3 teams.',
  'Containerised 12 services with Docker and Kubernetes, enabling zero-downtime deployments.',
  'Built an analytics dashboard in React that increased weekly active usage by 28%.',
  'Automated deployments with GitHub Actions, cutting release time from 3 hours to 20 minutes.',
  'Collaborated with designers in Figma to deliver responsive interfaces for 40 client projects.',
  'Migrated 5 services to AWS with infrastructure as code, reducing infrastructure spend by 24%.'
];

const EDUCATION_NOTES = [
  'Graduated with honours; focus on distributed systems and algorithms.',
  'Teaching assistant for two undergraduate programming courses.',
  'Final year project on scalable data pipelines, awarded top marks.'
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)];
}

/**
 * Pick `count` distinct items without mutating the source pool.
 */
function pickMany<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const chosen: T[] = [];
  const total = Math.min(count, pool.length);
  for (let i = 0; i < total; i++) {
    chosen.push(...pool.splice(randomInt(0, pool.length - 1), 1));
  }
  return chosen;
}

/**
 * Generates a demo profile with plausible random data.
 *
 * Experience entries are emitted in reverse chronological order with
 * non-overlapping, gap-free periods so the ATS date checks see valid input.
 * The generated resume reliably scores 100: 3 positions, every bullet
 * quantified and verb-led, 20+ tracked keywords, and a keyword-rich headline.
 */
export function generateDemoProfile(): ResumeData {
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const handle = name.toLowerCase().replace(/[^a-z]+/g, '');

  const skills: (string | SkillCategory)[] = [
    ...CORE_SKILLS,
    ...pickMany(EXTRA_SKILLS, randomInt(2, 4)),
    { category: 'Tools', items: [pick(EDITORS), pick(DESIGN_TOOLS), 'Git'] }
  ];

  const currentYear = new Date().getFullYear();
  const numExperiences = 3;
  // 4 bullets for the current role + 3 for each previous one gives a rich
  // enough history that the ATS word-count check (200-800 words) always passes.
  const bullets = pickMany(ACHIEVEMENTS, numExperiences * 3 + 1);

  const experience = [];
  let periodEnd: number | null = null; // null => the most recent role is ongoing
  let periodStart = currentYear - randomInt(1, 3);
  let earliestStart = periodStart;

  for (let i = 0; i < numExperiences; i++) {
    const bulletCount = i === 0 ? 4 : 3;
    const start = i === 0 ? 0 : 1 + i * 3;
    experience.push({
      institution: pick(COMPANIES),
      role: pick(ROLES),
      period: periodEnd === null ? `${periodStart} - Present` : `${periodStart} - ${periodEnd}`,
      description: bullets.slice(start, start + bulletCount)
    });
    earliestStart = periodStart;
    // Next entry ends where this one began, keeping the timeline gap-free.
    periodEnd = periodStart;
    periodStart = periodStart - randomInt(2, 3);
  }

  // Graduate in the year the first job started, so the resume timeline has no
  // gap between education and the earliest role.
  const graduationYear = earliestStart;
  const education = [
    {
      institution: pick(UNIVERSITIES),
      role: pick(DEGREES),
      period: `${graduationYear - 4} - ${graduationYear}`,
      description: [`GPA: ${(randomInt(30, 40) / 10).toFixed(1)}/4.0`, pick(EDUCATION_NOTES)]
    }
  ];

  return {
    personal: {
      name,
      title: pick(TITLES),
      email: `${handle}@example.com`,
      phone: `+1 555 ${randomInt(100, 999)} ${randomInt(1000, 9999)}`,
      location: pick(CITIES),
      github: `github.com/${handle}`,
      linkedin: `linkedin.com/in/${handle}`
    },
    education,
    experience,
    skills
  };
}
