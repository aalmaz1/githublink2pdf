/**
 * Onboarding Modal - guides new users through the resume builder features
 */

import { Lang, translations } from '../translations';

export interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  highlight?: string; // CSS selector for element to highlight
}

export class OnboardingModal {
  private modal: HTMLElement | null = null;
  private currentStep: number = 0;
  private steps: OnboardingStep[] = [];
  private lang: Lang = 'en';
  private onComplete: (() => void) | null = null;

  constructor(lang: Lang = 'en') {
    this.lang = lang;
    this.steps = this.createSteps();
  }

  private createSteps(): OnboardingStep[] {
    const t = translations[this.lang];
    
    return [
      {
        title: t.onboarding?.step1Title || 'Welcome to Resume Builder',
        description: t.onboarding?.step1Desc || 'Enter your GitHub username or profile URL to automatically generate a professional resume from your projects.',
        icon: '👋',
        highlight: '#github-url'
      },
      {
        title: t.onboarding?.step2Title || 'Import Your Data',
        description: t.onboarding?.step2Desc || 'Click "Import" to fetch your GitHub profile and repositories. Our AI will create professional descriptions.',
        icon: '📥',
        highlight: '#import-github'
      },
      {
        title: t.onboarding?.step3Title || 'Choose a Design',
        description: t.onboarding?.step3Desc || 'Select from 30+ professional designs or click "Random" to discover a style that fits your personality.',
        icon: '🎨',
        highlight: '#design-select'
      },
      {
        title: t.onboarding?.step4Title || 'Export & Share',
        description: t.onboarding?.step4Desc || 'Check your ATS score to optimize for hiring systems, then export as PDF to share with employers.',
        icon: '📤',
        highlight: '#ats-check'
      }
    ];
  }

  public show(onComplete?: () => void): void {
    this.onComplete = onComplete || null;
    this.currentStep = 0;
    this.render();
  }

  private render(): void {
    // Remove existing modal if any
    this.hide();

    const step = this.steps[this.currentStep];
    const totalSteps = this.steps.length;

    this.modal = document.createElement('div');
    this.modal.className = 'onboarding-modal-overlay';
    this.modal.innerHTML = `
      <div class="onboarding-modal">
        <div class="onboarding-header">
          <span class="onboarding-icon">${step.icon}</span>
          <h2 class="onboarding-title">${step.title}</h2>
        </div>
        
        <div class="onboarding-content">
          <p class="onboarding-description">${step.description}</p>
          
          ${step.highlight ? `
            <div class="onboarding-hint">
              👉 Look for this element on the page
            </div>
          ` : ''}
        </div>
        
        <div class="onboarding-progress">
          ${this.steps.map((_, idx) => `
            <div class="progress-dot ${idx === this.currentStep ? 'active' : ''} ${idx < this.currentStep ? 'completed' : ''}"></div>
          `).join('')}
        </div>
        
        <div class="onboarding-footer">
          <button class="onboarding-btn secondary" id="onboarding-skip">
            ${this.lang === 'ru' ? 'Пропустить' : this.lang === 'ko' ? '건너뛰기' : 'Skip'}
          </button>
          <button class="onboarding-btn primary" id="onboarding-next">
            ${this.currentStep === totalSteps - 1 
              ? (this.lang === 'ru' ? 'Начать' : this.lang === 'ko' ? '시작하기' : 'Get Started')
              : (this.lang === 'ru' ? 'Далее' : this.lang === 'ko' ? '다음' : 'Next')}
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    const nextBtn = this.modal.querySelector('#onboarding-next');
    const skipBtn = this.modal.querySelector('#onboarding-skip');
    
    nextBtn?.addEventListener('click', () => this.next());
    skipBtn?.addEventListener('click', () => this.complete());

    // Highlight target element
    if (step.highlight) {
      this.highlightElement(step.highlight);
    }

    document.body.appendChild(this.modal);
    
    // Trigger animation
    requestAnimationFrame(() => {
      this.modal?.classList.add('visible');
    });
  }

  private highlightElement(selector: string): void {
    const element = document.querySelector(selector);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Add temporary highlight effect
      element.classList.add('onboarding-highlight');
      setTimeout(() => {
        element.classList.remove('onboarding-highlight');
      }, 3000);
    }
  }

  private next(): void {
    if (this.currentStep < this.steps.length - 1) {
      this.currentStep++;
      this.render();
    } else {
      this.complete();
    }
  }

  public complete(): void {
    localStorage.setItem('hasSeenOnboarding', 'true');
    this.hide();
    if (this.onComplete) {
      this.onComplete();
    }
  }

  public hide(): void {
    if (this.modal) {
      this.modal.classList.remove('visible');
      setTimeout(() => {
        this.modal?.remove();
        this.modal = null;
      }, 300);
    }
    
    // Remove any remaining highlights
    document.querySelectorAll('.onboarding-highlight').forEach(el => {
      el.classList.remove('onboarding-highlight');
    });
  }

  public setLanguage(lang: Lang): void {
    this.lang = lang;
    this.steps = this.createSteps();
  }
}

// Check if user has seen onboarding
export function hasSeenOnboarding(): boolean {
  return localStorage.getItem('hasSeenOnboarding') === 'true';
}

// Mark onboarding as seen
export function markOnboardingSeen(): void {
  localStorage.setItem('hasSeenOnboarding', 'true');
}
