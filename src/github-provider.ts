import { ResumeData, TimeBoundedEntity, SkillCategory } from './types';
import { githubCache } from './utils/github-cache';

/**
 * AI-powered description generator based on repository metadata
 */
class GitHubAIGenerator {
  private actionVerbs = [
    'Architected', 'Engineered', 'Developed', 'Built', 'Created', 
    'Designed', 'Implemented', 'Launched', 'Optimized', 'Revolutionized'
  ];

  private projectTypes: Record<string, string[]> = {
    'game': ['gaming experience', 'interactive entertainment', 'game mechanics'],
    'app': ['application', 'user-centric solution', 'mobile experience'],
    'tool': ['developer tool', 'productivity enhancer', 'utility'],
    'web': ['web platform', 'digital experience', 'online service'],
    'bot': ['automation bot', 'intelligent assistant', 'automated system'],
    'api': ['API service', 'backend infrastructure', 'integration layer'],
    'ui': ['user interface', 'design system', 'visual component'],
    'data': ['data processing', 'analytics solution', 'information system']
  };

  private techDescriptions: Record<string, string> = {
    'JavaScript': 'leveraging modern JavaScript ES6+ features',
    'TypeScript': 'with type-safe TypeScript architecture',
    'Python': 'utilizing Python\'s powerful ecosystem',
    'Dart': 'using Dart for cross-platform performance',
    'Kotlin': 'with Kotlin for modern Android development',
    'HTML': 'focusing on semantic HTML5 structure',
    'CSS': 'with advanced CSS styling techniques',
    'React': 'powered by React components',
    'Vue': 'built with Vue.js framework',
    'Angular': 'using Angular framework',
    'Node.js': 'with Node.js backend',
    'Flutter': 'cross-platform with Flutter'
  };

  /**
   * Detects project type from repo name and topics
   */
  detectProjectType(name: string, topics: string[]): string {
    const lowerName = name.toLowerCase();
    const lowerTopics = topics.map(t => t.toLowerCase());
    
    for (const [type, keywords] of Object.entries(this.projectTypes)) {
      if (lowerName.includes(type) || lowerTopics.some(t => keywords.some(k => t.includes(k)))) {
        return type;
      }
    }
    
    // Default based on common patterns
    if (lowerName.includes('pixel') || lowerName.includes('word')) return 'game';
    if (lowerName.includes('app')) return 'app';
    if (lowerName.includes('bot')) return 'bot';
    
    return 'web';
  }

  /**
   * Generates a unique achievement statement based on stars and forks
   */
  generateAchievement(stars: number, forks: number): string {
    if (stars === 0 && forks === 0) {
      return 'Initiated an open-source project to showcase technical capabilities.';
    } else if (stars > 10 || forks > 5) {
      return `Built and maintained a popular open-source project with ${stars} stars and ${forks} forks, demonstrating community impact.`;
    } else if (stars > 0) {
      return `Developed an open-source solution that gained ${stars} stars through quality implementation.`;
    } else {
      return `Created a specialized tool adopted by ${forks} developers through forks.`;
    }
  }

  /**
   * Generates professional description based on repo metadata
   */
  generateDescription(
    repoName: string,
    description: string | null,
    language: string | null,
    topics: string[],
    readmeContent: string | null
  ): string {
    const projectType = this.detectProjectType(repoName, topics);
    const projectConcept = this.projectTypes[projectType]?.[0] || 'software solution';
    
    // Extract keywords from README if available
    let readmeKeywords: string[] = [];
    if (readmeContent) {
      const words = readmeContent.split(/\s+/).filter(w => w.length > 4);
      const importantWords = words.filter(w => 
        ['performance', 'fast', 'efficient', 'modern', 'clean', 'modular', 
         'responsive', 'scalable', 'secure', 'intuitive'].some(k => w.toLowerCase().includes(k))
      );
      readmeKeywords = [...new Set(importantWords)].slice(0, 3);
    }

    // Choose action verb based on project characteristics
    const verbIndex = (repoName.length + (topics.length * 2)) % this.actionVerbs.length;
    const actionVerb = this.actionVerbs[verbIndex];
    
    // Build tech stack description
    const techDesc = language ? (this.techDescriptions[language] || `using ${language}`) : 'with modern engineering practices';
    
    // Generate base description
    const baseDescriptions = [
      `${actionVerb} a ${projectConcept} ${techDesc}, emphasizing code quality and maintainability.`,
      `${actionVerb} ${projectConcept} ${techDesc} with focus on user experience and performance optimization.`,
      `${actionVerb} innovative ${projectConcept} ${techDesc}, incorporating best practices in software architecture.`
    ];
    
    // Add README-based enhancements
    if (readmeKeywords.length > 0) {
      const keywordPhrase = readmeKeywords.join(', ');
      return `${baseDescriptions[0]} Key features include ${keywordPhrase}.`;
    }
    
    // Add topic-based enhancements
    if (topics.length > 0) {
      const topTopics = topics.slice(0, 3).join(', ');
      return `${actionVerb} a ${projectConcept} ${techDesc}, featuring ${topTopics}.`;
    }
    
    // Fallback to original description or generated one
    if (description && description.trim().length > 10) {
      return description;
    }
    
    return baseDescriptions[Math.floor(Math.random() * baseDescriptions.length)];
  }

