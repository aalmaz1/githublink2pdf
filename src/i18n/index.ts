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
  
  // Also add direct key mappings for common patterns
  const directMappings: Record<string, string> = {
    'Education section present': 'ats_checker.messages.education_section_present',
    'Education section missing': 'ats_checker.messages.education_section_missing',
    'Summary length is optimal': 'ats_checker.messages.summary_length_optimal',
    'Summary is too short': 'ats_checker.messages.summary_too_short',
    'Summary is too long': 'ats_checker.messages.summary_too_long',
    'Summary/Title section filled': 'ats_checker.messages.summary_title_filled',
    'Summary/Title section empty': 'ats_checker.messages.summary_title_empty',
    'Contact section present': 'ats_checker.messages.contact_section_present',
    'Contact section missing': 'ats_checker.messages.contact_section_missing',
    'Contact information is complete': 'ats_checker.messages.contact_info_complete',
    'Contact information is incomplete': 'ats_checker.messages.contact_info_incomplete',
    'Skills section present': 'ats_checker.messages.skills_section_present',
    'Skills section missing': 'ats_checker.messages.skills_section_missing',
    'Experience section present': 'ats_checker.messages.experience_section_present',
    'Experience section missing': 'ats_checker.messages.experience_section_missing',
    'Keywords found': 'ats_checker.messages.keywords_found',
    'Keywords missing': 'ats_checker.messages.keywords_missing',
    'Formatting is valid': 'ats_checker.messages.formatting_valid',
    'Formatting issues detected': 'ats_checker.messages.formatting_issues',
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
 * @param iconType - The type of icon already displayed ('pass', 'warning', 'fail')
 * @returns Cleaned text without duplicate leading emojis
 */
export function cleanDuplicateEmojis(text: string, iconType?: 'pass' | 'warning' | 'fail'): string {
  if (!text) return text;
  
  // Define emoji patterns that might be duplicated
  const emojiPatterns: Record<string, RegExp> = {
    pass: /^[✅✔️✓]\s*/,
    warning: /^[⚠️⚠❗]\s*/,
    fail: /^[❌✖️×]\s*/,
  };
  
  // If we know the icon type, remove that specific emoji
  if (iconType && emojiPatterns[iconType]) {
    return text.replace(emojiPatterns[iconType], '');
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
