import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('index.html', `file://${process.cwd()}/`), 'utf8');

/**
 * Switching the interface language must only re-label the chrome: buttons,
 * tooltips, hints and the ATS panel. The resume itself is a document the user
 * is editing — its section headings (which end up in the PDF) and every piece
 * of typed content must be left exactly as they were.
 */
describe('interface language switching', () => {
  let dom: JSDOM;

  async function bootApp(): Promise<void> {
    dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'outside-only', pretendToBeVisual: true });

    (global as any).document = dom.window.document;
    (global as any).window = dom.window;
    (global as any).localStorage = dom.window.localStorage;
    (global as any).HTMLElement = dom.window.HTMLElement;
    (global as any).HTMLSelectElement = dom.window.HTMLSelectElement;
    (global as any).HTMLTextAreaElement = dom.window.HTMLTextAreaElement;
    (global as any).Node = dom.window.Node;
    (global as any).CustomEvent = dom.window.CustomEvent;
    (global as any).navigator = dom.window.navigator;

    vi.resetModules();
    await import('../src/main');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  }

  /** Let the lazily imported ru/ko dictionary resolve and the UI settle. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  async function switchTo(lang: string): Promise<void> {
    const option = dom.window.document.querySelector<HTMLButtonElement>(`.lang-option[data-lang="${lang}"]`);
    expect(option).toBeTruthy();
    option!.click();
    await settle();
  }

  const headingText = (section: string): string =>
    dom.window.document.querySelector(`[data-section="${section}"] h3`)?.textContent ?? '';

  beforeEach(async () => {
    await bootApp();
    await settle();
  });

  it('re-labels the interface chrome', async () => {
    expect(dom.window.document.getElementById('export-pdf')!.textContent).toBe('Export PDF');

    await switchTo('ru');

    // The ru dictionary really was applied to the chrome.
    expect(dom.window.document.getElementById('export-pdf')!.textContent).toBe('Экспорт в PDF');
    expect(dom.window.document.getElementById('save-json')!.textContent).toBe('Сохранить JSON');
    expect(dom.window.document.getElementById('lang-toggle-floating')!.textContent).toBe('🇷🇺');
  });

  it('leaves the resume document untouched', async () => {
    const before = {
      experience: headingText('experience'),
      education: headingText('education'),
      skills: headingText('skills'),
      resumeHtml: dom.window.document.getElementById('resume-container')!.innerHTML
    };
    expect(before.experience).toBe('Experience');
    expect(before.education).toBe('Education');

    await switchTo('ru');

    // Section headings are part of the resume and must not follow the UI.
    expect(headingText('experience')).toBe(before.experience);
    expect(headingText('education')).toBe(before.education);
    expect(headingText('skills')).toBe(before.skills);
  });

  it('keeps the text the user typed into the resume', async () => {
    const nameEl = dom.window.document.querySelector<HTMLElement>('[data-field="personal.name"]')!;
    nameEl.textContent = 'Ada Lovelace';
    const titleEl = dom.window.document.querySelector<HTMLElement>('[data-field="personal.title"]')!;
    titleEl.textContent = 'Senior Engineer';

    await switchTo('ru');

    expect(dom.window.document.querySelector<HTMLElement>('[data-field="personal.name"]')!.textContent)
      .toBe('Ada Lovelace');
    expect(dom.window.document.querySelector<HTMLElement>('[data-field="personal.title"]')!.textContent)
      .toBe('Senior Engineer');
  });

  it('still re-labels an already open ATS panel', async () => {
    (dom.window.document.getElementById('ats-check') as HTMLButtonElement).click();
    const panelContent = () => dom.window.document.querySelector('.ats-panel-content')!;
    expect(panelContent().textContent).toContain('ATS Score');

    await switchTo('ru');

    // The panel is interface, so it does follow the selected language.
    expect(panelContent().textContent).toContain('Оценка ATS');
  });

  it('keeps the resume in its own language when switching back and forth', async () => {
    await switchTo('ru');
    await switchTo('en');
    await switchTo('ru');

    expect(headingText('experience')).toBe('Experience');
    expect(dom.window.document.getElementById('export-pdf')!.textContent).toBe('Экспорт в PDF');
  });
});
