import enTranslations from './en.json';

/**
 * Translate an English resume heading.
 */
export function t(key: string, fallback?: string): string {
  const keys = key.split('.');
  let value: unknown = enTranslations;

  for (const part of keys) {
    if (value && typeof value === 'object' && part in value) {
      value = (value as Record<string, unknown>)[part];
    } else {
      return fallback ?? key;
    }
  }

  return typeof value === 'string' ? value : (fallback ?? key);
}

/**
 * Remove a leading status emoji when its icon is rendered separately.
 */
export function cleanDuplicateEmojis(
  text: string,
  iconType?: 'pass' | 'warning' | 'fail'
): string {
  if (!text) return text;

  const emojiPatterns: Record<string, RegExp> = {
    pass: /^[✅✔️✓]\s*/,
    warning: /^[⚠️⚠❗]\s*/,
    fail: /^[❌✖️×]\s*/,
  };

  if (iconType && emojiPatterns[iconType]) {
    return text.replace(emojiPatterns[iconType], '');
  }

  return text.replace(/^[✅✔️✓⚠️⚠❗❌✖️×]\s*/, '');
}
