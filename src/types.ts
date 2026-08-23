interface PersonalDetails {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin?: string;
  github?: string;
}

export interface TimeBoundedEntity {
  institution: string;
  role: string;
  period: string;
  description: string[];
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface ResumeData {
  personal: PersonalDetails;
  education: TimeBoundedEntity[];
  experience: TimeBoundedEntity[];
  skills: (string | SkillCategory)[];
}
