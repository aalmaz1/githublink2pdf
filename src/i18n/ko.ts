/**
 * Korean UI strings. Imported lazily (dynamic chunk) on first use,
 * so the main bundle does not ship ru + ko dictionaries to en users.
 */
import type { TranslationDict } from '../translations';

const ko: TranslationDict = {
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
    importBtn: '가져오기',
    randomDesignBtn: '랜덤',
    atsCheckBtn: 'ATS 검사',
    loadingGitHub: 'GitHub 데이터를 불러오는 중...',
    invalidUsername: '유효한 GitHub 사용자명을 입력하세요',
    exportSuccess: 'PDF 가 성공적으로 내보내졌습니다!',
    exportError: 'PDF 내보내기 오류',
    jsonSaved: 'JSON 파일이 다운로드되었습니다',
    profileLoaded: '프로필을 성공적으로 불러왔습니다!',
    fillInExperience: 'GitHub은 경력과 학력을 알지 못합니다. 경력 및 학력 항목에 직접 입력하세요.',
    userNotFound: '사용자를 찾을 수 없거나 잘못된 형식입니다',
    rateLimited: '사용자를 찾을 수 없거나 API 한도를 초과했습니다',
    editableHint: '팁: 이력서의 텍스트를 클릭하여 직접 편집할 수 있습니다!',
    atsScoreTitle: 'ATS 점수',
    atsBreakdownTitle: '점수 상세',
    atsBreakdownLegend: '점수(전체 비중). 총점 기여도 = 점수 × 비중.',
    atsWeightLabel: '비중',
    atsWeightTitle: '전체 점수에서 이 항목의 비중',
    atsRecommendationsTitle: '권장 사항',
    atsStructure: '구조',
    atsKeywords: '키워드',
    atsContacts: '연락처',
    atsFormat: '형식',
    atsDates: '날짜',
    atsExperience: '경력',
    atsEducation: '학력',
    atsSummary: '요약',
    jobDescriptionPlaceholder: '특정 직무에 맞춰 이력서를 비교하려면 채용공고를 여기에 붙여넣으세요 (선택 사항)',
    jobMatchToggle: '직무 매칭',
    jobMatchTitle: '채용공고와 비교',
    foundInResume: '이력서에 있음',
    missingFromResume: '이력서에 없음',
  addToSkills: '기술에 추가',
  addedToSkills: '기술에 추가됨',
  noMissingKeywords: '채용공고의 모든 키워드가 이력서에 이미 있습니다',
  noJobDescription: '위에 채용공고를 붙여넣으면 해당 직무에 맞는 키워드 매칭을 볼 수 있습니다.',

  // Resume section headings (rendered by resume-builder.ts).
  resumeSectionExperience: '경력',
  resumeSectionProjects: '프로젝트',
  resumeSectionEducation: '학력',
  resumeSectionSkills: '기술',

  // Placeholder hints for empty resume entries, drawn via CSS `data-placeholder`.
  placeholderJobTitle: '직무',
  placeholderDegree: '학위',
  placeholderCompany: '회사',
  placeholderSchool: '학교',
  placeholderPeriod: '예: 2021 — 현재',
  placeholderAchievement: '수행한 작업과 달성한 결과'
};

export default ko;
