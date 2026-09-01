/**
 * Resume Typographic Engine
 * This module implements the Layout Primitive pattern
 * logic, specifically extending the 'Editorial Engine' concept.
 *
 * Every user-editable piece of text carries a `data-field` attribute so that
 * `resume-editor.ts` can read the edited content back into a ResumeData
 * object. Keep the two modules in sync when changing the markup.
 */
import { ResumeData, TimeBoundedEntity } from './types';
import { tr, Lang } from './translations';

export function renderResume(
  data: ResumeData,
  container: HTMLElement,
  lang: Lang = 'en'
): void {
  container.innerHTML = '';
  
  // 1. Header (PositionedBlock)
  const header = createBlock('resume-header');
  header.appendChild(createLine('h1', data.personal.name, 'personal.name'));
  header.appendChild(createLine('h2', data.personal.title, 'personal.title'));

  // Contacts are rendered as individual spans (rather than one joined string)
  // so each value can be edited and read back independently.
  const contactLine = createLine('p', '');
  const contactFields: { field: string; value: string }[] = [
    { field: 'personal.email', value: data.personal.email },
    { field: 'personal.phone', value: data.personal.phone },
    { field: 'personal.location', value: data.personal.location },
    { field: 'personal.github', value: data.personal.github ?? '' },
    { field: 'personal.linkedin', value: data.personal.linkedin ?? '' }
  ];
  contactFields
    .filter(entry => entry.value)
    .forEach((entry, index, visible) => {
      const span = document.createElement('span');
      span.dataset.field = entry.field;
      span.textContent = entry.value;
      contactLine.appendChild(span);
      if (index < visible.length - 1) {
        // Separators are plain text nodes and are ignored when reading back.
        contactLine.appendChild(document.createTextNode(' | '));
      }
    });
  header.appendChild(contactLine);
  container.appendChild(header);

  // 2. Sections with localized headers.
  //
  // Experience and Education are always rendered, even when empty. The GitHub
  // import deliberately leaves them blank instead of inventing jobs, so the
  // section has to exist for the user to type a real one into - an omitted
  // section would leave nowhere to click. The placeholder text lives in CSS
  // (`::before`), so it is never read back as data and never reaches the PDF.
  container.appendChild(
    renderSection(tr(lang, 'resumeSectionExperience'), data.experience ?? [], 'experience', lang)
  );

  if (data.projects?.length) {
    container.appendChild(
      renderSection(tr(lang, 'resumeSectionProjects'), data.projects, 'projects', lang)
    );
  }

  container.appendChild(
    renderSection(tr(lang, 'resumeSectionEducation'), data.education ?? [], 'education', lang)
  );

  // 3. Skills Grid
  if (data.skills?.length) {
    const section = createBlock('section-block');
    section.dataset.section = 'skills';
    section.appendChild(createLine('h3', tr(lang, 'resumeSectionSkills')));
    
    const skillsList = document.createElement('ul');
    skillsList.className = 'skills-grid';
    skillsList.style.listStyleType = 'disc';
    skillsList.style.paddingLeft = '20px';
    
    data.skills.forEach((skill, skillIndex) => {
      if (typeof skill === 'string') {
        // Если навык просто строка - добавляем как есть
        const li = document.createElement('li');
        li.dataset.field = 'skill';
        li.dataset.skillIndex = String(skillIndex);
        li.textContent = skill;
        skillsList.appendChild(li);
      } else {
        // Если навык объект с категорией и элементами
        // Добавляем название категории жирным с использованием textContent для безопасности
        const categoryLi = document.createElement('li');
        const strongEl = document.createElement('strong');
        strongEl.dataset.field = 'skill-category';
        strongEl.dataset.skillIndex = String(skillIndex);
        strongEl.textContent = `${skill.category}:`;
        categoryLi.appendChild(strongEl);
        categoryLi.style.marginTop = '8px';
        skillsList.appendChild(categoryLi);
        
        // Добавляем каждый элемент категории отдельным подпунктом
        skill.items.forEach(item => {
          const subLi = document.createElement('li');
          subLi.dataset.field = 'skill-item';
          subLi.dataset.skillIndex = String(skillIndex);
          subLi.textContent = item;
          subLi.style.marginLeft = '20px';
          skillsList.appendChild(subLi);
        });
      }
    });
    section.appendChild(skillsList);
    container.appendChild(section);
  }
}

