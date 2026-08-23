import { ResumeData } from './types';
import { renderResume } from './resume-builder';
import { ExportService } from './services/ExportService';
import { fetchGitHubResumeData } from './github-provider';
import { generateDemoProfile } from './demo-profile';
import { translations, tr, Lang, TranslationKey, defaultLang } from './translations';
import { cleanDuplicateEmojis } from './i18n/index';
import { ATSService } from './services/ATSService';
import { ATSResult } from './types/ats';
import { DESIGNS, getRandomDesign } from './designs/design-templates';
import { logger } from './utils/logger';

let currentResumeData: ResumeData | null = null;
let currentTextAlign: 'left' | 'center' | 'justify' = 'left';
let currentLang: Lang = defaultLang;
let currentDesign: string = 'classic'; // Track current design
const atsService = new ATSService();
const exportService = new ExportService();

const defaultData: ResumeData = generateDemoProfile();

/**
 * Update all UI text based on current language
 */
function updateInterfaceLanguage(lang: Lang): void {
  currentLang = lang;
  const t = translations[lang];
  
  // Update elements by ID
  const updateText = (id: string, text: string) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  
  updateText('app-title', t.appTitle);
  updateText('lang-label', t.languageLabel);
  updateText('export-pdf', t.exportBtn);
  updateText('save-json', t.saveJsonBtn);
  updateText('import-github', t.importBtn);
  updateText('ats-check', `\u{1F4CA} ${t.atsCheckBtn}`);
  updateText('random-design-btn', `\u{1F3B2} ${t.randomDesignBtn}`);
  updateText('loading-overlay-text', t.loadingGitHub);

  // Keep accessible names in sync with the visible language
  const setAria = (id: string, label: string) => {
    document.getElementById(id)?.setAttribute('aria-label', label);
  };
  setAria('import-github', t.importBtn);
  setAria('save-json', t.saveJsonBtn);
  setAria('export-pdf', t.exportBtn);
  setAria('ats-check', t.atsCheckBtn);

  // Re-render the open ATS panel so its labels follow the new language
  const openPanel = document.getElementById('ats-panel');
  if (openPanel && !openPanel.classList.contains('hidden') && currentResumeData) {
    showATSResultPanel(atsService.analyze(currentResumeData));
  }
  
  // Update placeholder specifically
  const githubInput = document.getElementById('github-url') as HTMLInputElement;
  if (githubInput) githubInput.placeholder = t.githubPlaceholder;
  
  // Update labels with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (key && t[key as keyof typeof t]) {
      el.textContent = t[key as keyof typeof t] as string;
    }
  });
  
  // Save to localStorage
  localStorage.setItem('resume-lang', lang);
}

/**
 * Centralized UI update function
 */
function updateUI(data: ResumeData, container: HTMLElement): void {
  currentResumeData = data;
  renderResume(data, container);
  applyTextAlign(container, currentTextAlign);
}

/**
 * Apply text alignment to resume content
 */
function applyTextAlign(container: HTMLElement, align: 'left' | 'center' | 'justify'): void {
  currentTextAlign = align;
  
  // Header stays centered always
  const header = container.querySelector('.resume-header');
  if (header) {
    (header as HTMLElement).style.textAlign = 'center';
  }
  
  // Apply alignment to all other blocks
  container.querySelectorAll('.section-block').forEach(el => {
    const element = el as HTMLElement;
    element.style.textAlign = align;
    
    // Special handling for entity headers with flex layout
    const headerLine = element.querySelector('.layout-line');
    if (headerLine) {
      const hl = headerLine as HTMLElement;
      if (align === 'center') {
        hl.style.justifyContent = 'center';
      } else if (align === 'left') {
        hl.style.justifyContent = 'space-between';
      } else if (align === 'justify') {
        hl.style.justifyContent = 'space-between';
      }
    }
    
    // Управление маркерами списка: точки только при выравнивании по левому краю
    const lists = element.querySelectorAll('ul');
    lists.forEach(ul => {
      if (align === 'left') {
        ul.style.listStyleType = 'disc'; // Возвращаем точки
        ul.style.paddingLeft = '20px';
      } else {
        ul.style.listStyleType = 'none'; // Убираем точки
        ul.style.paddingLeft = '0';
      }
    });
  });
}

/**
 * Apply design theme to resume
 */
