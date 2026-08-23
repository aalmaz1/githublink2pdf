import { describe, it, expect, beforeEach } from 'vitest';
import { renderResume } from '../src/resume-builder';
import { readResumeFromDom } from '../src/resume-editor';
import { ResumeData } from '../src/types';

const baseData: ResumeData = {
  personal: {
    name: 'Ada Lovelace',
    title: 'Software Engineer',
    email: 'ada@example.com',
    phone: '+1 555 0100',
    location: 'London, UK',
    github: 'github.com/ada',
    linkedin: 'linkedin.com/in/ada'
  },
  experience: [
    {
      institution: 'Analytical Engines Ltd',
      role: 'Lead Engineer',
      period: '2020 - Present',
      description: ['Built the first algorithm.', 'Mentored two engineers.']
    }
  ],
  education: [
    {
      institution: 'Royal Institution',
      role: 'Mathematics',
      period: '2014 - 2018',
      description: ['Graduated with honours.']
    }
  ],
  skills: ['Algorithms', { category: 'Tools', items: ['Punch cards', 'Git'] }]
};

let container: HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '<main id="resume-container"></main>';
  container = document.getElementById('resume-container')!;
});

/** Replace the text of the first element matching `selector`. */
function edit(selector: string, text: string): void {
  const el = container.querySelector(selector);
  if (!el) throw new Error(`No element for ${selector}`);
  el.textContent = text;
}

describe('readResumeFromDom', () => {
  it('should round-trip unedited data', () => {
    renderResume(baseData, container);
    expect(readResumeFromDom(container, baseData)).toEqual(baseData);
  });

  it('should pick up edits to personal details', () => {
    renderResume(baseData, container);

    edit('[data-field="personal.name"]', 'Ada King');
    edit('[data-field="personal.title"]', 'Principal Engineer');
    edit('[data-field="personal.email"]', 'ada.king@example.com');

    const result = readResumeFromDom(container, baseData);

    expect(result.personal.name).toBe('Ada King');
    expect(result.personal.title).toBe('Principal Engineer');
    expect(result.personal.email).toBe('ada.king@example.com');
    // Untouched fields must survive the round trip.
    expect(result.personal.phone).toBe('+1 555 0100');
    expect(result.personal.linkedin).toBe('linkedin.com/in/ada');
  });

  it('should pick up edits to experience entries', () => {
    renderResume(baseData, container);

    edit('[data-section="experience"] [data-field="role"]', 'Chief Engineer');
    edit('[data-section="experience"] [data-field="institution"]', 'Babbage Works');
    edit('[data-section="experience"] [data-field="period"]', '2019 - Present');
    edit('[data-section="experience"] [data-field="description"]', 'Shipped the engine.');

    const [job] = readResumeFromDom(container, baseData).experience;

    expect(job.role).toBe('Chief Engineer');
    expect(job.institution).toBe('Babbage Works');
    expect(job.period).toBe('2019 - Present');
    expect(job.description[0]).toBe('Shipped the engine.');
  });

  it('should keep education and experience separate', () => {
    renderResume(baseData, container);

    edit('[data-section="education"] [data-field="institution"]', 'Cambridge');

    const result = readResumeFromDom(container, baseData);

    expect(result.education[0].institution).toBe('Cambridge');
    expect(result.experience[0].institution).toBe('Analytical Engines Ltd');
  });

  it('should preserve skill categories and their items', () => {
    renderResume(baseData, container);

    edit('[data-field="skill"]', 'Numerical Analysis');
    edit('[data-field="skill-category"]', 'Toolchain:');

    const result = readResumeFromDom(container, baseData);

    expect(result.skills[0]).toBe('Numerical Analysis');
    expect(result.skills[1]).toEqual({ category: 'Toolchain', items: ['Punch cards', 'Git'] });
  });

  it('should normalise whitespace introduced by contenteditable', () => {
    renderResume(baseData, container);

    edit('[data-field="personal.name"]', '  Ada\u00a0 Lovelace \n');

    expect(readResumeFromDom(container, baseData).personal.name).toBe('Ada Lovelace');
  });

  it('should drop entries the user emptied out', () => {
    renderResume(baseData, container);

    const job = container.querySelector('[data-section="experience"] .entity-item')!;
    job.querySelectorAll('[data-field]').forEach(el => {
      el.textContent = '';
    });

    expect(readResumeFromDom(container, baseData).experience).toEqual([]);
  });

  it('should fall back to the source data when a section is absent', () => {
    const withoutSkills: ResumeData = { ...baseData, skills: [] };
    renderResume(withoutSkills, container);

    // Nothing was rendered for skills, so the fallback value must be kept
    // rather than silently emptying the section.
    expect(readResumeFromDom(container, baseData).skills).toEqual(baseData.skills);
  });
});

describe('empty Experience / Education placeholders', () => {
  /** A GitHub import: real projects, but no employment or schooling. */
  const importedData: ResumeData = {
    personal: {
      name: 'Ada Lovelace',
      title: '',
      email: '',
      phone: '',
      location: 'London, UK',
      github: 'github.com/ada'
    },
    experience: [],
    education: [],
    projects: [
      {
        institution: 'Personal / Open Source',
        role: 'Analytical Engine',
        period: '2020 — 2022',
        description: ['A tiny demo repository']
      }
    ],
    skills: []
  };

  it('should still render both sections so the user can type into them', () => {
    renderResume(importedData, container);

    expect(container.querySelector('[data-section="experience"]')).not.toBeNull();
    expect(container.querySelector('[data-section="education"]')).not.toBeNull();
  });

  it('should keep placeholder hints out of the resume text', () => {
    renderResume(importedData, container);

    const experience = container.querySelector('[data-section="experience"]')!;
    // Hints are drawn by CSS from data-placeholder, never as text content.
    expect(normalizeSpace(experience.textContent ?? '')).toBe('Experience -');
    expect(container.querySelector('[data-field="role"][data-placeholder]')).not.toBeNull();
  });

  it('should not read an untouched placeholder back as an entry', () => {
    renderResume(importedData, container);

    const result = readResumeFromDom(container, importedData);

    expect(result.experience).toEqual([]);
    expect(result.education).toEqual([]);
    expect(result.projects?.length).toBe(1);
  });

  it('should capture a real job typed into the placeholder', () => {
    renderResume(importedData, container);

    const experience = container.querySelector('[data-section="experience"]')!;
    experience.querySelector('[data-field="role"]')!.textContent = 'Backend Developer';
    experience.querySelector('[data-field="institution"]')!.textContent = 'Acme Corp';
    experience.querySelector('[data-field="period"]')!.textContent = '2022 - Present';
    experience.querySelector('[data-field="description"]')!.textContent = 'Shipped the billing API.';

    const result = readResumeFromDom(container, importedData);

    expect(result.experience).toEqual([
      {
        role: 'Backend Developer',
        institution: 'Acme Corp',
        period: '2022 - Present',
        description: ['Shipped the billing API.']
      }
    ]);
    // Filling in a job must not disturb the imported projects.
    expect(result.projects?.[0].role).toBe('Analytical Engine');
  });
});

/** Collapse whitespace so assertions ignore markup indentation. */
function normalizeSpace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}
