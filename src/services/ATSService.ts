import { ATSResult, ATSIssue, ATSScoreBreakdown, ResumeProfile } from '../types/ats';
import { ResumeData, TimeBoundedEntity } from '../types';
import {
  ACTION_VERBS,
  MANAGEMENT_KEYWORDS,
  DESIGN_KEYWORDS,
  EXTENDED_TECH_KEYWORDS,
  SYNONYM_MAP,
  QUANTIFIABLE_PATTERNS
} from '../config/ats-keywords';

// Required sections for structure check
const REQUIRED_SECTIONS = {
  contacts: true,
  summary: true,
  experience: true,
  education: false,
  skills: true
};

// Profile weights configuration - optimized for accuracy
interface ProfileWeights {
  structure: number;
  keywords: number;
  contacts: number;
  format: number;
  dates: number;
  experience: number;
  education: number;
  summary: number;
}

const PROFILE_WEIGHTS: Record<ResumeProfile, ProfileWeights> = {
  technical: {
    structure: 0.15,
    keywords: 0.26,
    contacts: 0.15,
    format: 0.10,
    dates: 0.07,
    experience: 0.15,
    education: 0.04,
    summary: 0.08
  },
  student: {
    structure: 0.10,
    keywords: 0.18,
    contacts: 0.15,
    format: 0.09,
    dates: 0.05,
    experience: 0.10,
    education: 0.27,
    summary: 0.06
  },
  management: {
    structure: 0.17,
    keywords: 0.16,
    contacts: 0.15,
    format: 0.13,
    dates: 0.07,
    experience: 0.16,
    education: 0.08,
    summary: 0.08
  },
  design: {
    structure: 0.14,
    keywords: 0.23,
    contacts: 0.15,
    format: 0.16,
    dates: 0.06,
    experience: 0.12,
    education: 0.06,
    summary: 0.08
  },
  other: {
    structure: 0.17,
    keywords: 0.16,
    contacts: 0.15,
    format: 0.16,
    dates: 0.08,
    experience: 0.13,
    education: 0.07,
    summary: 0.08
  }
};

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/**
 * Substring matching produced silent false positives all over the scoring:
 * "settled" contains "led", "going" contains "go", "available" contains "ai",
 * and "restaurant" contains "rest". A chef's resume was scoring technical
 * keyword hits. Terms must match as whole words instead.
 *
 * A plain `\b` is not enough because many keywords end or start with
 * punctuation ("c++", "c#", ".net", "ci/cd"), where `\b` behaves
 * inconsistently. Guards are therefore applied only on the sides where the
 * term actually begins or ends with an alphanumeric character.
 */
const termMatcherCache = new Map<string, RegExp>();

function buildTermMatcher(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const prefix = /^[a-z0-9]/i.test(term) ? '(?<![a-z0-9])' : '';
  const suffix = /[a-z0-9]$/i.test(term) ? '(?![a-z0-9])' : '';
  return new RegExp(`${prefix}${escaped}${suffix}`, 'i');
}

function containsTerm(text: string, term: string): boolean {
  const normalized = term.trim().toLowerCase();
  if (!normalized) return false;

  let matcher = termMatcherCache.get(normalized);
  if (!matcher) {
    matcher = buildTermMatcher(normalized);
    termMatcherCache.set(normalized, matcher);
  }
  return matcher.test(text);
}

function hasActionVerbs(text: string): boolean {
  return ACTION_VERBS.some(verb => containsTerm(text, verb));
}

function collectResumeText(data: ResumeData): string {
  const parts: string[] = [];
  parts.push(data.personal.name || '');
  parts.push(data.personal.title || '');
  parts.push(data.personal.location || '');
  for (const skill of data.skills || []) {
    if (typeof skill === 'string') {
      parts.push(skill);
    } else {
      parts.push(skill.category);
      parts.push(...skill.items);
    }
  }
  for (const exp of data.experience || []) {
    parts.push(exp.role || '');
    parts.push(exp.institution || '');
    parts.push(exp.period || '');
    parts.push(...(exp.description || []));
  }
  for (const edu of data.education || []) {
    parts.push(edu.role || '');
    parts.push(edu.institution || '');
    parts.push(edu.period || '');
    parts.push(...(edu.description || []));
  }
  for (const project of data.projects || []) {
    parts.push(project.role || '');
    parts.push(project.institution || '');
    parts.push(project.period || '');
    parts.push(...(project.description || []));
  }
  return parts.join(' ');
}

/**
 * Expand a list of keywords by including their synonyms/aliases.
 * This allows matching "JS" when the keyword is "JavaScript", and vice versa.
 */
