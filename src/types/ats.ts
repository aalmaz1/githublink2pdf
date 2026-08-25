// src/types/ats.ts

export interface ATSIssue {
  type: 'error' | 'warning' | 'success' | 'info';
  message: string;
  category: 'structure' | 'contacts' | 'keywords' | 'format' | 'dates' | 'experience' | 'summary' | 'education' | 'projects';
  field?: string;
}

interface ATSScoreComponent {
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
  /**
   * Keywords drawn from a pasted job description that already appear in the
   * resume. Populated only when a job description was set, so the UI can render
   * a targeted "found / missing" keyword comparison instead of a generic list.
   */
  foundKeywords?: string[];
  /**
   * Keywords from the job description that the resume does not yet contain.
   * These are the concrete gaps the user should address for a specific role.
   */
  missingKeywords?: string[];
}

export type ResumeProfile = 'student' | 'technical' | 'management' | 'design' | 'other';
