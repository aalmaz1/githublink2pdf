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
