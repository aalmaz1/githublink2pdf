import { ResumeData, SkillCategory } from './types';

/**
 * Sample data pools for the demo resume.
 *
 * This module is imported by the app at startup, so it must stay free of
 * heavyweight dependencies: a faker-style data library would ship its entire
 * locale database (megabytes) to every visitor just to render one placeholder
 * resume. Small hand-written pools keep the production bundle lean.
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
  'Senior Frontend Engineer',
  'Full Stack Developer',
  'Backend Engineer',
  'Platform Engineer',
  'Software Engineer'
];

const ROLES = ['Senior Software Engineer', 'Software Engineer', 'Full Stack Developer', 'Backend Developer'];

const SKILL_POOL = [
  'TypeScript', 'JavaScript', 'Python', 'Go', 'React', 'Vue', 'Node.js',
  'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'GraphQL', 'REST API', 'CI/CD'
];

const EDITORS = ['VS Code', 'IntelliJ IDEA', 'WebStorm', 'Neovim'];
const DESIGN_TOOLS = ['Figma', 'Sketch', 'Adobe XD'];

/**
 * Achievement bullets written to look like a real resume: each one leads with
 * an action verb and carries a metric, which is also what the ATS checker
 * rewards, so the demo profile scores realistically.
 */
const ACHIEVEMENTS = [
  'Led the migration of a legacy dashboard to TypeScript and React, cutting page load time by 42%.',
  'Designed and shipped a REST API serving 1.2M requests per day with 99.95% uptime.',
  'Reduced CI pipeline duration from 18 to 6 minutes by parallelising builds and caching dependencies.',
  'Implemented automated regression tests, lowering production defects by 35% over two quarters.',
  'Optimised PostgreSQL queries and indexing, improving p95 response time from 800ms to 180ms.',
  'Mentored 4 junior engineers and introduced code review guidelines adopted across 3 teams.',
  'Containerised 12 services with Docker and Kubernetes, enabling zero-downtime deployments.'
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
 */
export function generateDemoProfile(): ResumeData {
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const handle = name.toLowerCase().replace(/[^a-z]+/g, '');

  const skills: (string | SkillCategory)[] = [
    ...pickMany(SKILL_POOL, randomInt(5, 6)),
    { category: 'Tools', items: [pick(EDITORS), pick(DESIGN_TOOLS), 'Git'] }
  ];

  const currentYear = new Date().getFullYear();
  const numExperiences = randomInt(2, 3);
  const bullets = pickMany(ACHIEVEMENTS, numExperiences * 2);

  const experience = [];
  let periodEnd: number | null = null; // null => the most recent role is ongoing
  let periodStart = currentYear - randomInt(1, 3);
  let earliestStart = periodStart;

  for (let i = 0; i < numExperiences; i++) {
    experience.push({
      institution: pick(COMPANIES),
      role: pick(ROLES),
      period: periodEnd === null ? `${periodStart} - Present` : `${periodStart} - ${periodEnd}`,
      description: bullets.slice(i * 2, i * 2 + 2)
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