function expandKeywords(keywords: string[]): Set<string> {
  const expanded = new Set(keywords.map(k => k.toLowerCase()));
  for (const keyword of keywords) {
    const lower = keyword.toLowerCase();
    const aliases = SYNONYM_MAP[lower];
    if (aliases) {
      for (const alias of aliases) {
        expanded.add(alias);
      }
    }
  }
  // Reverse: if any alias appears in a synonym list, include its canonical
  for (const keyword of keywords) {
    const lower = keyword.toLowerCase();
    for (const [canonical, aliasList] of Object.entries(SYNONYM_MAP)) {
      if (aliasList.includes(lower)) {
        expanded.add(canonical);
      }
    }
  }
  return expanded;
}

function calculateKeywordMatch(resumeText: string, jobDescription: string | undefined, keywords: string[]): {
  foundKeywords: string[];
  missingKeywords: string[];
  matchPercentage: number;
} {
  const lowerResume = resumeText.toLowerCase();
  // Expand keywords with synonyms/aliases for smarter matching
  const expandedKeywords = expandKeywords(keywords);
  const lowerKeywords = Array.from(expandedKeywords);

  if (jobDescription && jobDescription.trim().length > 0) {
    const lowerJob = jobDescription.toLowerCase();
    const jobKeywords = lowerKeywords.filter(keyword => containsTerm(lowerJob, keyword));
    const selectedKeywords = jobKeywords.length > 0 ? jobKeywords : lowerKeywords;
    const found = selectedKeywords.filter(keyword => containsTerm(lowerResume, keyword));
    return {
      foundKeywords: found,
      missingKeywords: selectedKeywords.filter(keyword => !found.includes(keyword)),
      matchPercentage: selectedKeywords.length > 0 ? Math.round((found.length / selectedKeywords.length) * 100) : 0
    };
  }

  const found = lowerKeywords.filter(keyword => containsTerm(lowerResume, keyword));
  return {
    foundKeywords: found.slice(0, 20),
    missingKeywords: lowerKeywords.filter(keyword => !found.includes(keyword)).slice(0, 10),
    matchPercentage: Math.min(100, Math.round((found.length / Math.min(lowerKeywords.length, 20)) * 100))
  };
}

function hasContactInformation(data: ResumeData): boolean {
  return !!(
    data.personal.name?.trim() ||
    data.personal.email?.trim() ||
    data.personal.phone?.trim() ||
    data.personal.linkedin?.trim() ||
    data.personal.location?.trim() ||
    data.personal.github?.trim()
  );
}

function hasProjectEvidence(data: ResumeData): boolean {
  // A populated projects section is direct evidence; no need to guess.
  if (data.projects?.length) return true;

  const text = collectResumeText(data).toLowerCase();
  return /project|portfolio|capstone|prototype|research|study|coursework|user research|usability/.test(text);
}

function getKeywordList(profile: ResumeProfile): string[] {
  switch (profile) {
    case 'management':
      return MANAGEMENT_KEYWORDS;
    case 'design':
      return DESIGN_KEYWORDS;
    case 'student':
      return [...EXTENDED_TECH_KEYWORDS, ...DESIGN_KEYWORDS];
    case 'other':
      // "other" is the catch-all for resumes we could not classify, so it must
      // not be graded purely on software terms - that told a chef to add
      // technical keywords. Score against the general professional vocabulary.
      return [...MANAGEMENT_KEYWORDS, ...EXTENDED_TECH_KEYWORDS];
    default:
      return EXTENDED_TECH_KEYWORDS;
  }
}

/**
 * Count descriptions that contain quantifiable achievements (numbers, %, $, etc.)
 */
function isQuantified(description: string): boolean {
  return QUANTIFIABLE_PATTERNS.some(pattern => pattern.test(description));
}

function countQuantifiableAchievements(descriptions: string[]): number {
  if (!descriptions || descriptions.length === 0) return 0;
  return descriptions.filter(isQuantified).length;
}

/**
 * Try to parse a date string like "2020 - Present", "01/2020", or "Summer 2022".
 */
function parsePeriod(period: string): { year: number | null; month: number | null } {
  const lower = period.trim().toLowerCase();
  const yearMatch = lower.match(/(\d{4})/);
  const monthNames: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };
  let month: number | null = null;
  for (const [name, num] of Object.entries(monthNames)) {
    if (lower.startsWith(name) || lower.includes(' ' + name + ' ') || lower.includes('-' + name)) {
      month = num;
      break;
    }
  }
  const numericMonthMatch = lower.match(/^(\d{1,2})\//);
  if (numericMonthMatch && !month) {
    const m = parseInt(numericMonthMatch[1], 10);
    if (m >= 1 && m <= 12) month = m;
  }
  return { year: yearMatch ? parseInt(yearMatch[1], 10) : null, month };
}

/**
 * Check if a period string indicates "Present" or "Current"
 */
function isPresent(period: string): boolean {
  return /\b(present|current|now|ongoing)\b/i.test(period);
}

/**
 * Parse start and end from a period string like "2020 - Present" or "01/2020 - 03/2022".
 */
