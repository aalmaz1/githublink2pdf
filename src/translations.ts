/**
 * UI string dictionaries.
 *
 * English is bundled with the main chunk; Russian and Korean live in
 * separate dynamic chunks (src/i18n/ru.ts, src/i18n/ko.ts) that are
 * fetched only when the user first switches to that language, keeping
 * the initial bundle small for the common English-only case.
 */
export type Lang = 'en' | 'ru' | 'ko';

export const en = {
  appTitle: 'Github Link2PDF Resume Builder',
  githubPlaceholder: 'Enter GitHub username (e.g. octocat)',
  exportBtn: 'Export PDF',
  languageLabel: 'Interface Language',
  resumeDesignLabel: 'Resume Design:',
  alignmentLabel: 'Alignment:',
  saveJsonBtn: 'Save JSON',
  alignLeft: 'Left',
  alignCenter: 'Center',
  alignJustify: 'Justify',
  importBtn: 'Import',
  randomDesignBtn: 'Random',
  atsCheckBtn: 'ATS Check',
  loadingGitHub: 'Loading GitHub data...',
  invalidUsername: 'Please enter a valid GitHub username',
  exportSuccess: 'PDF exported successfully!',
  exportError: 'PDF export error',
  jsonSaved: 'JSON file downloaded',
  profileLoaded: 'Profile loaded successfully!',
  fillInExperience: 'GitHub does not know your jobs or studies - add them in the Experience and Education sections.',
  userNotFound: 'User not found or invalid format',
  rateLimited: 'GitHub user not found or API limit reached',
  editableHint: 'Tip: Click any text in the resume to edit it directly!',
  atsScoreTitle: 'ATS Score',
  atsBreakdownTitle: 'Score breakdown',
  atsBreakdownLegend: 'Score (share of total). Contribution to the total = score × weight.',
  atsWeightLabel: 'weight',
  atsWeightTitle: 'Share of this criterion in the total score',
  atsRecommendationsTitle: 'Recommendations',
  atsStructure: 'Structure',
  atsKeywords: 'Keywords',
  atsContacts: 'Contacts',
  atsFormat: 'Format',
  atsDates: 'Dates',
  atsExperience: 'Experience',
  atsEducation: 'Education',
  atsSummary: 'Summary',
  jobDescriptionPlaceholder: 'Paste the job description here to match your resume against a specific role (optional)',
  jobMatchToggle: 'Job match',
  jobMatchTitle: 'Match against job description',
  foundInResume: 'Found in resume',
  missingFromResume: 'Missing from resume',
  addToSkills: 'Add to skills',
  addedToSkills: 'Added to skills',
  noMissingKeywords: 'All job keywords are already present in your resume',
  noJobDescription: 'Paste a job description above to see targeted keyword matching against that role.'
} as const;

export type TranslationKey = keyof typeof en;
export type TranslationDict = Record<TranslationKey, string>;

export const defaultLang: Lang = 'en';

/** Dictionaries that are ready synchronously; ru/ko are filled in lazily. */
const loaded: Partial<Record<Lang, TranslationDict>> = { en };
const pending: Partial<Record<Lang, Promise<TranslationDict>>> = {};

/**
 * Load (and cache) the UI dictionary for a language. English is always
 * available; ru/ko are dynamic chunks fetched only when first needed.
 */
export function loadTranslations(lang: Lang): Promise<TranslationDict> {
  if (lang === 'en' || loaded[lang]) {
    return Promise.resolve(loaded[lang] ?? en);
  }
  pending[lang] ??= (lang === 'ru'
    ? import('./i18n/ru').then(module => module.default)
    : import('./i18n/ko').then(module => module.default)
  ).then(dict => {
    loaded[lang] = dict;
    return dict;
  });
  return pending[lang]!;
}

/**
 * Synchronous accessor. Returns the English dictionary until a
 * non-English dictionary has finished loading, so callers always get
 * usable strings.
 */
export function getTranslations(lang: Lang): TranslationDict {
  return loaded[lang] ?? en;
}

/**
 * Look up a UI string for the given language, falling back to English.
 */
export function tr(lang: Lang, key: TranslationKey): string {
  return getTranslations(lang)[key];
}