function applyDesign(designId: string): void {
  const design = DESIGNS.find(d => d.id === designId);
  if (!design) return;
  
  // Remove all existing theme classes
  const bodyClasses = Array.from(document.body.classList);
  bodyClasses.forEach(cls => {
    if (cls.startsWith('theme-')) {
      document.body.classList.remove(cls);
    }
  });
  
  // Add new theme class
  document.body.classList.add(design.cssClass);
  currentDesign = designId;
  
  // Save to localStorage
  localStorage.setItem('resume-design', designId);
  
  // Update select dropdown
  const designSelect = document.getElementById('design-select') as HTMLSelectElement;
  if (designSelect) {
    designSelect.value = designId;
  }
}

/**
 * Initialize design selector dropdown
 */
function initializeDesignSelector(): void {
  const designSelect = document.getElementById('design-select') as HTMLSelectElement;
  if (!designSelect) return;

  buildDesignOptions(designSelect);
  applyStoredDesign(designSelect);
  setupDesignChangeHandler(designSelect);
}

/**
 * Build HTML options for design selector grouped by category
 */
function buildDesignOptions(designSelect: HTMLSelectElement): void {
  designSelect.innerHTML = '';
  let currentCategory = '';
  DESIGNS.forEach(design => {
    if (design.category !== currentCategory) {
      if (currentCategory !== '' ) {
        const lastOptgroup = designSelect.querySelector('optgroup:last-child');
        if (lastOptgroup) designSelect.appendChild(lastOptgroup);
      }
      const optgroup = document.createElement('optgroup');
      optgroup.label = design.category.charAt(0).toUpperCase() + design.category.slice(1);
      optgroup.dataset.category = design.category;
      currentCategory = design.category;
    }
    const option = document.createElement('option');
    option.value = design.id;
    option.textContent = `${design.name} — ${design.description}`;
    option.dataset.category = design.category;
    let targetOptgroup = designSelect.querySelector(`optgroup[data-category="${design.category}"]`);
    if (!targetOptgroup) {
      targetOptgroup = document.createElement('optgroup');
      (targetOptgroup as HTMLOptGroupElement).label = design.category.charAt(0).toUpperCase() + design.category.slice(1);
      (targetOptgroup as HTMLElement).dataset.category = design.category;
      designSelect.appendChild(targetOptgroup);
    }
    targetOptgroup.appendChild(option);
  });
}

/**
 * Apply stored design from localStorage
 */
function applyStoredDesign(designSelect: HTMLSelectElement): void {
  const savedDesign = localStorage.getItem('resume-design') || 'classic';
  if (DESIGNS.some(d => d.id === savedDesign)) {
    designSelect.value = savedDesign;
    currentDesign = savedDesign;
  }
}

/**
 * Setup change handler for design selector
 */
function setupDesignChangeHandler(designSelect: HTMLSelectElement): void {
  designSelect.addEventListener('change', (e) => {
    const selectedDesign = (e.target as HTMLSelectElement).value;
    applyDesign(selectedDesign);
  });
}

/**
 * Handle random design button click
 */