function parsePeriodRange(period: string): {
  start: { year: number | null; month: number | null };
  end: { year: number | null; month: number | null };
  isCurrent: boolean;
} {
  // Split on a dash/en dash/em dash or the word "to" — never on the bare
  // letters "t"/"o", which a character class would match (e.g. "Oct 2020").
  const parts = period.split(/\s*(?:[-\u2013\u2014]+|\bto\b)\s*/i).map(p => p.trim());
  const start = parts[0] ? parsePeriod(parts[0]) : { year: null, month: null };
  const endPart = parts.length > 1 ? parts[1] : '';
  const isCurrent = isPresent(endPart) || !endPart;
  const end = isCurrent ? { year: null, month: null } : parsePeriod(endPart);
  return { start, end, isCurrent };
}

/**
 * Sort issues: errors first, then warnings, then success, then info.
 */
function sortIssuesByPriority(issues: ATSIssue[]): ATSIssue[] {
  const priority: Record<string, number> = { error: 0, warning: 1, success: 2, info: 3 };
  return [...issues].sort((a, b) => (priority[a.type] ?? 99) - (priority[b.type] ?? 99));
}

export class ATSService {
  private jobDescription: string = '';

  setJobDescription(description: string): void {
    this.jobDescription = description;
  }

  analyze(data: ResumeData): ATSResult {
    const issues: ATSIssue[] = [];
    const profile = this.detectResumeProfile(data);
    const weights = this.getWeights(profile);

    const breakdown: ATSScoreBreakdown = {
      structure: { score: 0, maxScore: 100, weight: weights.structure },
      keywords: { score: 0, maxScore: 100, weight: weights.keywords },
      contacts: { score: 0, maxScore: 100, weight: weights.contacts },
      format: { score: 0, maxScore: 100, weight: weights.format },
      dates: { score: 0, maxScore: 100, weight: weights.dates },
      experience: { score: 0, maxScore: 100, weight: weights.experience },
      education: { score: 0, maxScore: 100, weight: weights.education },
      summary: { score: 0, maxScore: 100, weight: weights.summary }
    };

    breakdown.structure.score = this.checkStructure(data, issues, profile);
    breakdown.contacts.score = this.checkContacts(data, issues);
    breakdown.keywords.score = this.checkKeywords(data, issues, profile);
    breakdown.format.score = this.checkFormat(data, issues);
    breakdown.dates.score = this.checkDates(data, issues);
    breakdown.experience.score = this.checkExperienceDetails(data, issues, profile);
    breakdown.education.score = this.checkEducation(data, issues, profile);
    breakdown.summary.score = this.checkSummary(data, issues, profile);

    let totalScore = 0;
    for (const key of Object.keys(breakdown) as Array<keyof typeof breakdown>) {
      const component = breakdown[key];
      if (!component) continue;
      totalScore += (component.score / component.maxScore) * component.weight * 100;
    }

    let finalScore = Math.min(100, Math.round(totalScore));
    if (!hasContactInformation(data)) {
      finalScore = Math.max(0, finalScore - 30);
    }

    if (finalScore >= 85) {
      issues.push({ type: 'success', message: 'Resume is ATS-friendly and optimized!', category: 'summary' });
    } else if (finalScore >= 70) {
      issues.push({ type: 'warning', message: 'Resume is good but can be improved', category: 'summary' });
    } else if (finalScore >= 50) {
      issues.push({ type: 'warning', message: 'Resume needs improvement for ATS filters', category: 'summary' });
    } else {
      issues.push({ type: 'error', message: 'Resume will likely be rejected by ATS systems', category: 'summary' });
    }

    // Sort issues by priority: errors first, then warnings, then success, then info
    const sortedIssues = sortIssuesByPriority(issues);
    return { score: finalScore, issues: sortedIssues, breakdown };
  }