  /**
   * Generates skills section based on all repositories
   */
  generateSkills(repos: any[], readmeContent: string | null): (string | SkillCategory)[] {
    const languages = Array.from(new Set(repos.map(r => r.language).filter(Boolean))) as string[];
    const allTopics = repos.flatMap(r => r.topics || []);
    const uniqueTopics = Array.from(new Set(allTopics));
    
    // Extract additional skills from README
    let readmeSkills: string[] = [];
    if (readmeContent) {
      const skillPatterns = [
        /react/gi, /vue/gi, /angular/gi, /node/gi, /express/gi,
        /mongodb/gi, /postgresql/gi, /mysql/gi, /docker/gi, /kubernetes/gi,
        /aws/gi, /azure/gi, /gcp/gi, /git/gi, /ci\/cd/gi,
        /rest/gi, /graphql/gi, /api/gi, /microservices/gi
      ];
      
      skillPatterns.forEach(pattern => {
        const matches = readmeContent.match(pattern);
        if (matches && matches.length > 0) {
          readmeSkills.push(matches[0].toUpperCase());
        }
      });
    }
    
    const combinedTopics = [...uniqueTopics, ...readmeSkills].filter(Boolean);
    
    return [
      { category: 'Languages', items: languages.slice(0, 8) },
      { category: 'Frameworks & Tools', items: combinedTopics.slice(0, 10) }
    ];
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

const aiGenerator = new GitHubAIGenerator();

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
    
    if (!userRes.ok) throw new Error('User not found');
    profile = await userRes.json();
    allRepos = await reposRes.json() as any[];
    
    // Cache the results
    githubCache.set(userCacheKey, profile);
    githubCache.set(reposCacheKey, allRepos);
  }
  
  // 2. Fetch README from the most popular repo (or a repo named after the user)
  let readmeContent: string | undefined;
  const sortedRepos = [...allRepos].sort((a, b) => b.stargazers_count - a.stargazers_count);
  
  // Try to find README in top repos
  for (const repo of sortedRepos.slice(0, 5)) {
    try {
      const readmeRes = await fetch(`https://api.github.com/repos/${username}/${repo.name}/readme`, { headers });
      if (readmeRes.ok) {
        const readmeData = await readmeRes.json();
        // GitHub API returns README content base64 encoded
        if (readmeData.content) {
          // Правильное декодирование Base64 в UTF-8 для поддержки всех языков (корейский, эмодзи и т.д.)
          const binaryString = window.atob(readmeData.content);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const decoder = new TextDecoder('utf-8');
          readmeContent = decoder.decode(bytes);
          break;
        }
      }
    } catch (e) {
      // Continue to next repo if this one fails
      continue;
    }
  }
  
  // 2. Filter and Sort Repos (Top 10 by impact: stars + forks)
  const topRepos = allRepos
    .filter(repo => !repo.fork)
    .sort((a, b) => (b.stargazers_count + b.forks_count) - (a.stargazers_count + a.forks_count))
    .slice(0, 10);
  
  const currentYear = new Date().getFullYear();
  
  // 3. Map Repos to Professional Experience with AI-generated descriptions
  const experience: TimeBoundedEntity[] = topRepos.map(repo => {
    const bullets: string[] = [];
    
    // AI-generated achievement based on metrics
    const achievement = aiGenerator.generateAchievement(repo.stargazers_count, repo.forks_count);
    bullets.push(achievement);
    
    // AI-generated technical description
    const smartDescription = aiGenerator.generateDescription(
      repo.name,
      repo.description,
      repo.language,
      repo.topics || [],
      readmeContent || null
    );
    bullets.push(smartDescription);
    
    // Tech Stack & Metadata
    if (repo.topics && repo.topics.length > 0) {
      bullets.push(`Key Technologies: ${repo.topics.join(', ')}`);
    } else {
      bullets.push(`Primary Stack: ${repo.language || 'Software Engineering'}`);
    }
    
    // Links (Live Demo or Repo)
    if (repo.homepage) {
      bullets.push(`Live Demo: ${repo.homepage.replace(/^https?:\/\//, '')}`);
    }
    
    // Умное форматирование дат
    const startYear = new Date(repo.created_at).getFullYear();
    const endYear = new Date(repo.updated_at).getFullYear();
    let period: string;
    
    if (startYear === endYear) {
      // Если годы одинаковые, показываем только один год
      period = `${startYear}`;
    } else if (endYear > currentYear) {
      // Если конец даты в будущем (невозможно), ограничиваем текущим годом
      period = `${startYear} — ${currentYear}`;
    } else {
      // Обычный случай: диапазон годов
      period = `${startYear} — ${endYear}`;
    }
    
    return {
      institution: 'GitHub Open Source',
      role: formatRepoName(repo.name),
      period: period,
      description: bullets
    };
  });
  
  // 4. Synthesize Skills Section with AI enhancement
  const skills = aiGenerator.generateSkills(allRepos, readmeContent || null);
  
  // 5. Build Final Resume Object
  return {
    personal: {
      name: profile.name || profile.login,
      title: profile.bio ? profile.bio.split('.')[0] : 'Software Engineer',
      email: profile.email || `${profile.login}@github.com`,
      phone: 'Available upon request',
      location: profile.location || 'Remote / Global',
      github: profile.html_url,
      linkedin: profile.blog && profile.blog.includes('linkedin') ? profile.blog : undefined
    },
    experience,
    education: [
      {
        institution: 'GitHub Contributions',
        role: `Active Developer since ${new Date(profile.created_at).getFullYear()}`,
        period: `${profile.public_repos} Public Repositories`,
        description: [
          `Accumulated ${allRepos.reduce((acc, r) => acc + r.stargazers_count, 0)} total stars across all projects.`,
          `Continuous integration and contribution to the global developer ecosystem.`
        ]
      }
    ],
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
