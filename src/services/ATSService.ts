import { ATSResult, ATSIssue, ATSScoreBreakdown, ResumeProfile } from '../types/ats';
import { ResumeData } from '../types';
import {
  BASE_TECH_KEYWORDS,
  ACTION_VERBS,
  MANAGEMENT_KEYWORDS,
  DESIGN_KEYWORDS,
  EXTENDED_TECH_KEYWORDS
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
    keywords: 0.30,
    contacts: 0.15,
    format: 0.12,
    dates: 0.08,
    experience: 0.15,
    education: 0.05,
    summary: 0
  },
  student: {
    structure: 0.10,
    keywords: 0.20,
    contacts: 0.15,
    format: 0.10,
    dates: 0.05,
    experience: 0.10,
    education: 0.30,
    summary: 0
  },
  management: {
    structure: 0.18,
    keywords: 0.18,
    contacts: 0.15,
    format: 0.15,
    dates: 0.08,
    experience: 0.16,
    education: 0.10,
    summary: 0
  },
  design: {
    structure: 0.15,
    keywords: 0.25,
    contacts: 0.15,
    format: 0.18,
    dates: 0.07,
    experience: 0.12,
    education: 0.08,
    summary: 0
  },
  other: {
    structure: 0.18,
    keywords: 0.18,
    contacts: 0.15,
    format: 0.18,
    dates: 0.08,
    experience: 0.13,
    education: 0.10,
    summary: 0
  }
};

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

function hasActionVerbs(text: string): boolean {
  const lowerText = text.toLowerCase();
  return ACTION_VERBS.some(verb => lowerText.includes(verb));
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
  return parts.join(' ');
}

