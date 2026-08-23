/**
 * Resume Typographic Engine
 * This module implements the Layout Primitive pattern
 * logic, specifically extending the 'Editorial Engine' concept.
 */
import { ResumeData, TimeBoundedEntity } from './types';
import { t } from './i18n';

export function renderResume(data: ResumeData, container: HTMLElement): void {
  container.innerHTML = '';
  
  // 1. Header (PositionedBlock)
  const header = createBlock('resume-header');
  header.appendChild(createLine('h1', data.personal.name));
  header.appendChild(createLine('h2', data.personal.title));
  
  const contacts = [data.personal.email, data.personal.phone, data.personal.location, data.personal.github]
    .filter(Boolean).join(' | ');
  header.appendChild(createLine('p', contacts));
  container.appendChild(header);

  // 2. Sections with localized headers
  if (data.experience?.length) {
    container.appendChild(renderSection(t('common.experience', 'Experience'), data.experience));
  }

  if (data.education?.length) {
    container.appendChild(renderSection(t('common.education', 'Education'), data.education));
  }

  // 3. Skills Grid
  if (data.skills?.length) {
    const section = createBlock('section-block');
    section.appendChild(createLine('h3', t('common.skills', 'Skills')));
    
    const skillsList = document.createElement('ul');
    skillsList.className = 'skills-grid';
    skillsList.style.listStyleType = 'disc';
    skillsList.style.paddingLeft = '20px';
    
    data.skills.forEach(skill => {
      if (typeof skill === 'string') {
        // Если навык просто строка - добавляем как есть
        const li = document.createElement('li');
        li.textContent = skill;
        skillsList.appendChild(li);
      } else {
        // Если навык объект с категорией и элементами
        // Добавляем название категории жирным с использованием textContent для безопасности
        const categoryLi = document.createElement('li');
        const strongEl = document.createElement('strong');
        strongEl.textContent = `${skill.category}:`;
        categoryLi.appendChild(strongEl);
        categoryLi.style.marginTop = '8px';
        skillsList.appendChild(categoryLi);
        
        // Добавляем каждый элемент категории отдельным подпунктом
        skill.items.forEach(item => {
          const subLi = document.createElement('li');
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

function createLine(tag: string, text: string): HTMLElement {
  const el = document.createElement(tag);
  el.className = 'layout-line';
  el.textContent = text;
  return el;
}

function renderSection(title: string, items: TimeBoundedEntity[]): HTMLElement {
  const section = createBlock('section-block');
  const h3 = document.createElement('h3');
  h3.textContent = title;
  section.appendChild(h3);

  items.forEach(item => {
    const itemBlock = createBlock('entity-item');
    const headerLine = createLine('div', '');
    
    // Безопасное создание HTML с использованием textContent вместо innerHTML
    const leftSpan = document.createElement('span');
    const roleOrgSpan = document.createElement('strong');
    roleOrgSpan.textContent = item.role;
    leftSpan.appendChild(roleOrgSpan);
    const orgText = document.createTextNode(` - ${item.institution}`);
    leftSpan.appendChild(orgText);
    
    const rightSpan = document.createElement('span');
    rightSpan.textContent = item.period;
    
    headerLine.appendChild(leftSpan);
    headerLine.appendChild(rightSpan);
    itemBlock.appendChild(headerLine);

    const ul = document.createElement('ul');
    item.description.forEach(desc => {
      const li = document.createElement('li');
      li.textContent = desc;
      ul.appendChild(li);
    });
    itemBlock.appendChild(ul);
    section.appendChild(itemBlock);
  });
  return section;
}
