"use strict";
/**
 * ATS Checker Panel Component with i18n Support
 *
 * This module provides the ATS Checker panel functionality with:
 * - Proper localization of all messages
 * - Duplicate emoji removal from issue text
 * - Translated section headers
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderIssueItem = renderIssueItem;
exports.renderATSPanel = renderATSPanel;
exports.getSectionHeader = getSectionHeader;
const index_1 = require("./i18n/index");
/**
 * Render a single ATS issue item with proper icon and localized text
 * Removes duplicate emojis from the message if icon is displayed separately
 */
function renderIssueItem(issue) {
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
    const translatedMessage = (0, index_1.mapServerMessage)(issue.message);
    // Then, clean any duplicate emojis since we already have an icon
    const cleanedMessage = (0, index_1.cleanDuplicateEmojis)(translatedMessage, issue.status);
    textContainer.textContent = cleanedMessage;
    container.appendChild(iconContainer);
    container.appendChild(textContainer);
    return container;
}
/**
 * Render the complete ATS checker panel with localized content
 */
function renderATSPanel(result) {
    const panel = document.createElement('div');
    panel.className = 'ats-panel';
    // Localized title
    const title = document.createElement('h3');
    title.className = 'ats-panel-title';
    title.textContent = (0, index_1.t)('ats_checker.title', 'ATS Checker');
    // Score display
    const scoreContainer = document.createElement('div');
    scoreContainer.className = 'ats-score';
    scoreContainer.textContent = `${(0, index_1.t)('ats_checker.score', 'Score')}: ${result.score}%`;
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
function getSectionHeader(sectionName) {
    return (0, index_1.translateSection)(sectionName);
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
exports.default = {
    renderIssueItem,
    renderATSPanel,
    getSectionHeader,
};
