import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('index.html', `file://${process.cwd()}/`), 'utf8');

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

    // Fresh module instance so module-level state does not leak between tests.
    vi.resetModules();
    await import('../src/main.ts');
    dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  }

  beforeEach(async () => {
    await bootApp();
  });

  it('shows job-match chips after pasting a job description and clicking ATS Check', () => {
    const textarea = dom.window.document.getElementById('job-description') as HTMLTextAreaElement;
    expect(textarea).toBeTruthy();

    textarea.value = 'We need TypeScript, Kafka, Terraform, Prometheus and Rust engineers.';
    textarea.dispatchEvent(new dom.window.Event('input'));

    (dom.window.document.getElementById('ats-check') as HTMLButtonElement).click();

    const panel = dom.window.document.getElementById('ats-panel');
    expect(panel!.classList.contains('hidden')).toBe(false);

    const content = dom.window.document.querySelector('.ats-panel-content') as HTMLElement;
    // eslint-disable-next-line no-console
    console.log('PANEL HTML:\n', content?.innerHTML);

    const matchBlock = content!.querySelector('.ats-job-match');
    expect(matchBlock).toBeTruthy();
    expect(content!.querySelectorAll('.kw-missing').length).toBeGreaterThan(0);
    expect(content!.querySelectorAll('.kw-found').length).toBeGreaterThan(0);
  });

  it('adds a missing keyword to the Skills section when its + button is clicked', () => {
    const textarea = dom.window.document.getElementById('job-description') as HTMLTextAreaElement;
    textarea.value = 'We need TypeScript and Terraform engineers.';
    textarea.dispatchEvent(new dom.window.Event('input'));

    (dom.window.document.getElementById('ats-check') as HTMLButtonElement).click();

    const missingBtn = dom.window.document.querySelector<HTMLButtonElement>('[data-add-keyword="terraform"]');
    expect(missingBtn).toBeTruthy();
    missingBtn!.click();

    // The skill should now appear in the rendered resume.
    const resumeText = dom.window.document.getElementById('resume-container')!.textContent ?? '';
    expect(resumeText.toLowerCase()).toContain('terraform');
  });

  it('shows a hint instead of chips when no job description is pasted', () => {
    (dom.window.document.getElementById('ats-check') as HTMLButtonElement).click();

    const hint = dom.window.document.querySelector('.ats-job-match.empty');
    expect(hint).toBeTruthy();
    expect(dom.window.document.querySelectorAll('.kw-missing').length).toBe(0);
  });
});
