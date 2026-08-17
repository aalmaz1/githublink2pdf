// src/types/ats.ts

export interface ATSIssue {
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  category: 'structure' | 'contacts' | 'keywords' | 'format' | 'dates' | 'experience' | 'summary' | 'education' | 'projects';
  field?: string;
}

export interface ATSScoreComponent {
  score: number;      // текущий балл (0-100)
  maxScore: number;   // максимальный балл для этого компонента
  weight: number;     // вес компонента в итоговой сумме
}

export interface ATSScoreBreakdown {
  structure: ATSScoreComponent;
  contacts: ATSScoreComponent;
  keywords: ATSScoreComponent;
  format: ATSScoreComponent;
  dates: ATSScoreComponent;
  experience: ATSScoreComponent;
  summary: ATSScoreComponent;
  education: ATSScoreComponent;
  projects?: ATSScoreComponent; // если используется
}

export interface ATSResult {
  score: number;
  issues: ATSIssue[];
  breakdown: ATSScoreBreakdown;
  profile?: string;
}

export type ResumeProfile = 'student' | 'technical' | 'management' | 'design' | 'other';
