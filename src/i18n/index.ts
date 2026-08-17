/**
 * i18n Localization Module for ATS Checker and Resume Builder
 * 
 * Provides translation functionality with support for multiple languages.
 */

import enTranslations from './en.json';
import ruTranslations from './ru.json';

export type SupportedLanguage = 'en' | 'ru';

export interface TranslationTree {
  common: Record<string, string>;
  ats_checker: {
    title: string;
    status_pass: string;
    status_warning: string;
    status_fail: string;
    messages: Record<string, string>;
  };
  ui: Record<string, string>;
}

const translations: Record<SupportedLanguage, TranslationTree> = {
  en: enTranslations as TranslationTree,
  ru: ruTranslations as TranslationTree,
};

let currentLanguage: SupportedLanguage = 'en';

/**
 * Set the current application language
 * Also updates the <html lang> attribute for accessibility and SEO
 */
export function setLanguage(lang: SupportedLanguage): void {
  if (translations[lang]) {
    currentLanguage = lang;
    // Update html lang attribute
    document.documentElement.lang = lang;
    // Store preference in localStorage
    localStorage.setItem('preferred_language', lang);
  } else {
    console.warn(`Translation for language "${lang}" not found, falling back to English`);
  }
}

/**
 * Get the current language
 */
export function getLanguage(): SupportedLanguage {
  return currentLanguage;
}

/**
 * Initialize language from localStorage or browser settings
 */
export function initLanguage(): void {
  const stored = localStorage.getItem('preferred_language') as SupportedLanguage;
  if (stored && translations[stored]) {
    setLanguage(stored);
  } else {
    // Try to detect from browser
    const browserLang = navigator.language.split('-')[0] as SupportedLanguage;
    if (translations[browserLang]) {
      setLanguage(browserLang);
    }
  }
}

/**
 * Translate a key path (e.g., 'common.education', 'ats_checker.messages.summary_length_optimal')
 * @param key - Dot-separated key path
 * @param fallback - Optional fallback string if translation not found
 * @returns Translated string or the key itself if not found
 */
export function t(key: string, fallback?: string): string {
  const keys = key.split('.');
  let value: any = translations[currentLanguage];
  
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Key not found, try English fallback
      if (currentLanguage !== 'en') {
        let enValue: any = translations.en;
        for (const ek of keys) {
          if (enValue && typeof enValue === 'object' && ek in enValue) {
            enValue = enValue[ek];
          } else {
            return fallback ?? key;
          }
        }
        return enValue;
      }
      return fallback ?? key;
    }
  }
  
  return typeof value === 'string' ? value : (fallback ?? key);
}

/**
 * Map English server messages to translated strings
 * This handles dynamic messages from ATS checker backend
 * @param englishMessage - The English message from server
 * @returns Translated message or original if no mapping found
 */
