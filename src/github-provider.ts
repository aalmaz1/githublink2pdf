import { ResumeData, TimeBoundedEntity, SkillCategory } from './types';
import { githubCache } from './utils/github-cache';

/**
 * Turns raw repository metadata into resume bullet points.
 *
 * Everything produced here must be checkable against the GitHub page it came
 * from. An earlier version invented praise ("demonstrating community impact",
 * "emphasizing code quality and maintainability") from nothing but a repo
 * name, which is exactly the kind of claim a candidate cannot defend in an
 * interview. Only facts the API actually returns are emitted now.
 */
class GitHubProjectFormatter {
  /**
   * Builds the bullet list for one repository: its own description first,
   * then the measurable facts GitHub publishes about it.
   */
  buildBullets(repo: any): string[] {
    const bullets: string[] = [];

    const ownDescription = typeof repo.description === 'string' ? repo.description.trim() : '';
    if (ownDescription.length > 0) {
      bullets.push(ownDescription);
    }

    const stars = Number(repo.stargazers_count) || 0;
    const forks = Number(repo.forks_count) || 0;
    const traction: string[] = [];
    if (stars > 0) {
      traction.push(`${stars} ${stars === 1 ? 'star' : 'stars'}`);
    }
    if (forks > 0) {
      traction.push(`${forks} ${forks === 1 ? 'fork' : 'forks'}`);
    }
    if (traction.length > 0) {
      bullets.push(`${traction.join(', ')} on GitHub.`);
    }

    const stack = this.buildStack(repo);
    if (stack.length > 0) {
      bullets.push(`Tech stack: ${stack.join(', ')}.`);
    }

    const homepage = typeof repo.homepage === 'string' ? repo.homepage.trim() : '';
    if (homepage.length > 0) {
      bullets.push(`Live demo: ${homepage.replace(/^https?:\/\//, '')}`);
    }

    return bullets;
  }

  /**
   * The languages and topics GitHub reports for a repository, de-duplicated
   * and in a stable order.
   */
  private buildStack(repo: any): string[] {
    const topics: string[] = Array.isArray(repo.topics) ? repo.topics.filter(Boolean) : [];
    const language = typeof repo.language === 'string' && repo.language.trim().length > 0
      ? repo.language.trim()
      : null;

    const stack = language ? [language, ...topics] : [...topics];
    return Array.from(new Set(stack));
  }

  /**
   * Skills are aggregated from the languages and topics GitHub records for
   * the user's own repositories - never guessed from prose.
   */
  generateSkills(repos: any[]): (string | SkillCategory)[] {
    const languages = this.countByFrequency(
      repos
        .map(r => (typeof r.language === 'string' ? r.language.trim() : ''))
        .filter(lang => lang.length > 0)
    );

    const topics = this.countByFrequency(
      repos.flatMap(r => (Array.isArray(r.topics) ? r.topics : []))
        .map((t: unknown) => (typeof t === 'string' ? t.trim() : ''))
        .filter((t: string) => t.length > 0)
    );

    const categories: SkillCategory[] = [];
    if (languages.length > 0) {
      categories.push({ category: 'Languages', items: languages.slice(0, 8) });
    }
    if (topics.length > 0) {
      categories.push({ category: 'Technologies & Topics', items: topics.slice(0, 10) });
    }
    return categories;
  }

  /** Orders values by how often they appear, most used first. */
  private countByFrequency(values: string[]): string[] {
    const counts = new Map<string, number>();
    for (const value of values) {
      counts.set(value, (counts.get(value) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([value]) => value);
  }
}

/**
 * Extracts GitHub username from various input formats
 * Supported formats:
 * - username (e.g., "eKoopmans")
 * - https://github.com/username
 * - https://github.com/username/
 * - http://github.com/username
 * - github.com/username
 * - With trailing spaces
 */
export function extractUsername(input: string): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid input: username cannot be empty');
  }
  
  // Trim whitespace
  let cleanInput = input.trim();
  
  // Remove trailing slashes and any spaces after them
  cleanInput = cleanInput.replace(/\/+\s*$/, '');
  
