/**
 * Reads user edits made in the contenteditable resume back into a ResumeData
 * object.
 *
 * The preview is directly editable, so the DOM — not the last generated
 * object — is the source of truth once the user starts typing. Export and ATS
 * analysis must read from here, otherwise edits are silently discarded.
 *
 * The markup contract lives in `resume-builder.ts`: every editable value
 * carries a `data-field` attribute, and sections carry `data-section`.
 */
import { ResumeData, SkillCategory, TimeBoundedEntity } from './types';

/** Collapse the whitespace contenteditable inserts (nbsp, stray newlines). */
function normalize(text: string | null | undefined): string {
  return (text ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function readField(scope: ParentNode, field: string): string | null {
  const el = scope.querySelector(`[data-field="${field}"]`);
  return el ? normalize(el.textContent) : null;
}

/**
 * Read one experience/education section.
 *
 * Entries whose text was fully deleted are dropped, which is how a user
 * removes a job from the resume.
 */
function readEntities(container: HTMLElement, sectionName: string): TimeBoundedEntity[] | null {
  const section = container.querySelector(`[data-section="${sectionName}"]`);
  if (!section) return null;

  const entities: TimeBoundedEntity[] = [];

  section.querySelectorAll('.entity-item').forEach(item => {
    const role = readField(item, 'role') ?? '';
    const institution = readField(item, 'institution') ?? '';
    const period = readField(item, 'period') ?? '';

    const description = Array.from(item.querySelectorAll('[data-field="description"]'))
      .map(li => normalize(li.textContent))
      .filter(Boolean);

    // Skip entries the user emptied out completely.
    if (!role && !institution && !period && description.length === 0) return;

    entities.push({ role, institution, period, description });
  });

  return entities;
}

/**
 * Read the skills section, preserving the string / category split.
 *
 * Items are grouped by the `data-skill-index` they were rendered with, so a
 * category keeps its items even after the text inside it changed.
 */
function readSkills(container: HTMLElement): (string | SkillCategory)[] | null {
  const section = container.querySelector('[data-section="skills"]');
  if (!section) return null;

  const skills: (string | SkillCategory)[] = [];
  const categories = new Map<string, SkillCategory>();

  section.querySelectorAll<HTMLElement>('[data-field]').forEach(el => {
    const field = el.dataset.field;
    const index = el.dataset.skillIndex ?? '';
    const text = normalize(el.textContent);

    if (field === 'skill') {
      if (text) skills.push(text);
      return;
    }

    if (field === 'skill-category') {
      // The rendered label ends with a colon that is not part of the data.
      const category: SkillCategory = { category: text.replace(/:\s*$/, ''), items: [] };
      categories.set(index, category);
      skills.push(category);
      return;
    }

    if (field === 'skill-item' && text) {
      categories.get(index)?.items.push(text);
    }
  });

  // Drop categories the user emptied out completely.
  return skills.filter(skill => typeof skill === 'string' || skill.category || skill.items.length);
}

/**
 * Build a ResumeData object from the current contents of the preview.
 *
 * `fallback` supplies any value the DOM does not carry, so fields that were
 * never rendered (e.g. an empty phone) survive a round trip.
 */
export function readResumeFromDom(container: HTMLElement, fallback: ResumeData): ResumeData {
  const experience = readEntities(container, 'experience');
  const education = readEntities(container, 'education');
  const projects = readEntities(container, 'projects');
  const skills = readSkills(container);

  return {
    personal: {
      name: readField(container, 'personal.name') ?? fallback.personal.name,
      title: readField(container, 'personal.title') ?? fallback.personal.title,
      email: readField(container, 'personal.email') ?? fallback.personal.email,
      phone: readField(container, 'personal.phone') ?? fallback.personal.phone,
      location: readField(container, 'personal.location') ?? fallback.personal.location,
      github: readField(container, 'personal.github') ?? fallback.personal.github,
      linkedin: readField(container, 'personal.linkedin') ?? fallback.personal.linkedin
    },
    experience: experience ?? fallback.experience,
    education: education ?? fallback.education,
    projects: projects ?? fallback.projects,
    skills: skills ?? fallback.skills
  };
}