export function mapServerMessage(englishMessage: string): string {
  // Create a mapping from English messages to translation keys
  const messageToKeyMap: Record<string, string> = {};
  
  // Build reverse mapping from English translations
  const enMessages = translations.en.ats_checker.messages;
  for (const [key, value] of Object.entries(enMessages)) {
    messageToKeyMap[value] = `ats_checker.messages.${key}`;
  }
  
  // Also add direct key mappings for common patterns (without emojis)
  const directMappings: Record<string, string> = {
    // Structure messages
    'Contact section present': 'ats_checker.messages.contact_section_present',
    'No contact information section present': 'ats_checker.messages.contact_section_missing',
    'Summary/Title section filled': 'ats_checker.messages.summary_title_filled',
    'Missing Summary section': 'ats_checker.messages.missing_summary_section',
    'Experience section present': 'ats_checker.messages.experience_section_present',
    'Experience or project section is missing': 'ats_checker.messages.experience_section_missing',
    'No projects found': 'ats_checker.messages.no_projects_found',
    'Projects and education compensate for lack of formal experience': 'ats_checker.messages.projects_education_compensate',
    'Skills section present': 'ats_checker.messages.skills_section_present',
    'Skills section is empty': 'ats_checker.messages.skills_section_missing',
    'Education section present': 'ats_checker.messages.education_section_present',
    'Education section is present': 'ats_checker.messages.education_section_present_alt',
    // Contact messages
    'Email is valid': 'ats_checker.messages.email_valid',
    'Email is invalid': 'ats_checker.messages.email_invalid',
    'Email is missing': 'ats_checker.messages.email_missing',
    'Phone is provided': 'ats_checker.messages.phone_provided',
    'Phone is missing': 'ats_checker.messages.phone_missing',
    'LinkedIn is provided': 'ats_checker.messages.linkedin_provided',
    'Missing LinkedIn': 'ats_checker.messages.linkedin_missing',
    'GitHub is provided': 'ats_checker.messages.github_provided',
    'Location is provided': 'ats_checker.messages.location_provided',
    'Location is missing (recommended)': 'ats_checker.messages.location_missing',
    'Контактная информация отсутствует': 'ats_checker.messages.contact_info_missing_ru',
    // Summary messages
    'Summary length is optimal': 'ats_checker.messages.summary_length_optimal',
    'Summary is too short': 'ats_checker.messages.summary_too_short',
    'Summary is too long. Recommended 3-50 words': 'ats_checker.messages.summary_too_long',
    'Summary is missing or empty': 'ats_checker.messages.summary_missing',
    // Resume score messages
    'Resume is ATS-friendly and optimized!': 'ats_checker.messages.resume_ats_friendly',
    'Resume is good but can be improved': 'ats_checker.messages.resume_good_improve',
    'Resume needs improvement for ATS filters': 'ats_checker.messages.resume_needs_improvement',
    'Resume will likely be rejected by ATS systems': 'ats_checker.messages.resume_rejected',
    // Keywords messages
    'Keywords found': 'ats_checker.messages.keywords_found',
    'Keywords missing': 'ats_checker.messages.keywords_missing',
    'Found ${foundCount} keywords from the job description': 'ats_checker.messages.keywords_from_job_description',
    'Add these keywords from job description: ${keywords}': 'ats_checker.messages.add_keywords_from_job',
    'Strong non-technical keywords present (${foundCount} keywords found)': 'ats_checker.messages.strong_nontechnical_keywords',
    'Only ${foundCount} management keywords found. Add leadership, strategy, campaign or stakeholder terms': 'ats_checker.messages.only_management_keywords',
    'No management keywords found. Add leadership, strategy, budget or campaign terms': 'ats_checker.messages.no_management_keywords',
    'Strong design keyword coverage (${foundCount} keywords found)': 'ats_checker.messages.strong_design_keywords',
    'Good design keyword presence (${foundCount} keywords)': 'ats_checker.messages.good_design_keywords',
    'Add UX/UI and product design keywords like Figma, prototyping, wireframing, user research': 'ats_checker.messages.add_design_keywords',
    'Strong keywords presence (${foundCount} technical keywords found)': 'ats_checker.messages.strong_technical_keywords',
    'Good technical keywords presence (${foundCount} keywords)': 'ats_checker.messages.good_technical_keywords',
    'Only ${foundCount} technical keywords found. Add more technical keywords to improve ATS score': 'ats_checker.messages.only_technical_keywords',
    'No technical keywords found. Add more technical keywords to your resume': 'ats_checker.messages.no_technical_keywords',
    'Add more technical keywords related to your field': 'ats_checker.messages.add_more_technical_keywords',
    // Action verbs
    'Use action verbs (developed, created, implemented) in experience descriptions': 'ats_checker.messages.use_action_verbs',
    'Action verbs used in experience descriptions': 'ats_checker.messages.action_verbs_used',
    // Dates
    'Date formats are correct, no significant gaps': 'ats_checker.messages.date_formats_correct',
    // Experience
    'Student resume includes project evidence': 'ats_checker.messages.student_project_evidence',
    'Student resume is missing both experience and project evidence': 'ats_checker.messages.student_missing_experience_projects',
    'Experience section is empty': 'ats_checker.messages.experience_section_empty',
    'Sufficient work experience (3+ positions)': 'ats_checker.messages.sufficient_work_experience',
    'Has work experience': 'ats_checker.messages.has_work_experience',
    // Education
    'Student profile should include education information': 'ats_checker.messages.student_should_include_education',
    'Education section is missing. Add relevant degrees or certifications': 'ats_checker.messages.education_section_missing_alt',
    // Formatting
    'Formatting is valid': 'ats_checker.messages.formatting_valid',
    'Formatting issues detected': 'ats_checker.messages.formatting_issues',
    // File size
    'File size is optimal': 'ats_checker.messages.file_size_optimal',
    'File size is too large': 'ats_checker.messages.file_size_too_large',
  };
  
  // Try direct mapping first
  if (directMappings[englishMessage]) {
    return t(directMappings[englishMessage], englishMessage);
  }
  
  // Try reverse lookup from English messages
  if (messageToKeyMap[englishMessage]) {
    return t(messageToKeyMap[englishMessage], englishMessage);
  }
  
  // Return original message if no translation found
  return englishMessage;
}

/**
 * Clean duplicate emojis from ATS checker issue text
 * If an icon is already displayed separately, remove it from the message text
 * @param text - The message text that may contain duplicate emojis
 * @param iconType - The type of icon already displayed ('success', 'warning', 'error')
 * @returns Cleaned text without duplicate leading emojis
 */
export function cleanDuplicateEmojis(text: string, iconType?: 'success' | 'warning' | 'error'): string {
  if (!text) return text;
  
  // Define emoji patterns that might be duplicated
  const typeToPattern: Record<string, RegExp> = {
    success: /^[✅✔️✓]\s*/,
    warning: /^[⚠️⚠❗]\s*/,
    error: /^[❌✖️×]\s*/,
  };
  
  // If we know the icon type, remove that specific emoji
  if (iconType && typeToPattern[iconType]) {
    return text.replace(typeToPattern[iconType], '');
  }
  
  // Otherwise, remove any leading status emoji
  const generalEmojiPattern = /^[✅✔️✓⚠️⚠❗❌✖️×]\s*/;
  return text.replace(generalEmojiPattern, '');
}

/**
 * Get translation for section headers (Education, Summary, etc.)
 * @param section - Section name in English
 * @returns Translated section name
 */
export function translateSection(section: string): string {
  const sectionKeyMap: Record<string, string> = {
    'Education': 'common.education',
    'Summary': 'common.summary',
    'Experience': 'common.experience',
    'Skills': 'common.skills',
  };
  
  const key = sectionKeyMap[section];
  if (key) {
    return t(key, section);
  }
  
  return section;
}

export default {
  setLanguage,
  getLanguage,
  initLanguage,
  t,
  mapServerMessage,
  cleanDuplicateEmojis,
  translateSection,
};
