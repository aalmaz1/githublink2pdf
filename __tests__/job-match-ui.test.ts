import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('index.html', `file://${process.cwd()}/`), 'utf8');

/**
 * Integration tests that mount the real index.html in jsdom, boot the actual
 * app, and exercise the job-description keyword matching end to end.
 *
 * NOTE: the demo resume is randomly generated from a fixed skill pool, so the
 * tests use skills that are (a) never in the demo pool and (b) in the keyword
 * bank — "jenkins" — as well as one that is NOT in the bank — "prometheus" —
 * to prove out-of-bank skills are extracted from the job text too.
 */
describe('job-description UI integration', () => {
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

  beforeEach(async () => {
    await bootApp();
  });

  it('renders found/missing chips and surfaces out-of-bank skills extracted from the job', () => {
    const textarea = dom.window.document.getElementById('job-description') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    // "typescript" is in the demo resume; "jenkins" is in the bank but not the
    // resume; "prometheus" is not even in the bank — it must be extracted.
    textarea.value = 'We need TypeScript, Jenkins and Prometheus engineers.';
    textarea.dispatchEvent(new dom.window.Event('input'));

    (dom.window.document.getElementById('ats-check') as HTMLButtonElement).click();

    const panel = dom.window.document.getElementById('ats-panel');
    expect(panel!.classList.contains('hidden')).toBe(false);

    const content = dom.window.document.querySelector('.ats-panel-content');
    expect(content!.querySelector('.ats-job-match')).toBeTruthy();

    // Chip textContent also includes the "+" button, so read only the text
    // nodes directly under the chip to get the bare keyword.
    const chipText = (chip: Element): string =>
      Array.from(chip.childNodes)
        .filter(n => n.nodeType === 3 /* TEXT_NODE */)
        .map(n => n.textContent ?? '')
        .join('')
        .trim();
    const foundTexts = Array.from(content!.querySelectorAll('.kw-found')).map(chipText);
    const missingTexts = Array.from(content!.querySelectorAll('.kw-missing')).map(chipText);
    expect(foundTexts).toContain('typescript');
    expect(missingTexts).toContain('jenkins');
    expect(missingTexts).toContain('prometheus');
  });

  it('adds a missing keyword to the Skills section when its + button is clicked', () => {
    const textarea = dom.window.document.getElementById('job-description') as HTMLTextAreaElement;
    textarea.value = 'We need TypeScript and Jenkins engineers.';
    textarea.dispatchEvent(new dom.window.Event('input'));

    (dom.window.document.getElementById('ats-check') as HTMLButtonElement).click();

    const missingBtn = dom.window.document.querySelector<HTMLButtonElement>('[data-add-keyword="jenkins"]');
    expect(missingBtn).toBeTruthy();
    missingBtn!.click();

    const resumeText = dom.window.document.getElementById('resume-container')!.textContent ?? '';
    expect(resumeText.toLowerCase()).toContain('jenkins');
  });

  it('shows a hint instead of chips when no job description is pasted', () => {
    (dom.window.document.getElementById('ats-check') as HTMLButtonElement).click();

    const hint = dom.window.document.querySelector('.ats-job-match.empty');
    expect(hint).toBeTruthy();
    expect(dom.window.document.querySelectorAll('.kw-missing').length).toBe(0);
  });
});