  // Try to match full URL with protocol
  const urlMatch = cleanInput.match(/^https?:\/\/(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (urlMatch) {
    const username = urlMatch[1];
    if (!isValidUsername(username)) {
      throw new Error(`Invalid username extracted: ${username}`);
    }
    return username;
  }
  
  // Try to match without protocol (e.g., "github.com/username")
  const noProtocolMatch = cleanInput.match(/^(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
  if (noProtocolMatch) {
    const username = noProtocolMatch[1];
    if (!isValidUsername(username)) {
      throw new Error(`Invalid username extracted: ${username}`);
    }
    return username;
  }
  
  // If it contains a slash, take the last part (handles edge cases)
  if (cleanInput.includes('/')) {
    const parts = cleanInput.split('/');
    const potentialUsername = parts[parts.length - 1].trim();
    if (potentialUsername && isValidUsername(potentialUsername)) {
      return potentialUsername;
    }
  }
  
  // Treat as raw username
  const username = cleanInput;
  if (!isValidUsername(username)) {
    throw new Error(`Invalid username format: ${username}. Only letters, numbers, hyphens, and underscores are allowed.`);
  }
  
  return username;
}

/**
 * Validates GitHub username format
 * GitHub usernames can contain letters, numbers, hyphens, and underscores
 * Cannot start or end with a hyphen
 */
export function isValidUsername(username: string): boolean {
  if (!username || username.length === 0 || username.length > 39) {
    return false;
  }
  // GitHub username pattern: alphanumeric, hyphens, underscores
  // Cannot start or end with hyphen
  const githubUsernamePattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9_-]*[a-zA-Z0-9])?$|^[a-zA-Z0-9]$/;
  return githubUsernamePattern.test(username);
}

const projectFormatter = new GitHubProjectFormatter();

export async function fetchGitHubResumeData(input: string): Promise<ResumeData> {
  // Extract and validate username from various input formats
  const username = extractUsername(input);
  
  const headers = { 'Accept': 'application/vnd.github.v3+json' };
  
  // Create cache keys
  const userCacheKey = `user:${username}`;
  const reposCacheKey = `repos:${username}`;
  
  // Try to get cached data first
  const cachedUser = githubCache.get<any>(userCacheKey);
  const cachedRepos = githubCache.get<any[]>(reposCacheKey);
  
  let profile: any;
  let allRepos: any[];
  
  if (cachedUser && cachedRepos) {
    // Use cached data
    profile = cachedUser;
    allRepos = cachedRepos;
  } else {
    // Fetch from API
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=30`, { headers })
    ]);
    
    if (!userRes.ok) {
      // 403/429 mean the unauthenticated rate limit was hit, which is a very
      // different problem from a typo in the username — don't conflate them.
      if (userRes.status === 403 || userRes.status === 429) {
        throw new Error('GitHub API rate limit reached. Please try again later.');
      }
      throw new Error('User not found');
    }
    profile = await userRes.json();

    // A failed repo request returns an error object, not an array; guard the
    // shape so downstream array operations cannot throw.
    const reposJson = reposRes.ok ? await reposRes.json() : null;
    allRepos = Array.isArray(reposJson) ? reposJson : [];
    
    // Cache the results
    githubCache.set(userCacheKey, profile);
    githubCache.set(reposCacheKey, allRepos);
  }
  
  // 2. Keep the user's own repositories, most-starred first.
  const topRepos = allRepos
    .filter(repo => !repo.fork)
    .sort((a, b) => (b.stargazers_count + b.forks_count) - (a.stargazers_count + a.forks_count))
    .slice(0, 10);
  
  const currentYear = new Date().getFullYear();
  
  // 3. Map each repository to a project entry built only from API facts.
  const projects: TimeBoundedEntity[] = topRepos.map(repo => {
    const bullets = projectFormatter.buildBullets(repo);

    // Activity window, taken from the repository's own timestamps.
    const startYear = new Date(repo.created_at).getFullYear();
    const endYear = new Date(repo.updated_at).getFullYear();
    let period: string;
    
    if (startYear === endYear) {
      // Created and last touched in the same year: show a single year.
      period = `${startYear}`;
    } else if (endYear > currentYear) {
      // Guard against clock-skewed timestamps in the future.
      period = `${startYear} — ${currentYear}`;
    } else {
      // Normal case: a range of years.
      period = `${startYear} — ${endYear}`;
    }
    
    return {
      // Repositories are personal/open-source work, not employment. They are
      // returned as projects so the resume never implies a job that did not
      // happen; `institution` names the actual host of the code.
      institution: 'Personal / Open Source',
      role: formatRepoName(repo.name),
      period: period,
      description: bullets
    };
  });
  
  // 4. Aggregate skills from the languages and topics GitHub reports.
  const skills = projectFormatter.generateSkills(allRepos.filter(repo => !repo.fork));
  
  // 5. Build Final Resume Object
  //
  // Only facts that GitHub actually exposes are filled in. Employment history
  // and education are left empty for the user to type in: inventing them
  // would put false claims in front of a recruiter. The UI flags the empty
  // sections instead.
  return {
    personal: {
      name: profile.name || profile.login,
      // The bio is the only self-description GitHub has. Guessing
      // "Software Engineer" for someone who never claimed it is a fabrication,
      // so an absent bio leaves the headline for the user to fill in.
      title: profile.bio ? profile.bio.split('.')[0].trim() : '',
      // A public email is often absent; `login@github.com` is not a real
      // mailbox, so leave it blank rather than shipping an address that
      // silently drops recruiter replies.
      email: profile.email || '',
      phone: '',
      location: profile.location || '',
      github: profile.html_url,
      linkedin: profile.blog && profile.blog.includes('linkedin') ? profile.blog : undefined
    },
    experience: [],
    education: [],
    projects,
    skills
  };
}

/**
 * Formats repository name from kebab/snake_case to Title Case
 */
function formatRepoName(name: string): string {
  return name.split(/[-_]/).map((w: string) => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');
}
