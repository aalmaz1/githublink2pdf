export type Lang = 'en' | 'ru' | 'ko';

export const translations = {
  en: {
    appTitle: 'Github Link2PDF Resume Builder',
    githubPlaceholder: 'Enter GitHub username (e.g. octocat)',
    exportBtn: 'Export PDF',
    languageLabel: 'Interface Language',
    resumeDesignLabel: 'Resume Design:',
    alignmentLabel: 'Alignment:',
    saveJsonBtn: 'Save JSON',
    alignLeft: 'Left',
    alignCenter: 'Center',
    alignJustify: 'Justify',
    invalidUsername: '⚠️ Please enter a valid GitHub username',
    exportSuccess: '✅ PDF exported successfully!',
    jsonSaved: '✅ JSON file downloaded'
  },
  ru: {
    appTitle: 'Github Link2PDF Resume Builder',
    githubPlaceholder: 'Введите имя пользователя GitHub (например, octocat)',
    exportBtn: 'Экспорт в PDF',
    languageLabel: 'Язык интерфейса',
    resumeDesignLabel: 'Дизайн резюме:',
    alignmentLabel: 'Выравнивание:',
    saveJsonBtn: 'Сохранить JSON',
    alignLeft: 'Левый',
    alignCenter: 'Центр',
    alignJustify: 'По ширине',
    invalidUsername: '⚠️ Введите корректное имя пользователя GitHub',
    exportSuccess: '✅ PDF успешно экспортирован!',
    jsonSaved: '✅ JSON файл загружен'
  },
  ko: {
    appTitle: 'Github Link2PDF Resume Builder',
    githubPlaceholder: 'GitHub 사용자명 입력 (예: octocat)',
    exportBtn: 'PDF 내보내기',
    languageLabel: '인터페이스 언어',
    resumeDesignLabel: '이력서 디자인:',
    alignmentLabel: '정렬:',
    saveJsonBtn: 'JSON 저장',
    alignLeft: '왼쪽',
    alignCenter: '중앙',
    alignJustify: '양쪽 맞춤',
    invalidUsername: '⚠️ 유효한 GitHub 사용자명을 입력하세요',
    exportSuccess: '✅ PDF 가 성공적으로 내보내졌습니다!',
    jsonSaved: '✅ JSON 파일이 다운로드되었습니다'
  }
};

export const defaultLang: Lang = 'en';