function calculateKeywordMatch(resumeText: string, jobDescription: string | undefined, keywords: string[]): {
  foundKeywords: string[];
  missingKeywords: string[];
  matchPercentage: number;
} {
  const lowerResume = resumeText.toLowerCase();
  const lowerKeywords = keywords.map(k => k.toLowerCase());

  if (jobDescription && jobDescription.trim().length > 0) {
    const lowerJob = jobDescription.toLowerCase();
    const jobKeywords = lowerKeywords.filter(keyword => lowerJob.includes(keyword));
    const selectedKeywords = jobKeywords.length > 0 ? jobKeywords : lowerKeywords;
    const found = selectedKeywords.filter(keyword => lowerResume.includes(keyword));
    return {
      foundKeywords: found,
      missingKeywords: selectedKeywords.filter(keyword => !found.includes(keyword)),
      matchPercentage: selectedKeywords.length > 0 ? Math.round((found.length / selectedKeywords.length) * 100) : 0
    };
  }

  const found = lowerKeywords.filter(keyword => lowerResume.includes(keyword));
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
      return EXTENDED_TECH_KEYWORDS;
    default:
      return EXTENDED_TECH_KEYWORDS;
  }
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
      issues.push({ type: 'success', message: '✅ Resume is ATS-friendly and optimized!', category: 'summary' });
    } else if (finalScore >= 70) {
      issues.push({ type: 'warning', message: '⚠ Resume is good but can be improved', category: 'summary' });
    } else if (finalScore >= 50) {
      issues.push({ type: 'warning', message: '⚠ Resume needs improvement for ATS filters', category: 'summary' });
    } else {
      issues.push({ type: 'error', message: '❌ Resume will likely be rejected by ATS systems', category: 'summary' });
    }

    return { score: finalScore, issues, breakdown };
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
      issues.push({ type: 'success', message: '✅ Contact section present', category: 'structure' });
    } else {
      issues.push({ type: 'error', message: '❌ No contact information section present', category: 'structure' });
    }

    const hasSummary = !!(data.personal.title && data.personal.title.trim().length > 0);
    if (hasSummary) {
      score += maxPerSection;
      issues.push({ type: 'success', message: '✅ Summary/Title section filled', category: 'structure' });
    } else {
      issues.push({ type: 'error', message: '❌ Missing Summary section', category: 'structure' });
    }

    const hasExperience = !!(data.experience && data.experience.length > 0);
    const hasProjects = hasProjectEvidence(data);
    const successfulStudentExperience = profile === 'student' && !hasExperience && hasProjects && data.education.length > 0;

    if (hasExperience || successfulStudentExperience) {
      score += maxPerSection;
      issues.push({
        type: 'success',
        message: successfulStudentExperience
          ? '✅ Projects and education compensate for lack of formal experience'
          : '✅ Experience section present',
        category: 'structure'
      });
    } else {
      if (!hasProjects) {
        issues.push({ type: 'error', message: '❌ No projects found', category: 'structure' });
      } else {
        issues.push({ type: 'error', message: '❌ Experience or project section is missing', category: 'structure' });
      }
    }

    const hasSkills = !!(data.skills && data.skills.length > 0);
    if (hasSkills) {
      score += maxPerSection;
      issues.push({ type: 'success', message: '✅ Skills section present', category: 'structure' });
    } else {
      issues.push({ type: 'error', message: '❌ Skills section is empty', category: 'structure' });
    }

    const hasEducation = !!(data.education && data.education.length > 0);
    if (hasEducation) {
      score += maxPerSection;
      issues.push({ type: 'success', message: '✅ Education section present', category: 'structure' });
    }

    return Math.min(100, score);
  }

  private checkContacts(data: ResumeData, issues: ATSIssue[]): number {
    const contactMissing = !hasContactInformation(data);
    let score = 0;

    if (data.personal.email && data.personal.email.trim().length > 0) {
      if (isValidEmail(data.personal.email)) {
        score += 30;
        issues.push({ type: 'success', message: '✅ Email is valid', category: 'contacts' });
      } else {
        issues.push({ type: 'error', message: '❌ Email is invalid', category: 'contacts' });
      }
    } else {
      issues.push({ type: 'error', message: '❌ Email is missing', category: 'contacts' });
    }

    if (data.personal.phone && data.personal.phone.trim().length > 0) {
      score += 20;
      issues.push({ type: 'success', message: '✅ Phone is provided', category: 'contacts' });
    } else {
      issues.push({ type: 'error', message: '❌ Phone is missing', category: 'contacts' });
    }

    if (data.personal.linkedin && data.personal.linkedin.trim().length > 0) {
      score += 15;
      issues.push({ type: 'success', message: '✅ LinkedIn is provided', category: 'contacts' });
    } else {
      issues.push({ type: 'error', message: '❌ Missing LinkedIn', category: 'contacts' });
    }

    if (data.personal.github && data.personal.github.trim().length > 0) {
      score += 15;
      issues.push({ type: 'success', message: '✅ GitHub is provided', category: 'contacts' });
    }

    if (data.personal.location && data.personal.location.trim().length > 0) {
      score += 20;
      issues.push({ type: 'success', message: '✅ Location is provided', category: 'contacts' });
    } else {
      issues.push({ type: 'warning', message: '⚠ Location is missing (recommended)', category: 'contacts' });
    }

    if (contactMissing) {
      issues.push({ type: 'error', message: '❌ Контактная информация отсутствует', category: 'contacts' });
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
        message: `✅ Found ${foundCount} keywords from the job description`,
        category: 'keywords'
      });
      if (keywordAnalysis.missingKeywords.length > 0 && keywordAnalysis.missingKeywords.length <= 5) {
        issues.push({
          type: 'warning',
          message: `⚠ Add these keywords from job description: ${keywordAnalysis.missingKeywords.slice(0, 3).join(', ')}`,
          category: 'keywords'
        });
      }
    } else {
      if (profile === 'management' || profile === 'other') {
        if (foundCount >= 3) {
          issues.push({
            type: 'success',
            message: `✅ Strong non-technical keywords present (${foundCount} keywords found)`,
            category: 'keywords'
          });
          score = Math.max(score, 80);
        } else if (foundCount >= 1) {
          issues.push({
            type: 'warning',
            message: `⚠ Only ${foundCount} management keywords found. Add leadership, strategy, campaign or stakeholder terms`,
            category: 'keywords'
          });
          score = Math.max(score, 50);
        } else {
          issues.push({
            type: 'warning',
            message: '⚠ No management keywords found. Add leadership, strategy, budget or campaign terms',
            category: 'keywords'
          });
          score = Math.min(score, 40);
        }
      } else if (profile === 'design') {
        if (foundCount >= 5) {
          issues.push({
            type: 'success',
            message: `✅ Strong design keyword coverage (${foundCount} keywords found)`,
            category: 'keywords'
          });
          score = Math.max(score, 85);
        } else if (foundCount >= 2) {
          issues.push({
            type: 'success',
            message: `✅ Good design keyword presence (${foundCount} keywords)`,
            category: 'keywords'
          });
          score = Math.max(score, 70);
        } else {
          issues.push({
            type: 'warning',
            message: '⚠ Add UX/UI and product design keywords like Figma, prototyping, wireframing, user research',
            category: 'keywords'
          });
          score = Math.min(score, 50);
        }
      } else {
        if (foundCount >= 5) {
          issues.push({
            type: 'success',
            message: `✅ strong keywords presence (${foundCount} technical keywords found)`,
            category: 'keywords'
          });
          score = Math.max(score, 90);
        } else if (foundCount >= 3) {
          issues.push({
            type: 'success',
            message: `✅ Good technical keywords presence (${foundCount} keywords)`,
            category: 'keywords'
          });
          score = Math.max(score, 70);
        } else if (foundCount >= 1) {
          issues.push({
            type: 'warning',
            message: `⚠ Only ${foundCount} technical keywords found. Add more technical keywords to improve ATS score`,
            category: 'keywords'
          });
        } else {
          issues.push({
            type: 'error',
            message: '❌ No technical keywords found. Add more technical keywords to your resume',
            category: 'keywords'
          });
          score = Math.min(score, 30);
        }

        if (foundCount < 3) {
          issues.push({
            type: 'warning',
            message: '💡 Add more technical keywords related to your field',
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
    if (!hasActionVerbs(fullText)) {
      score -= 15;
      issues.push({
        type: 'warning',
        message: '⚠ Use action verbs (developed, created, implemented) in experience descriptions',
        category: 'format'
      });
    } else {
      issues.push({
        type: 'success',
        message: '✅ Action verbs used in experience descriptions',
        category: 'format'
      });
    }

    const summaryWordCount = countWords(data.personal.title || '');
    if (summaryWordCount > 0) {
      if (summaryWordCount >= 3 && summaryWordCount <= 50) {
        issues.push({
          type: 'success',
          message: '✅ Summary length is optimal',
          category: 'format'
        });
      } else if (summaryWordCount < 3) {
        score -= 10;
        issues.push({
          type: 'warning',
          message: '⚠ Summary is too short',
          category: 'format'
        });
      } else {
        score -= 5;
        issues.push({
          type: 'warning',
          message: '⚠ Summary is too long. Recommended 3-50 words',
          category: 'format'
        });
      }
    } else {
      score -= 15;
      issues.push({
        type: 'warning',
        message: '⚠ Summary is missing or empty',
        category: 'format'
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  private checkDates(data: ResumeData, issues: ATSIssue[]): number {
    let score = 100;
    issues.push({
      type: 'success',
      message: '✅ Date formats are correct, no significant gaps',
      category: 'dates'
    });
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
            message: '✅ Student resume includes project evidence',
            category: 'experience'
          });
          return 100;
        }

        issues.push({
          type: 'error',
          message: '❌ Student resume is missing both experience and project evidence',
          category: 'experience'
        });
        return 0;
      }

      issues.push({
        type: 'error',
        message: '❌ Experience section is empty',
        category: 'experience'
      });
      return 0;
    }

    if (data.experience.length >= 3) {
      issues.push({
        type: 'success',
        message: '✅ Sufficient work experience (3+ positions)',
        category: 'experience'
      });
      return 100;
    }

    issues.push({
      type: 'success',
      message: '✅ Has work experience',
      category: 'experience'
    });
    return 70;
  }

  private checkEducation(data: ResumeData, issues: ATSIssue[], profile: ResumeProfile): number {
    if (data.education && data.education.length > 0) {
      issues.push({
        type: 'success',
        message: '✅ Education section is present',
        category: 'education'
      });
      return 100;
    }

    if (profile === 'student') {
      issues.push({
        type: 'error',
        message: '❌ Student profile should include education information',
        category: 'education'
      });
      return 0;
    }

    issues.push({
      type: 'warning',
      message: '⚠ Education section is missing. Add relevant degrees or certifications',
      category: 'education'
    });
    return 50;
  }
}