  private detectResumeProfile(data: ResumeData): ResumeProfile {
    const text = collectResumeText(data).toLowerCase();
    const title = (data.personal.title || '').toLowerCase();
    const combinedText = `${title} ${text}`;
    const hasExperience = !!(data.experience && data.experience.length > 0);
    const hasEducation = !!(data.education && data.education.length > 0);
    const isStudentText = /\b(student|intern|graduate|studying|undergraduate|bachelor|master|msc|phd|course)\b/.test(combinedText);
    const isExplicitDesignText = /\b(ux designer|ui designer|user experience designer|user interface designer|interaction designer|visual designer|product designer|designer|UI\/UX|UX\/UI)\b/.test(combinedText);
    const isDesignKeywordText = /\b(prototyping|wireframing|user research|usability testing|interaction design|visual design|design system|persona|accessibility|typography)\b/.test(combinedText);
    const isDesignText = isExplicitDesignText || isDesignKeywordText;
    const isManagementText = /\b(marketing manager|marketing director|brand manager|product manager|project manager|operations manager|strategy|campaign|leadership|budget|roi|stakeholder|kpi|growth|communications|team lead|director|vp|chief)\b/.test(combinedText);
    const isTechnicalText = /\b(typescript|javascript|python|java|c\+\+|c#|go|rust|ruby|php|swift|kotlin|scala|react|vue|angular|node|django|flask|aws|azure|gcp|docker|kubernetes|machine learning|data science|sql|html|css|figma|sketch|adobe xd|photoshop|illustrator|software engineer|full stack|frontend|front end|backend|back end|devops|data engineer|data scientist|machine learning engineer|programmer|architect)\b/.test(combinedText);
    const projectEvidence = hasProjectEvidence(data);

    if (!hasExperience && (isStudentText || (hasEducation && projectEvidence))) {
      return 'student';
    }
    if (isTechnicalText && !isExplicitDesignText) {
      return 'technical';
    }
    if (isManagementText) {
      return 'management';
    }
    if (isDesignText) {
      return 'design';
    }
    return 'other';
  }

  private getWeights(profile: ResumeProfile): ProfileWeights {
    return PROFILE_WEIGHTS[profile] || PROFILE_WEIGHTS.other;
  }

  private checkStructure(data: ResumeData, issues: ATSIssue[], profile: ResumeProfile): number {
    let score = 0;
    const maxPerSection = 100 / Object.keys(REQUIRED_SECTIONS).length;

    const hasContacts = !!(data.personal.email || data.personal.phone || data.personal.linkedin || data.personal.location || data.personal.name);
    if (hasContacts) {
      score += maxPerSection;
      issues.push({ type: 'success', message: 'Contact section present', category: 'structure' });
    } else {
      issues.push({ type: 'error', message: 'No contact information section present', category: 'structure' });
    }

    const hasSummary = !!(data.personal.title && data.personal.title.trim().length > 0);
    if (hasSummary) {
      score += maxPerSection;
      issues.push({ type: 'success', message: 'Summary/Title section filled', category: 'structure' });
    } else {
      issues.push({ type: 'error', message: 'Missing Summary section', category: 'structure' });
    }

    const hasExperience = !!(data.experience && data.experience.length > 0);
    const hasProjects = hasProjectEvidence(data);
    const successfulStudentExperience = profile === 'student' && !hasExperience && hasProjects && data.education.length > 0;

    if (hasExperience || successfulStudentExperience) {
      score += maxPerSection;
      issues.push({
        type: 'success',
        message: successfulStudentExperience
          ? 'Projects and education compensate for lack of formal experience'
          : 'Experience section present',
        category: 'structure'
      });
    } else if (hasProjects) {
      // Projects are real, verifiable work and should not score as an empty
      // resume - but they are not employment either, and most postings screen
      // on employment history. Half credit, plus a clear next step.
      score += maxPerSection / 2;
      issues.push({
        type: 'warning',
        message: 'Projects are listed but work experience is missing. Add roles to the Experience section',
        category: 'structure'
      });
    } else {
      issues.push({
        type: 'error',
        message: 'No experience or projects listed',
        category: 'structure'
      });
    }

    const hasSkills = !!(data.skills && data.skills.length > 0);
    if (hasSkills) {
      score += maxPerSection;
      issues.push({ type: 'success', message: 'Skills section present', category: 'structure' });
    } else {
      issues.push({ type: 'error', message: 'Skills section is empty', category: 'structure' });
    }

    const hasEducation = !!(data.education && data.education.length > 0);
    if (hasEducation) {
      score += maxPerSection;
      issues.push({ type: 'success', message: 'Education section present', category: 'structure' });
    } else {
      // Silently scoring zero here left the user guessing which section to
      // fill in, which matters now that the GitHub import never invents one.
      issues.push({
        type: 'warning',
        message: 'Education section is empty. Add your degree or courses',
        category: 'structure'
      });
    }

    return Math.min(100, score);
  }

  private checkContacts(data: ResumeData, issues: ATSIssue[]): number {
    const contactMissing = !hasContactInformation(data);
    let score = 0;

    if (data.personal.email && data.personal.email.trim().length > 0) {
      if (isValidEmail(data.personal.email)) {
        score += 30;
        issues.push({ type: 'success', message: 'Email is valid', category: 'contacts' });
      } else {
        issues.push({ type: 'error', message: 'Email is invalid', category: 'contacts' });
      }
    } else {
      issues.push({ type: 'error', message: 'Email is missing', category: 'contacts' });
    }

    if (data.personal.phone && data.personal.phone.trim().length > 0) {
      score += 20;
      issues.push({ type: 'success', message: 'Phone is provided', category: 'contacts' });
    } else {
      issues.push({ type: 'error', message: 'Phone is missing', category: 'contacts' });
    }

    if (data.personal.linkedin && data.personal.linkedin.trim().length > 0) {
      score += 15;
      issues.push({ type: 'success', message: 'LinkedIn is provided', category: 'contacts' });
    } else {
      // Recommended, not required: no ATS rejects a resume for lacking a
      // LinkedIn URL, so this must not read as a blocking error.
      issues.push({ type: 'warning', message: 'Missing LinkedIn', category: 'contacts' });
    }

    if (data.personal.github && data.personal.github.trim().length > 0) {
      score += 15;
      issues.push({ type: 'success', message: 'GitHub is provided', category: 'contacts' });
    }

    if (data.personal.location && data.personal.location.trim().length > 0) {
      score += 20;
      issues.push({ type: 'success', message: 'Location is provided', category: 'contacts' });
    } else {
      issues.push({ type: 'warning', message: 'Location is missing (recommended)', category: 'contacts' });
    }

    if (contactMissing) {
      issues.push({ type: 'error', message: 'No contact information found', category: 'contacts' });
      return 0;
    }

    return Math.max(0, Math.min(100, score));
  }

  private checkKeywords(data: ResumeData, issues: ATSIssue[], profile: ResumeProfile): number {
    const resumeText = collectResumeText(data);
    const keywordList = getKeywordList(profile);
    const keywordAnalysis = calculateKeywordMatch(resumeText, this.jobDescription, keywordList);
    let score = keywordAnalysis.matchPercentage;
    const foundCount = keywordAnalysis.foundKeywords.length;

    if (this.jobDescription && this.jobDescription.trim().length > 0) {
      issues.push({
        type: 'success',
        message: `Found ${foundCount} keywords from the job description`,
        category: 'keywords'
      });
      if (keywordAnalysis.missingKeywords.length > 0 && keywordAnalysis.missingKeywords.length <= 5) {
        issues.push({
          type: 'warning',
          message: `Add these keywords from job description: ${keywordAnalysis.missingKeywords.slice(0, 3).join(', ')}`,
          category: 'keywords'
        });
      }
    } else {
      if (profile === 'management' || profile === 'other') {
        // The advice has to name the vocabulary this profile is actually
        // scored against, otherwise the user is asked to add keywords that
        // earn them nothing.
        const advice = profile === 'management'
          ? 'Add leadership, strategy, budget or stakeholder terms'
          : 'Name the tools, methods and domain terms used in your field';

        if (foundCount >= 3) {
          issues.push({
            type: 'success',
            message: `Strong keyword coverage (${foundCount} keywords found)`,
            category: 'keywords'
          });
          score = Math.max(score, 80);
        } else if (foundCount >= 1) {
          issues.push({
            type: 'warning',
            message: `Only ${foundCount} relevant keyword${foundCount > 1 ? 's' : ''} found. ${advice}`,
            category: 'keywords'
          });
          score = Math.max(score, 50);
        } else {
          issues.push({
            type: 'warning',
            message: `No role-relevant keywords found. ${advice}`,
            category: 'keywords'
          });
          score = Math.min(score, 40);
        }
      } else if (profile === 'design') {
        if (foundCount >= 5) {
          issues.push({
            type: 'success',
            message: `Strong design keyword coverage (${foundCount} keywords found)`,
            category: 'keywords'
          });
          score = Math.max(score, 85);
        } else if (foundCount >= 2) {
          issues.push({
            type: 'success',
            message: `Good design keyword presence (${foundCount} keywords)`,
            category: 'keywords'
          });
          score = Math.max(score, 70);
        } else {
          issues.push({
            type: 'warning',
            message: 'Add UX/UI and product design keywords like Figma, prototyping, wireframing, user research',
            category: 'keywords'
          });
          score = Math.min(score, 50);
        }
      } else {
        if (foundCount >= 5) {
          issues.push({
            type: 'success',
            message: `strong keywords presence (${foundCount} technical keywords found)`,
            category: 'keywords'
          });
          score = Math.max(score, 90);
        } else if (foundCount >= 3) {
          issues.push({
            type: 'success',
            message: `Good technical keywords presence (${foundCount} keywords)`,
            category: 'keywords'
          });
          score = Math.max(score, 70);
        } else if (foundCount >= 1) {
          issues.push({
            type: 'warning',
            message: `Only ${foundCount} technical keywords found. Add more technical keywords to improve ATS score`,
            category: 'keywords'
          });
        } else {
          issues.push({
            type: 'error',
            message: 'No technical keywords found. Add more technical keywords to your resume',
            category: 'keywords'
          });
          score = Math.min(score, 30);
        }

        if (foundCount < 3) {
          issues.push({
            type: 'warning',
            message: 'Add more technical keywords related to your field',
            category: 'keywords'
          });
        }
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  private checkFormat(data: ResumeData, issues: ATSIssue[]): number {
    let score = 100;
    const fullText = collectResumeText(data);

    // --- Action verbs ---
    if (!hasActionVerbs(fullText)) {
      score -= 15;
      issues.push({
        type: 'warning',
        message: 'Use action verbs (developed, created, implemented) in experience descriptions',
        category: 'format'
      });
    } else {
      issues.push({
        type: 'success',
        message: 'Action verbs used in experience descriptions',
        category: 'format'
      });
    }

    // --- Summary length ---
    const summaryWordCount = countWords(data.personal.title || '');
    if (summaryWordCount > 0) {
      if (summaryWordCount >= 3 && summaryWordCount <= 50) {
        issues.push({
          type: 'success',
          message: 'Summary length is optimal',
          category: 'format'
        });
      } else if (summaryWordCount < 3) {
        score -= 10;
        issues.push({
          type: 'warning',
          message: 'Summary is too short',
          category: 'format'
        });
      } else {
        score -= 5;
        issues.push({
          type: 'warning',
          message: 'Summary is too long. Recommended 3-50 words',
          category: 'format'
        });
      }
    } else {
      score -= 15;
      issues.push({
        type: 'warning',
        message: 'Summary is missing or empty',
        category: 'format'
      });
    }

    // --- Quantifiable achievements ---
    const allDescriptions = [
      ...(data.experience || []).flatMap(e => e.description || []),
      ...(data.education || []).flatMap(e => e.description || []),
      ...(data.projects || []).flatMap(e => e.description || [])
    ];
    const quantCount = countQuantifiableAchievements(allDescriptions);
    const totalDesc = allDescriptions.length;

    if (totalDesc >= 2 && quantCount >= Math.ceil(totalDesc / 2)) {
      issues.push({
        type: 'success',
        message: 'Good use of quantifiable achievements (' + quantCount + ' items with numbers/metrics)',
        category: 'format'
      });
    } else if (quantCount > 0) {
      issues.push({
        type: 'warning',
        message: 'Only ' + quantCount + ' quantifiable achievements found. Add metrics (numbers, %, $) to strengthen impact',
        category: 'format'
      });
      if (score >= 70) score -= 10;
    } else if (totalDesc > 0) {
      issues.push({
        type: 'warning',
        message: 'No quantifiable achievements found. Use numbers, percentages, and metrics to show impact',
        category: 'format'
      });
      score -= 15;
    }

    // --- Total content volume ---
    const wordCount = countWords(fullText);
    if (wordCount >= 200 && wordCount <= 800) {
      issues.push({
        type: 'success',
        message: 'Good resume length (' + wordCount + ' words)',
        category: 'format'
      });
    } else if (wordCount < 200) {
      issues.push({
        type: 'warning',
        message: 'Resume is too short (' + wordCount + ' words). Aim for 200-800 words',
        category: 'format'
      });
      if (score >= 60) score -= 10;
    } else {
      issues.push({
        type: 'warning',
        message: 'Resume is long (' + wordCount + ' words). Aim for 200-800 words to keep ATS parsing efficient',
        category: 'format'
      });
      if (score >= 60) score -= 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private checkDates(data: ResumeData, issues: ATSIssue[]): number {
    // Projects count as dated entries too. A GitHub-imported resume can be
    // all projects and no employment yet, and skipping them here would make
    // the whole date check silently return a free 100.
    const allEntities = [
      ...(data.experience || []),
      ...(data.education || []),
      ...(data.projects || [])
    ];
    const totalWithDates = allEntities.filter(e => e.period && e.period.trim().length > 0).length;
    const totalMissing = allEntities.length - totalWithDates;

    if (allEntities.length === 0) {
      issues.push({ type: 'info', message: 'No date-based entries to validate', category: 'dates' });
      return 100;
    }

    let score = 100;

    // --- All entries should have dates ---
    if (totalMissing > 0) {
      score -= totalMissing * 15;
      issues.push({
        type: 'error',
        message: 'Missing date period on ' + totalMissing + ' entr' + (totalMissing > 1 ? 'ies' : 'y'),
        category: 'dates'
      });
    }

    if (totalWithDates < 2) {
      if (score < 100) return Math.max(0, score);
      issues.push({ type: 'success', message: 'Dates present in entries', category: 'dates' });
      return 100;
    }

    // --- Parse periods, preserving the order they appear in on the resume ---
    type ParsedPeriod = { startYear: number | null; endYear: number | null; isCurrent: boolean; period: string };

    const parsePeriods = (entities: TimeBoundedEntity[]): ParsedPeriod[] => {
      const result: ParsedPeriod[] = [];
      for (const entity of entities) {
        if (!entity.period || !entity.period.trim()) continue;
        const { start, end, isCurrent } = parsePeriodRange(entity.period);
        result.push({ startYear: start.year, endYear: end.year, isCurrent, period: entity.period });
      }
      return result;
    };

    const parsedExperience = parsePeriods(data.experience || []);
    const parsedEducation = parsePeriods(data.education || []);
    const parsedProjects = parsePeriods(data.projects || []);
    const parsed = [...parsedExperience, ...parsedEducation, ...parsedProjects];

    // Check for inconsistent format patterns
    const formats = new Set<string>();
    for (const p of parsed) {
      const years = p.period.match(/\d{4}/g)?.length ?? 0;
      const hasMonth = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\b/i.test(p.period) || /^\d{1,2}\//.test(p.period);
      // "2020 - Present" is a range even though it carries a single year:
      // an open-ended current role must not be reported as a format mismatch.
      const isRange = years >= 2 || (years === 1 && p.isCurrent);
      formats.add(isRange ? 'range' : years === 1 ? (hasMonth ? 'month-year' : 'year-only') : 'other');
    }
    if (formats.size > 1) {
      score -= 15;
      issues.push({
        type: 'warning',
        message: 'Inconsistent date formats detected. Use consistent format (e.g. "Jan 2020 – Present")',
        category: 'dates'
      });
    }

    // Check for chronological gaps.
    // Walk newest-first: a gap is the distance between an older entry's end
    // year and the start year of the next, more recent entry.
    // Only real employment and education can leave a gap in a career history.
    // Side projects start and stop whenever, so a quiet year between two of
    // them is not something a recruiter would ask about.
    const timeline = [...parsedExperience, ...parsedEducation];
    const byRecency = [...timeline].sort((a, b) => (b.startYear ?? 0) - (a.startYear ?? 0));
    let gapIssues = 0;
    for (let i = 0; i < byRecency.length - 1; i++) {
      const newer = byRecency[i];
      const older = byRecency[i + 1];
      if (newer.startYear === null || older.endYear === null) continue;
      const gap = newer.startYear - older.endYear;
      if (gap > 1) {
        gapIssues++;
        if (gapIssues <= 2) {
          issues.push({
            type: 'warning',
            message: 'Potential employment gap of ' + gap + ' year' + (gap > 1 ? 's' : '') + ' between periods',
            category: 'dates'
          });
        }
        score -= 10;
      }
    }

    if (gapIssues > 2) {
      issues.push({
        type: 'info',
        message: gapIssues + ' gap' + (gapIssues > 1 ? 's' : '') + ' detected; consider explaining in resume',
        category: 'dates'
      });
    }

    // Check for chronological order violations.
    // This must inspect the order the entries are listed in on the resume;
    // checking a recency-sorted copy could never fail. Experience and
    // education are separate sections, so each is validated on its own.
    const isOutOfOrder = (entries: ParsedPeriod[]): boolean => {
      for (let i = 0; i < entries.length - 1; i++) {
        const current = entries[i];
        const next = entries[i + 1];
        if (current.startYear === null || next.startYear === null) continue;
        // A current ("Present") role always belongs at the top.
        if (current.startYear < next.startYear) return true;
      }
      return false;
    };
    const outOfOrder =
      isOutOfOrder(parsedExperience) ||
      isOutOfOrder(parsedEducation) ||
      isOutOfOrder(parsedProjects);
    if (outOfOrder) {
      score -= 20;
      issues.push({
        type: 'error',
        message: 'Entries not in reverse chronological order. Start with most recent',
        category: 'dates'
      });
    }

    if (score >= 80 && totalMissing === 0 && !outOfOrder && gapIssues === 0) {
      issues.push({
        type: 'success',
        message: 'Dates are well-formatted and chronological',
        category: 'dates'
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  private checkExperienceDetails(data: ResumeData, issues: ATSIssue[], profile: ResumeProfile): number {
    const hasExperience = !!(data.experience && data.experience.length > 0);
    const hasProjects = hasProjectEvidence(data);

    if (!hasExperience) {
      if (profile === 'student') {
        if (hasProjects && data.education.length > 0) {
          issues.push({
            type: 'success',
            message: 'Student resume includes project evidence',
            category: 'experience'
          });
          return 100;
        }

        issues.push({
          type: 'error',
          message: 'Student resume is missing both experience and project evidence',
          category: 'experience'
        });
        return 0;
      }

      issues.push({
        type: 'error',
        message: 'Experience section is empty',
        category: 'experience'
      });
      return 0;
    }

    // Start with base score from count
    let score = 0;
    if (data.experience.length >= 3) {
      score = 60;
      issues.push({
        type: 'success',
        message: 'Sufficient work experience (3+ positions)',
        category: 'experience'
      });
    } else {
      score = 40;
      issues.push({
        type: 'success',
        message: 'Has ' + data.experience.length + ' position' + (data.experience.length > 1 ? 's' : ''),
        category: 'experience'
      });
    }

    // --- Description quality check ---
    let totalDescriptions = 0;
    let withActionVerbs = 0;
    let withQuantified = 0;
    let totalWords = 0;

    for (const exp of data.experience) {
      const descs = exp.description || [];
      totalDescriptions += descs.length;
      for (const desc of descs) {
        totalWords += countWords(desc);
        if (hasActionVerbs(desc)) {
          withActionVerbs++;
        }
        if (isQuantified(desc)) {
          withQuantified++;
        }
      }
    }

    if (totalDescriptions === 0) {
      issues.push({
        type: 'error',
        message: 'Experience entries have no descriptions',
        category: 'experience'
      });
      return Math.max(0, score - 30);
    }

    const avgWordsPerDesc = totalWords / Math.max(totalDescriptions, 1);

    // Action verb coverage
    if (totalDescriptions > 0 && withActionVerbs >= totalDescriptions * 0.5) {
      score += 20;
      issues.push({
        type: 'success',
        message: 'Most descriptions start with strong action verbs',
        category: 'experience'
      });
    } else if (withActionVerbs > 0) {
      score += 10;
      issues.push({
        type: 'warning',
        message: 'Only ' + withActionVerbs + '/' + totalDescriptions + ' descriptions use action verbs - aim for all',
        category: 'experience'
      });
    }

    // Quantified achievements
    if (totalDescriptions > 0 && withQuantified >= Math.ceil(totalDescriptions / 2)) {
      score += 20;
      issues.push({
        type: 'success',
        message: withQuantified + ' description' + (withQuantified > 1 ? 's' : '') + ' include quantifiable achievements',
        category: 'experience'
      });
    } else if (withQuantified > 0) {
      score += 10;
      issues.push({
        type: 'warning',
        message: 'Only ' + withQuantified + '/' + totalDescriptions + ' descriptions have metrics. Add numbers to show impact',
        category: 'experience'
      });
    } else if (totalDescriptions > 0) {
      issues.push({
        type: 'warning',
        message: 'No quantified achievements. Add metrics (%, $, numbers) to strengthen your impact',
        category: 'experience'
      });
    }

    // Description length quality
    if (avgWordsPerDesc >= 12 && avgWordsPerDesc <= 30) {
      score += 10;
      issues.push({
        type: 'success',
        message: 'Optimal description length (avg ' + Math.round(avgWordsPerDesc) + ' words per bullet)',
        category: 'experience'
      });
    } else if (avgWordsPerDesc < 8) {
      score -= 5;
      issues.push({
        type: 'warning',
        message: 'Descriptions too short (avg ' + Math.round(avgWordsPerDesc) + ' words). Add more detail',
        category: 'experience'
      });
    } else if (avgWordsPerDesc > 40) {
      score -= 5;
      issues.push({
        type: 'warning',
        message: 'Descriptions too verbose (avg ' + Math.round(avgWordsPerDesc) + ' words). Keep concise',
        category: 'experience'
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  /**
   * The headline/title is the first thing a recruiter reads and the field the
   * GitHub import is least able to fill in well (it derives from the bio).
   * The breakdown has always advertised a "Summary" component to the user, so
   * it now carries a real, weighted score instead of a permanent zero bar.
   */
  private checkSummary(data: ResumeData, issues: ATSIssue[], profile: ResumeProfile): number {
    const title = (data.personal.title || '').trim();

    if (!title) {
      issues.push({
        type: 'error',
        message: 'Professional headline is empty. Add a title such as "Backend Engineer, Python and Go"',
        category: 'summary'
      });
      return 0;
    }

    let score = 60;
    const words = countWords(title);

    if (words < 2) {
      score -= 25;
      issues.push({
        type: 'warning',
        message: `Headline "${title}" is too vague on its own. Name your role and main specialisation`,
        category: 'summary'
      });
    } else if (words > 30) {
      score -= 15;
      issues.push({
        type: 'warning',
        message: `Headline is ${words} words long. Trim it to a scannable role statement`,
        category: 'summary'
      });
    } else {
      issues.push({
        type: 'success',
        message: 'Professional headline is present',
        category: 'summary'
      });
    }

    // A headline earns its weight when it repeats the vocabulary the rest of
    // the resume is scored on, because that is the line recruiters skim.
    const keywordsInTitle = getKeywordList(profile).filter(keyword => containsTerm(title, keyword));
    if (keywordsInTitle.length >= 2) {
      score += 40;
      issues.push({
        type: 'success',
        message: `Headline names relevant skills (${keywordsInTitle.slice(0, 3).join(', ')})`,
        category: 'summary'
      });
    } else if (keywordsInTitle.length === 1) {
      score += 20;
      issues.push({
        type: 'warning',
        message: `Headline mentions only "${keywordsInTitle[0]}". Add one more core skill to it`,
        category: 'summary'
      });
    } else {
      issues.push({
        type: 'warning',
        message: 'Headline contains no role-specific keywords. Recruiters skim this line first',
        category: 'summary'
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  private checkEducation(data: ResumeData, issues: ATSIssue[], profile: ResumeProfile): number {
    if (data.education && data.education.length > 0) {
      issues.push({
        type: 'success',
        message: 'Education section is present',
        category: 'education'
      });
      return 100;
    }

    if (profile === 'student') {
      issues.push({
        type: 'error',
        message: 'Student profile should include education information',
        category: 'education'
      });
      return 0;
    }

    issues.push({
      type: 'warning',
      message: 'Education section is missing. Add relevant degrees or certifications',
      category: 'education'
    });
    return 50;
  }
}
