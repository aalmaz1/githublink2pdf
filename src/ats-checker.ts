/**
 * ATS Checker Panel Component with i18n Support
 * 
 * This module provides the ATS Checker panel functionality with:
 * - Proper localization of all messages
 * - Duplicate emoji removal from issue text
 * - Translated section headers
 */

import { t, mapServerMessage, cleanDuplicateEmojis, translateSection } from './i18n/index';

export interface ATSIssue {
  status: 'pass' | 'warning' | 'fail';
  message: string;
  section?: string;
}

export interface ATSResult {
  score: number;
  issues: ATSIssue[];
}

/**
 * Render a single ATS issue item with proper icon and localized text
 * Removes duplicate emojis from the message if icon is displayed separately
 */
export function renderIssueItem(issue: ATSIssue): HTMLElement {
  const container = document.createElement('div');
  container.className = 'ats-panel-issue';
  
  // Create icon container - this displays the status icon once
  const iconContainer = document.createElement('span');
  iconContainer.className = 'ats-panel-issue-icon';
  
  // Set icon based on status (only one emoji here)
  switch (issue.status) {
    case 'pass':
      iconContainer.textContent = '✅';
      break;
    case 'warning':
      iconContainer.textContent = '⚠️';
      break;
    case 'fail':
      iconContainer.textContent = '❌';
      break;
  }
  
  // Create text container - message is cleaned of duplicate leading emojis
  const textContainer = document.createElement('span');
  textContainer.className = 'ats-panel-issue-text';
  
  // First, translate the server message if it's in English
  const translatedMessage = mapServerMessage(issue.message);
  
  // Then, clean any duplicate emojis since we already have an icon
  const cleanedMessage = cleanDuplicateEmojis(translatedMessage, issue.status);
  
  textContainer.textContent = cleanedMessage;
  
  container.appendChild(iconContainer);
  container.appendChild(textContainer);
  
  return container;
}

/**
 * Render the complete ATS checker panel with localized content
 */
export function renderATSPanel(result: ATSResult): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'ats-panel';
  
  // Localized title
  const title = document.createElement('h3');
  title.className = 'ats-panel-title';
  title.textContent = t('ats_checker.title', 'ATS Checker');
  
  // Score display
  const scoreContainer = document.createElement('div');
  scoreContainer.className = 'ats-score';
  scoreContainer.textContent = `${t('ats_checker.score', 'Score')}: ${result.score}%`;
  
  // Issues list
  const issuesList = document.createElement('div');
  issuesList.className = 'ats-issues-list';
  
  for (const issue of result.issues) {
    issuesList.appendChild(renderIssueItem(issue));
  }
  
  panel.appendChild(title);
  panel.appendChild(scoreContainer);
  panel.appendChild(issuesList);
  
  return panel;
}

/**
 * Get localized section header text
 * Use this instead of hardcoded "Education" or "Summary"
 */
export function getSectionHeader(sectionName: string): string {
  return translateSection(sectionName);
}

/**
 * Example: How to use when rendering resume sections
 * Before (hardcoded):
 *   const header = document.createElement('h3');
 *   header.textContent = 'Education';
 * 
 * After (localized):
 *   const header = document.createElement('h3');
 *   header.textContent = getSectionHeader('Education');
 *   // or using t() directly:
 *   header.textContent = t('common.education');
 */

export default {
  renderIssueItem,
  renderATSPanel,
  getSectionHeader,
};