function handleRandomDesign(): void {
  const randomDesign = getRandomDesign();
  applyDesign(randomDesign.id);
  
  // Visual feedback animation
  const btn = document.getElementById('random-design-btn');
  if (btn) {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = 'scale(1)';
    }, 100);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('resume-container');
  const loader = document.getElementById('loader');
  const loadingOverlay = document.getElementById('loading-overlay');
  if (!container) return;
  
  // Load saved theme state
  const savedTheme = localStorage.getItem('resume-theme');
  let isDarkTheme = savedTheme === 'dark';
  if (isDarkTheme) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
  
  // Load saved language or default
  const savedLang = localStorage.getItem('resume-lang') as Lang | null;
  if (savedLang && ['en', 'ru', 'ko'].includes(savedLang)) {
    currentLang = savedLang;
  }
  
  // Initial render
  updateUI(defaultData, container);
  updateInterfaceLanguage(currentLang);
  
  // Show editable hint after a short delay
  setTimeout(() => showEditableHint(), 2000);
  
  // Theme Toggle (Light/Dark for UI only) - Floating Button
  const themeToggleFloatingBtn = document.getElementById('theme-toggle-floating');
  themeToggleFloatingBtn?.addEventListener('click', () => {
    isDarkTheme = !isDarkTheme;
    if (isDarkTheme) {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeToggleFloatingBtn.textContent = '☀️';
      localStorage.setItem('resume-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeToggleFloatingBtn.textContent = '🌙';
      localStorage.setItem('resume-theme', 'light');
    }
  });
  
  // Set initial button icon based on saved theme
  if (themeToggleFloatingBtn) {
    themeToggleFloatingBtn.textContent = isDarkTheme ? '☀️' : '🌙';
  }

  // Language Selector
  const langSelect = document.getElementById('lang-select') as HTMLSelectElement;
  if (langSelect) {
    langSelect.value = currentLang;
    langSelect.addEventListener('change', (e) => {
      const newLang = (e.target as HTMLSelectElement).value as Lang;
      updateInterfaceLanguage(newLang);
    });
  }

  // Initialize Design Selector with all 30 designs
  initializeDesignSelector();
  
  // Apply initial design from saved state
  applyDesign(currentDesign);

  // Random Design Button
  const randomDesignBtn = document.getElementById('random-design-btn');
  randomDesignBtn?.addEventListener('click', handleRandomDesign);

  // Text Alignment Buttons
  document.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const align = btn.getAttribute('data-align') as 'left' | 'center' | 'justify';
      if (align && container) {
        applyTextAlign(container, align);
        // Update active button state
        document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      }
    });
  });

  // GitHub Import with Loader and Validation
  const importBtn = document.getElementById('import-github');
  const githubInput = document.getElementById('github-url') as HTMLInputElement;

  importBtn?.addEventListener('click', async () => {
    const input = githubInput.value.trim();
    
    // Просто проверяем, что поле не пустое - валидация формата теперь в extractUsername
    if (!input) {
      showNotification(tr(currentLang, 'invalidUsername'), 'error');
      return;
    }
    
    try {
      if (loader) loader.style.display = 'block';
      if (loadingOverlay) loadingOverlay.classList.remove('hidden');
      importBtn.setAttribute('disabled', 'true');
      
      const data = await fetchGitHubResumeData(input);
      updateUI(data, container);
      showNotification(tr(currentLang, 'profileLoaded'), 'success');
      
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      // Показываем более точное сообщение об ошибке
      const isLookupFailure =
        errorMessage.includes('Invalid username') || errorMessage.includes('User not found');
      showNotification(
        tr(currentLang, isLookupFailure ? 'userNotFound' : 'rateLimited'),
        'error'
      );
    } finally {
      if (loader) loader.style.display = 'none';
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
      importBtn.removeAttribute('disabled');
    }
  });

  // JSON Export with notification
  document.getElementById('save-json')?.addEventListener('click', () => {
    if (!currentResumeData) return;
    const blob = new Blob([JSON.stringify(currentResumeData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume-${currentResumeData.personal.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification(tr(currentLang, 'jsonSaved'), 'success');
  });

  // PDF Export with notification
  document.getElementById('export-pdf')?.addEventListener('click', async () => {
    try {
      await exportService.exportToPdf('resume-container');
      showNotification(tr(currentLang, 'exportSuccess'), 'success');
    } catch (error) {
      console.error('PDF export error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showNotification(`${tr(currentLang, 'exportError')}: ${errorMessage}`, 'error');
    }
  });

  // ATS Check Button - Toggle panel visibility
  document.getElementById('ats-check')?.addEventListener('click', () => {
    logger.debug('ATS Check clicked');
    logger.debug('currentResumeData:', currentResumeData);
    
    if (!currentResumeData) {
      logger.error('No resume data available');
      return;
    }

    // Check if panel is already visible - if so, hide it
    const panel = document.getElementById('ats-panel');
    if (panel && !panel.classList.contains('hidden')) {
      panel.classList.add('hidden');
      return;
    }

    logger.debug('Analyzing resume:', {
      email: currentResumeData.personal.email,
      github: currentResumeData.personal.github,
      phone: currentResumeData.personal.phone,
      linkedin: currentResumeData.personal.linkedin,
      title: currentResumeData.personal.title,
      skillsCount: currentResumeData.skills?.length || 0,
      experienceCount: currentResumeData.experience?.length || 0
    });

    const result = atsService.analyze(currentResumeData);
    
    logger.debug('ATS Result:', {
      score: result.score,
      issuesCount: result.issues.length,
      issues: result.issues
    });
    
    showATSResultPanel(result);
  });
});

/**
 * Show a toast notification
 */
function showNotification(message: string, type: 'success' | 'error' = 'success'): void {
  // Remove existing notification if any
  const existing = document.getElementById('toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'toast-notification';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${type === 'success' ? '#4CAF50' : '#f44336'};
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
    font-size: 14px;
  `;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Show ATS result in sticky side panel (not modal)
 */
function showATSResultPanel(result: ATSResult): void {
  const panel = document.getElementById('ats-panel');
  const content = document.querySelector('.ats-panel-content');
  if (!panel || !content) return;
  
  // Build detailed breakdown if available
  const breakdownHtml = result.breakdown ? `
    <div class="ats-breakdown">
      <h4 class="ats-breakdown-title">\u{1F4C8} ${tr(currentLang, 'atsBreakdownTitle')}</h4>
      ${Object.entries(result.breakdown).map(([key, component]) => `
        <div class="ats-breakdown-item">
          <span class="ats-breakdown-label">${getBreakdownLabel(key)}</span>
          <div class="ats-breakdown-bar">
            <div class="ats-breakdown-fill" style="width: ${component.score}%"></div>
          </div>
          <span class="ats-breakdown-value">${Math.round(component.score)}% (${(component.weight * 100).toFixed(0)}%)</span>
        </div>
      `).join('')}
    </div>
  ` : '';
  
  // Build panel content
  content.innerHTML = `
    <div class="ats-panel-header">
      <span class="ats-panel-title">\u{1F4CA} ${tr(currentLang, 'atsScoreTitle')}</span>
      <span class="ats-panel-score ${getScoreClass(result.score)}">${result.score} / 100</span>
    </div>
    ${breakdownHtml}
    <div class="ats-panel-issues">
      <h4 class="ats-issues-title">\u{1F4CB} ${tr(currentLang, 'atsRecommendationsTitle')}</h4>
      ${result.issues.map(issue => `
        <div class="ats-panel-issue issue-${issue.type}">
          <span class="ats-panel-issue-icon">${getIssueIcon(issue.type)}</span>
          <span class="ats-panel-issue-text">${getIssueMessage(issue)}</span>
        </div>
      `).join('')}
    </div>
  `;
  
  panel.classList.remove('hidden');
}

/**
 * Get label for breakdown category
 */
function getBreakdownLabel(key: string): string {
  const icons: Record<string, string> = {
    structure: '\u{1F4CB}',
    keywords: '\u{1F511}',
    contacts: '\u{1F4DE}',
    format: '\u{1F4DD}',
    dates: '\u{1F4C5}',
    experience: '\u{1F4BC}',
    education: '\u{1F393}',
    summary: '\u{1F9FE}'
  };
  const labelKeys: Record<string, TranslationKey> = {
    structure: 'atsStructure',
    keywords: 'atsKeywords',
    contacts: 'atsContacts',
    format: 'atsFormat',
    dates: 'atsDates',
    experience: 'atsExperience',
    education: 'atsEducation',
    summary: 'atsSummary'
  };
  const labelKey = labelKeys[key];
  if (!labelKey) return key;
  return `${icons[key] ?? ''} ${tr(currentLang, labelKey)}`.trim();
}

/**
 * Get CSS class based on score
 */
function getScoreClass(score: number): string {
  if (score >= 80) return 'score-good';
  if (score >= 60) return 'score-medium';
  return 'score-low';
}

/**
 * Get icon for issue type
 */
function getIssueIcon(type: string): string {
  switch (type) {
    case 'success': return '✅';
    case 'warning': return '⚠';
    case 'error': return '❌';
    default: return '';
  }
}

/**
 * Get issue message text for display
 * The status icon is already rendered in the dedicated .ats-panel-issue-icon span,
 * so strip any leading status emoji from the message to avoid duplicate icons
 */
function getIssueMessage(issue: { type: string; message: string }): string {
  const iconType =
    issue.type === 'success' ? 'pass' :
    issue.type === 'error' ? 'fail' :
    issue.type === 'warning' ? 'warning' : undefined;
  return cleanDuplicateEmojis(issue.message, iconType);
}

/**
 * Show editable hint notification
 */
function showEditableHint(): void {
  const hintEl = document.getElementById('editable-hint');
  if (!hintEl) return;
  
  hintEl.textContent = `\u{1F4A1} ${tr(currentLang, 'editableHint')}`;
  hintEl.style.cssText = `
    position: fixed;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 10px 20px;
    border-radius: 20px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    z-index: 9999;
    font-size: 13px;
    animation: slideIn 0.5s ease-out;
    white-space: nowrap;
    pointer-events: none;
  `;
  hintEl.style.opacity = '1';
  hintEl.style.pointerEvents = 'auto';
  
  // Hide after 5 seconds
  setTimeout(() => {
    hintEl.style.opacity = '0';
    hintEl.style.pointerEvents = 'none';
    hintEl.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      hintEl.textContent = '';
    }, 500);
  }, 5000);
}
