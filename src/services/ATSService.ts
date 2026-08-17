import { ATSResult, ATSIssue, ATSScoreBreakdown, ResumeProfile } from '../types/ats';
import { ResumeData } from '../types';
import { t } from '../i18n/index';
import {
  BASE_TECH_KEYWORDS,
  ACTION_VERBS,
  MANAGEMENT_KEYWORDS,
  DESIGN_KEYWORDS,
  EXTENDED_TECH_KEYWORDS
} from '../config/ats-keywords';

// Translation keys for ATS messages (instead of hardcoded English strings)
const ATS_MESSAGES = {
  // Structure messages
  CONTACT_SECTION_PRESENT: 'ats_checker.messages.contact_section_present',
  CONTACT_SECTION_MISSING: 'ats_checker.messages.contact_section_missing',
  SUMMARY_TITLE_FILLED: 'ats_checker.messages.summary_title_filled',
  MISSING_SUMMARY_SECTION: 'ats_checker.messages.missing_summary_section',
  EXPERIENCE_SECTION_PRESENT: 'ats_checker.messages.experience_section_present',
  EXPERIENCE_SECTION_MISSING: 'ats_checker.messages.experience_section_missing',
  NO_PROJECTS_FOUND: 'ats_checker.messages.no_projects_found',
  PROJECTS_EDUCATION_COMPENSATE: 'ats_checker.messages.projects_education_compensate',
  SKILLS_SECTION_PRESENT: 'ats_checker.messages.skills_section_present',
  SKILLS_SECTION_MISSING: 'ats_checker.messages.skills_section_missing',
  EDUCATION_SECTION_PRESENT: 'ats_checker.messages.education_section_present',
  // Contact messages
  EMAIL_VALID: 'ats_checker.messages.email_valid',
  EMAIL_INVALID: 'ats_checker.messages.email_invalid',
  EMAIL_MISSING: 'ats_checker.messages.email_missing',
  PHONE_PROVIDED: 'ats_checker.messages.phone_provided',
  PHONE_MISSING: 'ats_checker.messages.phone_missing',
  LINKEDIN_PROVIDED: 'ats_checker.messages.linkedin_provided',
  LINKEDIN_MISSING: 'ats_checker.messages.linkedin_missing',
  GITHUB_PROVIDED: 'ats_checker.messages.github_provided',
  LOCATION_PROVIDED: 'ats_checker.messages.location_provided',
  LOCATION_MISSING: 'ats_checker.messages.location_missing',
  CONTACT_INFO_MISSING_RU: 'ats_checker.messages.contact_info_missing_ru',
  // Summary messages
  SUMMARY_LENGTH_OPTIMAL: 'ats_checker.messages.summary_length_optimal',
  SUMMARY_TOO_SHORT: 'ats_checker.messages.summary_too_short',
  SUMMARY_TOO_LONG: 'ats_checker.messages.summary_too_long',
  SUMMARY_MISSING: 'ats_checker.messages.summary_missing',
  // Resume score messages
  RESUME_ATS_FRIENDLY: 'ats_checker.messages.resume_ats_friendly',
  RESUME_GOOD_IMPROVE: 'ats_checker.messages.resume_good_improve',
  RESUME_NEEDS_IMPROVEMENT: 'ats_checker.messages.resume_needs_improvement',
  RESUME_REJECTED: 'ats_checker.messages.resume_rejected',
  // Keywords messages
  KEYWORDS_FOUND: 'ats_checker.messages.keywords_found',
  KEYWORDS_MISSING: 'ats_checker.messages.keywords_missing',
  KEYWORDS_FROM_JOB_DESCRIPTION: 'ats_checker.messages.keywords_from_job_description',
  ADD_KEYWORDS_FROM_JOB: 'ats_checker.messages.add_keywords_from_job',
  STRONG_NONTECHNICAL_KEYWORDS: 'ats_checker.messages.strong_nontechnical_keywords',
  ONLY_MANAGEMENT_KEYWORDS: 'ats_checker.messages.only_management_keywords',
  NO_MANAGEMENT_KEYWORDS: 'ats_checker.messages.no_management_keywords',
  STRONG_DESIGN_KEYWORDS: 'ats_checker.messages.strong_design_keywords',
  GOOD_DESIGN_KEYWORDS: 'ats_checker.messages.good_design_keywords',
  ADD_DESIGN_KEYWORDS: 'ats_checker.messages.add_design_keywords',
  STRONG_TECHNICAL_KEYWORDS: 'ats_checker.messages.strong_technical_keywords',
  GOOD_TECHNICAL_KEYWORDS: 'ats_checker.messages.good_technical_keywords',
  ONLY_TECHNICAL_KEYWORDS: 'ats_checker.messages.only_technical_keywords',
  NO_TECHNICAL_KEYWORDS: 'ats_checker.messages.no_technical_keywords',
  ADD_MORE_TECHNICAL_KEYWORDS: 'ats_checker.messages.add_more_technical_keywords',
  // Action verbs
  USE_ACTION_VERBS: 'ats_checker.messages.use_action_verbs',
  ACTION_VERBS_USED: 'ats_checker.messages.action_verbs_used',
  // Dates
  DATE_FORMATS_CORRECT: 'ats_checker.messages.date_formats_correct',
  // Experience
  STUDENT_PROJECT_EVIDENCE: 'ats_checker.messages.student_project_evidence',
  STUDENT_MISSING_EXPERIENCE_PROJECTS: 'ats_checker.messages.student_missing_experience_projects',
  EXPERIENCE_SECTION_EMPTY: 'ats_checker.messages.experience_section_empty',
  SUFFICIENT_WORK_EXPERIENCE: 'ats_checker.messages.sufficient_work_experience',
  HAS_WORK_EXPERIENCE: 'ats_checker.messages.has_work_experience',
  // Education
  STUDENT_SHOULD_INCLUDE_EDUCATION: 'ats_checker.messages.student_should_include_education',
  EDUCATION_SECTION_MISSING_ALT: 'ats_checker.messages.education_section_missing_alt',
  // Formatting
  FORMATTING_VALID: 'ats_checker.messages.formatting_valid',
  FORMATTING_ISSUES: 'ats_checker.messages.formatting_issues',
  // File size
  FILE_SIZE_OPTIMAL: 'ats_checker.messages.file_size_optimal',
  FILE_SIZE_TOO_LARGE: 'ats_checker.messages.file_size_too_large',
};

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
      issues.push({ type: 'success', message: t(ATS_MESSAGES.RESUME_ATS_FRIENDLY, 'Resume is ATS-friendly and optimized!'), category: 'summary' });
    } else if (finalScore >= 70) {
      issues.push({ type: 'warning', message: t(ATS_MESSAGES.RESUME_GOOD_IMPROVE, 'Resume is good but can be improved'), category: 'summary' });
    } else if (finalScore >= 50) {
      issues.push({ type: 'warning', message: t(ATS_MESSAGES.RESUME_NEEDS_IMPROVEMENT, 'Resume needs improvement for ATS filters'), category: 'summary' });
    } else {
      issues.push({ type: 'error', message: t(ATS_MESSAGES.RESUME_REJECTED, 'Resume will likely be rejected by ATS systems'), category: 'summary' });
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
      issues.push({ type: 'success', message: t(ATS_MESSAGES.CONTACT_SECTION_PRESENT, 'Contact section present'), category: 'structure' });
    } else {
      issues.push({ type: 'error', message: t(ATS_MESSAGES.CONTACT_SECTION_MISSING, 'No contact information section present'), category: 'structure' });
    }

    const hasSummary = !!(data.personal.title && data.personal.title.trim().length > 0);
    if (hasSummary) {
      score += maxPerSection;
      issues.push({ type: 'success', message: t(ATS_MESSAGES.SUMMARY_TITLE_FILLED, 'Summary/Title section filled'), category: 'structure' });
    } else {
      issues.push({ type: 'error', message: t(ATS_MESSAGES.MISSING_SUMMARY_SECTION, 'Missing Summary section'), category: 'structure' });
    }

    const hasExperience = !!(data.experience && data.experience.length > 0);
    const hasProjects = hasProjectEvidence(data);
    const successfulStudentExperience = profile === 'student' && !hasExperience && hasProjects && data.education.length > 0;

    if (hasExperience || successfulStudentExperience) {
      score += maxPerSection;
      issues.push({
        type: 'success',
        message: successfulStudentExperience
          ? t(ATS_MESSAGES.PROJECTS_EDUCATION_COMPENSATE, 'Projects and education compensate for lack of formal experience')
          : t(ATS_MESSAGES.EXPERIENCE_SECTION_PRESENT, 'Experience section present'),
        category: 'structure'
      });
    } else {
      if (!hasProjects) {
        issues.push({ type: 'error', message: t(ATS_MESSAGES.NO_PROJECTS_FOUND, 'No projects found'), category: 'structure' });
      } else {
        issues.push({ type: 'error', message: t(ATS_MESSAGES.EXPERIENCE_SECTION_MISSING, 'Experience or project section is missing'), category: 'structure' });
      }
    }

    const hasSkills = !!(data.skills && data.skills.length > 0);
    if (hasSkills) {
      score += maxPerSection;
      issues.push({ type: 'success', message: t(ATS_MESSAGES.SKILLS_SECTION_PRESENT, 'Skills section present'), category: 'structure' });
    } else {
      issues.push({ type: 'error', message: t(ATS_MESSAGES.SKILLS_SECTION_MISSING, 'Skills section is empty'), category: 'structure' });
    }

    const hasEducation = !!(data.education && data.education.length > 0);
    if (hasEducation) {
      score += maxPerSection;
      issues.push({ type: 'success', message: t(ATS_MESSAGES.EDUCATION_SECTION_PRESENT, 'Education section present'), category: 'structure' });
    }

    return Math.min(100, score);
  }

  private checkContacts(data: ResumeData, issues: ATSIssue[]): number {
    const contactMissing = !hasContactInformation(data);
    let score = 0;

    if (data.personal.email && data.personal.email.trim().length > 0) {
      if (isValidEmail(data.personal.email)) {
        score += 30;
        issues.push({ type: 'success', message: t(ATS_MESSAGES.EMAIL_VALID, 'Email is valid'), category: 'contacts' });
      } else {
        issues.push({ type: 'error', message: t(ATS_MESSAGES.EMAIL_INVALID, 'Email is invalid'), category: 'contacts' });
      }
    } else {
      issues.push({ type: 'error', message: t(ATS_MESSAGES.EMAIL_MISSING, 'Email is missing'), category: 'contacts' });
    }

    if (data.personal.phone && data.personal.phone.trim().length > 0) {
      score += 20;
      issues.push({ type: 'success', message: t(ATS_MESSAGES.PHONE_PROVIDED, 'Phone is provided'), category: 'contacts' });
    } else {
      issues.push({ type: 'error', message: t(ATS_MESSAGES.PHONE_MISSING, 'Phone is missing'), category: 'contacts' });
    }

    if (data.personal.linkedin && data.personal.linkedin.trim().length > 0) {
      score += 15;
      issues.push({ type: 'success', message: t(ATS_MESSAGES.LINKEDIN_PROVIDED, 'LinkedIn is provided'), category: 'contacts' });
    } else {
      issues.push({ type: 'error', message: t(ATS_MESSAGES.LINKEDIN_MISSING, 'Missing LinkedIn'), category: 'contacts' });
    }

    if (data.personal.github && data.personal.github.trim().length > 0) {
      score += 15;
      issues.push({ type: 'success', message: t(ATS_MESSAGES.GITHUB_PROVIDED, 'GitHub is provided'), category: 'contacts' });
    }

    if (data.personal.location && data.personal.location.trim().length > 0) {
      score += 20;
      issues.push({ type: 'success', message: t(ATS_MESSAGES.LOCATION_PROVIDED, 'Location is provided'), category: 'contacts' });
    } else {
      issues.push({ type: 'warning', message: t(ATS_MESSAGES.LOCATION_MISSING, 'Location is missing (recommended)'), category: 'contacts' });
    }

    if (contactMissing) {
      issues.push({ type: 'error', message: t(ATS_MESSAGES.CONTACT_INFO_MISSING_RU, 'Контактная информация отсутствует'), category: 'contacts' });
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
        message: t(ATS_MESSAGES.KEYWORDS_FROM_JOB_DESCRIPTION.replace('{count}', String(foundCount)), `Found ${foundCount} keywords from the job description`),
        category: 'keywords'
      });
      if (keywordAnalysis.missingKeywords.length > 0 && keywordAnalysis.missingKeywords.length <= 5) {
        issues.push({
          type: 'warning',
          message: `${t(ATS_MESSAGES.ADD_KEYWORDS_FROM_JOB)} ${keywordAnalysis.missingKeywords.slice(0, 3).join(', ')}`,
          category: 'keywords'
        });
      }
    } else {
      if (profile === 'management' || profile === 'other') {
        if (foundCount >= 3) {
          issues.push({
            type: 'success',
            message: t(ATS_MESSAGES.STRONG_NONTECHNICAL_KEYWORDS.replace('{count}', String(foundCount)), `Strong non-technical keywords present (${foundCount} keywords found)`),
            category: 'keywords'
          });
          score = Math.max(score, 80);
        } else if (foundCount >= 1) {
          issues.push({
            type: 'warning',
            message: t(ATS_MESSAGES.ONLY_MANAGEMENT_KEYWORDS.replace('{count}', String(foundCount)), `Only ${foundCount} management keywords found. Add leadership, strategy, campaign or stakeholder terms`),
            category: 'keywords'
          });
          score = Math.max(score, 50);
        } else {
          issues.push({
            type: 'warning',
            message: t(ATS_MESSAGES.NO_MANAGEMENT_KEYWORDS, 'No management keywords found. Add leadership, strategy, budget or campaign terms'),
            category: 'keywords'
          });
          score = Math.min(score, 40);
        }
      } else if (profile === 'design') {
        if (foundCount >= 5) {
          issues.push({
            type: 'success',
            message: t(ATS_MESSAGES.STRONG_DESIGN_KEYWORDS.replace('{count}', String(foundCount)), `Strong design keyword coverage (${foundCount} keywords found)`),
            category: 'keywords'
          });
          score = Math.max(score, 85);
        } else if (foundCount >= 2) {
          issues.push({
            type: 'success',
            message: t(ATS_MESSAGES.GOOD_DESIGN_KEYWORDS.replace('{count}', String(foundCount)), `Good design keyword presence (${foundCount} keywords)`),
            category: 'keywords'
          });
          score = Math.max(score, 70);
        } else {
          issues.push({
            type: 'warning',
            message: t(ATS_MESSAGES.ADD_DESIGN_KEYWORDS, 'Add UX/UI and product design keywords like Figma, prototyping, wireframing, user research'),
            category: 'keywords'
          });
          score = Math.min(score, 50);
        }
      } else {
        if (foundCount >= 5) {
          issues.push({
            type: 'success',
            message: t(ATS_MESSAGES.STRONG_TECHNICAL_KEYWORDS.replace('{count}', String(foundCount)), `Strong keywords presence (${foundCount} technical keywords found)`),
            category: 'keywords'
          });
          score = Math.max(score, 90);
        } else if (foundCount >= 3) {
          issues.push({
            type: 'success',
            message: t(ATS_MESSAGES.GOOD_TECHNICAL_KEYWORDS.replace('{count}', String(foundCount)), `Good technical keywords presence (${foundCount} keywords)`),
            category: 'keywords'
          });
          score = Math.max(score, 70);
        } else if (foundCount >= 1) {
          issues.push({
            type: 'warning',
            message: t(ATS_MESSAGES.ONLY_TECHNICAL_KEYWORDS.replace('{count}', String(foundCount)), `Only ${foundCount} technical keywords found. Add more technical keywords to improve ATS score`),
            category: 'keywords'
          });
        } else {
          issues.push({
            type: 'error',
            message: t(ATS_MESSAGES.NO_TECHNICAL_KEYWORDS, 'No technical keywords found. Add more technical keywords to your resume'),
            category: 'keywords'
          });
          score = Math.min(score, 30);
        }

        if (foundCount < 3) {
          issues.push({
            type: 'warning',
            message: t(ATS_MESSAGES.ADD_MORE_TECHNICAL_KEYWORDS, 'Add more technical keywords related to your field'),
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
        message: t(ATS_MESSAGES.USE_ACTION_VERBS, 'Use action verbs (developed, created, implemented) in experience descriptions'),
        category: 'format'
      });
    } else {
      issues.push({
        type: 'success',
        message: t(ATS_MESSAGES.ACTION_VERBS_USED, 'Action verbs used in experience descriptions'),
        category: 'format'
      });
    }

    const summaryWordCount = countWords(data.personal.title || '');
    if (summaryWordCount > 0) {
      if (summaryWordCount >= 3 && summaryWordCount <= 50) {
        issues.push({
          type: 'success',
          message: t(ATS_MESSAGES.SUMMARY_LENGTH_OPTIMAL, 'Summary length is optimal'),
          category: 'format'
        });
      } else if (summaryWordCount < 3) {
        score -= 10;
        issues.push({
          type: 'warning',
          message: t(ATS_MESSAGES.SUMMARY_TOO_SHORT, 'Summary is too short'),
          category: 'format'
        });
      } else {
        score -= 5;
        issues.push({
          type: 'warning',
          message: t(ATS_MESSAGES.SUMMARY_TOO_LONG, 'Summary is too long. Recommended 3-50 words'),
          category: 'format'
        });
      }
    } else {
      score -= 15;
      issues.push({
        type: 'warning',
        message: t(ATS_MESSAGES.SUMMARY_MISSING, 'Summary is missing or empty'),
        category: 'format'
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  private checkDates(data: ResumeData, issues: ATSIssue[]): number {
    let score = 100;
    issues.push({
      type: 'success',
      message: t(ATS_MESSAGES.DATE_FORMATS_CORRECT, 'Date formats are correct, no significant gaps'),
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
            message: t(ATS_MESSAGES.STUDENT_PROJECT_EVIDENCE, 'Student resume includes project evidence'),
            category: 'experience'
          });
          return 100;
        }

        issues.push({
          type: 'error',
          message: t(ATS_MESSAGES.STUDENT_MISSING_EXPERIENCE_PROJECTS, 'Student resume is missing both experience and project evidence'),
          category: 'experience'
        });
        return 0;
      }

      issues.push({
        type: 'error',
        message: t(ATS_MESSAGES.EXPERIENCE_SECTION_EMPTY, 'Experience section is empty'),
        category: 'experience'
      });
      return 0;
    }

    if (data.experience.length >= 3) {
      issues.push({
        type: 'success',
        message: t(ATS_MESSAGES.SUFFICIENT_WORK_EXPERIENCE, 'Sufficient work experience (3+ positions)'),
        category: 'experience'
      });
      return 100;
    }

    issues.push({
      type: 'success',
      message: t(ATS_MESSAGES.HAS_WORK_EXPERIENCE, 'Has work experience'),
      category: 'experience'
    });
    return 70;
  }

  private checkEducation(data: ResumeData, issues: ATSIssue[], profile: ResumeProfile): number {
    if (data.education && data.education.length > 0) {
      issues.push({
        type: 'success',
        message: t(ATS_MESSAGES.EDUCATION_SECTION_PRESENT, 'Education section is present'),
        category: 'education'
      });
      return 100;
    }

    if (profile === 'student') {
      issues.push({
        type: 'error',
        message: t(ATS_MESSAGES.STUDENT_SHOULD_INCLUDE_EDUCATION, 'Student profile should include education information'),
        category: 'education'
      });
      return 0;
    }

    issues.push({
      type: 'warning',
      message: t(ATS_MESSAGES.EDUCATION_SECTION_MISSING_ALT, 'Education section is missing. Add relevant degrees or certifications'),
      category: 'education'
    });
    return 50;
  }
}
