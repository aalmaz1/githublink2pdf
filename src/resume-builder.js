"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderResume = renderResume;
const i18n_1 = require("./i18n");
function renderResume(data, container) {
    var _a, _b, _c;
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
    if ((_a = data.experience) === null || _a === void 0 ? void 0 : _a.length) {
        container.appendChild(renderSection((0, i18n_1.t)('common.experience', 'Experience'), data.experience));
    }
    if ((_b = data.education) === null || _b === void 0 ? void 0 : _b.length) {
        container.appendChild(renderSection((0, i18n_1.t)('common.education', 'Education'), data.education));
    }
    // 3. Skills Grid
    if ((_c = data.skills) === null || _c === void 0 ? void 0 : _c.length) {
        const section = createBlock('section-block');
        section.appendChild(createLine('h3', (0, i18n_1.t)('common.skills', 'Skills')));
        const skillsList = document.createElement('div');
        skillsList.className = 'skills-grid';
        data.skills.forEach(skill => {
            const el = document.createElement('div');
            el.textContent = typeof skill === 'string'
                ? skill
                : `${skill.category}: ${skill.items.join(', ')}`;
            skillsList.appendChild(el);
        });
        section.appendChild(skillsList);
        container.appendChild(section);
    }
}
function createBlock(cls) {
    const div = document.createElement('div');
    div.className = `positioned-block ${cls}`;
    return div;
}
function createLine(tag, text) {
    const el = document.createElement(tag);
    el.className = 'layout-line';
    el.textContent = text;
    return el;
}
function renderSection(title, items) {
    const section = createBlock('section-block');
    const h3 = document.createElement('h3');
    h3.textContent = title;
    section.appendChild(h3);
    items.forEach(item => {
        const itemBlock = createBlock('entity-item');
        const headerLine = createLine('div', '');
        headerLine.innerHTML = `<span><strong>${item.role}</strong> - ${item.institution}</span><span>${item.period}</span>`;
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
