import { describe, it, expect } from 'vitest';
import { extractUsername, isValidUsername } from '../src/github-provider';

describe('GitHub Provider - Username Extraction', () => {
  describe('extractUsername', () => {
    it('should extract username from plain username', () => {
      expect(extractUsername('octocat')).toBe('octocat');
      expect(extractUsername('torvalds')).toBe('torvalds');
    });

    it('should extract username from full GitHub URL', () => {
      expect(extractUsername('https://github.com/octocat')).toBe('octocat');
      expect(extractUsername('http://github.com/torvalds')).toBe('torvalds');
    });

    it('should extract username from URL with trailing slash', () => {
      expect(extractUsername('https://github.com/octocat/')).toBe('octocat');
      expect(extractUsername('https://github.com/torvalds/   ')).toBe('torvalds');
    });

    it('should extract username from github.com/username format', () => {
      expect(extractUsername('github.com/octocat')).toBe('octocat');
      expect(extractUsername('www.github.com/torvalds')).toBe('torvalds');
    });

    it('should handle usernames with hyphens and underscores', () => {
      expect(extractUsername('user-name')).toBe('user-name');
      expect(extractUsername('user_name')).toBe('user_name');
      expect(extractUsername('user-name_123')).toBe('user-name_123');
    });

    it('should throw error for empty input', () => {
      expect(() => extractUsername('')).toThrow('Invalid input');
    });

    it('should throw error for invalid characters', () => {
      expect(() => extractUsername('user@name')).toThrow('Invalid username format');
    });
  });

  describe('isValidUsername', () => {
    it('should validate correct usernames', () => {
      expect(isValidUsername('octocat')).toBe(true);
      expect(isValidUsername('user123')).toBe(true);
      expect(isValidUsername('a')).toBe(true);
    });

    it('should reject usernames starting with hyphen', () => {
      expect(isValidUsername('-user')).toBe(false);
    });

    it('should reject usernames ending with hyphen', () => {
      expect(isValidUsername('user-')).toBe(false);
    });

    it('should reject too long usernames', () => {
      const longName = 'a'.repeat(40);
      expect(isValidUsername(longName)).toBe(false);
    });

    it('should reject empty usernames', () => {
      expect(isValidUsername('')).toBe(false);
    });
  });
});
