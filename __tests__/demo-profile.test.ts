import { describe, it, expect } from 'vitest';
import { generateDemoProfile } from '../src/demo-profile';
import { ATSService } from '../src/services/ATSService';

describe('generateDemoProfile', () => {
  it('should produce a complete resume', () => {
    const profile = generateDemoProfile();

    expect(profile.personal.name.trim().length).toBeGreaterThan(0);
    expect(profile.personal.title.trim().length).toBeGreaterThan(0);
    expect(profile.personal.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect(profile.experience.length).toBeGreaterThanOrEqual(2);
    expect(profile.education.length).toBeGreaterThanOrEqual(1);
    expect(profile.skills.length).toBeGreaterThan(0);
  });

  it('should give every entry a description and a period', () => {
    for (let i = 0; i < 20; i++) {
      const profile = generateDemoProfile();
      for (const entry of [...profile.experience, ...profile.education]) {
        expect(entry.period.trim().length).toBeGreaterThan(0);
        expect(entry.description.length).toBeGreaterThan(0);
        expect(entry.description.every(d => d.trim().length > 0)).toBe(true);
      }
    }
  });

  it('should never repeat the same achievement bullet', () => {
    for (let i = 0; i < 20; i++) {
      const bullets = generateDemoProfile().experience.flatMap(e => e.description);
      expect(new Set(bullets).size).toBe(bullets.length);
    }
  });

  it('should list experience in reverse chronological order without gaps', () => {
    const atsService = new ATSService();

    for (let i = 0; i < 20; i++) {
      const dateIssues = atsService
        .analyze(generateDemoProfile())
        .issues.filter(issue => issue.category === 'dates');

      expect(dateIssues.some(issue => issue.message.includes('reverse chronological order'))).toBe(false);
      expect(dateIssues.some(issue => issue.message.includes('employment gap'))).toBe(false);
      expect(dateIssues.some(issue => issue.message.includes('Missing date period'))).toBe(false);
    }
  });

  it('should score well enough to demo the ATS checker', () => {
    const atsService = new ATSService();

    for (let i = 0; i < 10; i++) {
      expect(atsService.analyze(generateDemoProfile()).score).toBeGreaterThanOrEqual(70);
    }
  });
});