function createBlock(cls: string): HTMLElement {
  const div = document.createElement('div');
  div.className = `positioned-block ${cls}`;
  return div;
}

function createLine(tag: string, text: string, field?: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = 'layout-line';
  el.textContent = text;
  if (field) el.dataset.field = field;
  return el;
}

function renderSection(
  title: string,
  items: TimeBoundedEntity[],
  sectionName: 'experience' | 'education' | 'projects',
  lang: Lang
): HTMLElement {
  const section = createBlock('section-block');
  section.dataset.section = sectionName;
  const h3 = document.createElement('h3');
  h3.textContent = title;
  section.appendChild(h3);

  // An empty Experience/Education section still gets one blank entry to type
  // into. Every field is genuinely empty, so `resume-editor.ts` drops the
  // entry unless the user actually fills it in.
  if (items.length === 0) {
    section.classList.add('section-empty');
    section.appendChild(createPlaceholderEntity(sectionName, lang));
    return section;
  }

  items.forEach((item, index) => {
    const itemBlock = createBlock('entity-item');
    itemBlock.dataset.entityIndex = String(index);
    const headerLine = createLine('div', '');
    
    // Безопасное создание HTML с использованием textContent вместо innerHTML
    const leftSpan = document.createElement('span');
    const roleOrgSpan = document.createElement('strong');
    roleOrgSpan.dataset.field = 'role';
    roleOrgSpan.textContent = item.role;
    leftSpan.appendChild(roleOrgSpan);
    leftSpan.appendChild(document.createTextNode(' - '));
    const institutionSpan = document.createElement('span');
    institutionSpan.dataset.field = 'institution';
    institutionSpan.textContent = item.institution;
    leftSpan.appendChild(institutionSpan);
    
    const rightSpan = document.createElement('span');
    rightSpan.dataset.field = 'period';
    rightSpan.textContent = item.period;
    
    headerLine.appendChild(leftSpan);
    headerLine.appendChild(rightSpan);
    itemBlock.appendChild(headerLine);

    const ul = document.createElement('ul');
    item.description.forEach(desc => {
      const li = document.createElement('li');
      li.dataset.field = 'description';
      li.textContent = desc;
      ul.appendChild(li);
    });
    itemBlock.appendChild(ul);
    section.appendChild(itemBlock);
  });
  return section;
}

/**
 * A blank entry the user can click into.
 *
 * The hints are exposed as `data-placeholder` attributes and drawn by CSS,
 * never as text content: anything written as text here would be read back by
 * `resume-editor.ts` and end up in the exported resume as if the user had
 * claimed it.
 */
function createPlaceholderEntity(
  sectionName: 'experience' | 'education' | 'projects',
  lang: Lang
): HTMLElement {
  const isEducation = sectionName === 'education';

  const itemBlock = createBlock('entity-item');
  itemBlock.dataset.entityIndex = '0';
  itemBlock.dataset.placeholderEntity = 'true';

  const headerLine = createLine('div', '');
  const leftSpan = document.createElement('span');

  const roleSpan = document.createElement('strong');
  roleSpan.dataset.field = 'role';
  roleSpan.dataset.placeholder = isEducation
    ? tr(lang, 'placeholderDegree')
    : tr(lang, 'placeholderJobTitle');
  leftSpan.appendChild(roleSpan);

  leftSpan.appendChild(document.createTextNode(' - '));

  const institutionSpan = document.createElement('span');
  institutionSpan.dataset.field = 'institution';
  institutionSpan.dataset.placeholder = isEducation
    ? tr(lang, 'placeholderSchool')
    : tr(lang, 'placeholderCompany');
  leftSpan.appendChild(institutionSpan);

  const periodSpan = document.createElement('span');
  periodSpan.dataset.field = 'period';
  periodSpan.dataset.placeholder = tr(lang, 'placeholderPeriod');

  headerLine.appendChild(leftSpan);
  headerLine.appendChild(periodSpan);
  itemBlock.appendChild(headerLine);

  const ul = document.createElement('ul');
  const li = document.createElement('li');
  li.dataset.field = 'description';
  li.dataset.placeholder = tr(lang, 'placeholderAchievement');
  ul.appendChild(li);
  itemBlock.appendChild(ul);

  return itemBlock;
}
