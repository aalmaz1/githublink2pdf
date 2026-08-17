import { describe, it, expect } from 'vitest';
import { ATSService } from '../src/services/ATSService';
import { ResumeData } from '../src/types';

const createEmptyResume = (): ResumeData => ({
  personal: {
    name: '',
    title: '',
    email: '',
    phone: '',
    location: '',
    github: '',
    linkedin: ''
  },
  education: [],
  experience: [],
  skills: []
});

const createFullResume = (): ResumeData => ({
  personal: {
    name: 'John Doe',
    title: 'Senior Software Engineer with 10+ years of experience in building scalable web applications and leading development teams',
    email: 'john.doe@example.com',
    phone: '+1-234-567-8900',
    location: 'San Francisco, CA',
    github: 'github.com/johndoe',
    linkedin: 'linkedin.com/in/johndoe'
  },
  education: [
    {
      institution: 'University of Technology',
      role: 'B.S. Computer Science',
      period: '2010 - 2014',
      description: ['GPA: 3.8/4.0', 'Dean\'s List']
    }
  ],
  experience: [
    {
      institution: 'Tech Corp',
      role: 'Senior Developer',
      period: '2020 - Present',
      description: [
        'Led development of TypeScript-based microservices architecture',
        'Implemented React components for customer-facing dashboard',
        'Optimized SQL queries reducing response time by 40%'
      ]
    },
    {
      institution: 'Startup Inc',
      role: 'Full Stack Developer',
      period: '2017 - 2020',
      description: [
        'Built REST API using Node.js and Express',
        'Developed responsive UI with HTML, CSS, and JavaScript',
        'Containerized applications using Docker'
      ]
    },
    {
      institution: 'Web Agency',
      role: 'Junior Developer',
      period: '2014 - 2017',
      description: [
        'Created websites using Git for version control',
        'Integrated third-party APIs for payment processing'
      ]
    }
  ],
  skills: [
    'TypeScript',
    'JavaScript',
    'React',
    'Node.js',
    'HTML',
    'CSS',
    'Git',
    'SQL',
    'Docker',
    'AWS',
    'Python',
    'MongoDB'
  ]
});

describe('ATSService', () => {
  const atsService = new ATSService();

  describe('empty resume', () => {
    it('should return low score for empty resume', () => {
      const emptyResume = createEmptyResume();
      const result = atsService.analyze(emptyResume);

      expect(result.score).toBeLessThan(30);
      expect(result.issues.some(i => i.type === 'error')).toBe(true);
      expect(result.issues.some(i => i.message.includes('Email is missing'))).toBe(true);
    });
  });

  describe('full resume', () => {
    it('should return high score for complete resume', () => {
      const fullResume = createFullResume();
      const result = atsService.analyze(fullResume);

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.issues.some(i => i.message.includes('ATS-friendly'))).toBe(true);
    });
  });

  describe('missing email', () => {
    it('should report missing email as error', () => {
      const resumeWithoutEmail: ResumeData = {
        ...createFullResume(),
        personal: {
          ...createFullResume().personal,
          email: ''
        }
      };

      const result = atsService.analyze(resumeWithoutEmail);

      expect(result.issues.some(i => i.message === '❌ Email is missing')).toBe(true);
      // Verify the error issue type is present
      expect(result.issues.some(i => i.type === 'error')).toBe(true);
    });
  });

  describe('missing skills', () => {
    it('should report empty skills section as error', () => {
      const resumeWithoutSkills: ResumeData = {
        ...createFullResume(),
        skills: []
      };

      const result = atsService.analyze(resumeWithoutSkills);

      expect(result.issues.some(i => i.message === '❌ Skills section is empty')).toBe(true);
      // Verify the error issue type is present
      expect(result.issues.some(i => i.type === 'error')).toBe(true);
    });
  });

  describe('missing projects/experience', () => {
    it('should report no projects found as error', () => {
      const resumeWithoutProjects: ResumeData = {
        ...createFullResume(),
        experience: []
      };

      const result = atsService.analyze(resumeWithoutProjects);

      expect(result.issues.some(i => i.message === '❌ No projects found')).toBe(true);
      // Verify the error issue type is present
      expect(result.issues.some(i => i.type === 'error')).toBe(true);
    });
  });

  describe('missing summary/title', () => {
    it('should warn about empty summary', () => {
      const resumeWithoutSummary: ResumeData = {
        ...createFullResume(),
        personal: {
          ...createFullResume().personal,
          title: ''
        }
      };

      const result = atsService.analyze(resumeWithoutSummary);

      expect(result.issues.some(i => i.message.includes('Summary'))).toBe(true);
    });
  });

  describe('short summary', () => {
    it('should warn about short summary', () => {
      const resumeWithShortSummary: ResumeData = {
        ...createFullResume(),
        personal: {
          ...createFullResume().personal,
          title: 'Dev'
        }
      };

      const result = atsService.analyze(resumeWithShortSummary);

      expect(result.issues.some(i => i.message === '⚠ Summary is too short')).toBe(true);
    });
  });

  describe('keywords presence', () => {
    it('should reward resumes with 3+ keywords', () => {
      const resumeWithKeywords: ResumeData = {
        ...createFullResume(),
        skills: ['TypeScript', 'JavaScript', 'React', 'Node', 'HTML']
      };

      const result = atsService.analyze(resumeWithKeywords);

      expect(result.issues.some(i => i.message.includes('technical keywords'))).toBe(true);
    });

    it('should reward resumes with 5+ keywords', () => {
      const resumeWithManyKeywords: ResumeData = {
        ...createFullResume(),
        skills: ['TypeScript', 'JavaScript', 'React', 'Node', 'HTML', 'CSS', 'Git', 'API', 'SQL', 'Docker']
      };

      const result = atsService.analyze(resumeWithManyKeywords);

      expect(result.issues.some(i => i.message.includes('strong keywords'))).toBe(true);
    });
  });

  describe('missing keywords', () => {
    it('should warn about insufficient keywords', () => {
      const resumeWithoutKeywords: ResumeData = {
        ...createFullResume(),
        // Remove all keyword-containing skills and experience text
        skills: ['Cooking', 'Gardening', 'Photography'],
        experience: [
          {
            institution: 'Restaurant',
            role: 'Chef',
            period: '2020 - Present',
            description: ['Prepared delicious meals', 'Managed kitchen staff']
          }
        ]
      };

      const result = atsService.analyze(resumeWithoutKeywords);

      expect(result.issues.some(i => i.message.includes('Add more technical keywords'))).toBe(true);
    });
  });

  describe('score calculation', () => {
    it('should cap score at 100', () => {
      // Create an extremely strong resume
      const superResume: ResumeData = {
        personal: {
          name: 'Super Dev',
          title: 'Senior Full Stack Developer with extensive experience in modern web technologies including TypeScript, JavaScript, React, Node.js, HTML, CSS, and cloud infrastructure',
          email: 'super@dev.com',
          phone: '+1-111-222-3333',
          location: 'New York, NY',
          github: 'github.com/superdev',
          linkedin: 'linkedin.com/in/superdev'
        },
        education: [
          {
            institution: 'MIT',
            role: 'M.S. Computer Science',
            period: '2015 - 2017',
            description: ['Thesis on distributed systems', 'Published 3 papers']
          },
          {
            institution: 'Stanford',
            role: 'B.S. Computer Science',
            period: '2011 - 2015',
            description: ['GPA: 4.0/4.0', 'Summa Cum Laude']
          }
        ],
        experience: [
          {
            institution: 'Google',
            role: 'Staff Engineer',
            period: '2020 - Present',
            description: ['Leading TypeScript migration', 'Architecture design']
          },
          {
            institution: 'Facebook',
            role: 'Senior Engineer',
            period: '2017 - 2020',
            description: ['React core contributor', 'Performance optimization']
          },
          {
            institution: 'Amazon',
            role: 'Software Engineer',
            period: '2015 - 2017',
            description: ['AWS services development', 'API design']
          },
          {
            institution: 'Microsoft',
            role: 'Intern',
            period: '2014 - 2015',
            description: ['Azure development', 'Cloud infrastructure']
          },
          {
            institution: 'Apple',
            role: 'Intern',
            period: '2013 - 2014',
            description: ['iOS development', 'Swift programming']
          }
        ],
        skills: [
          'TypeScript',
          'JavaScript',
          'React',
          'Node.js',
          'HTML',
          'CSS',
          'Git',
          'API',
          'SQL',
          'Docker',
          'Kubernetes',
          'AWS',
          'Python',
          'Java',
          'Go'
        ]
      };

      const result = atsService.analyze(superResume);

      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should calculate correct points for contacts', () => {
      const resumeWithAllContacts: ResumeData = {
        ...createEmptyResume(),
        personal: {
          name: 'Test',
          title: 'Developer',
          email: 'test@test.com',
          phone: '123',
          location: 'NYC',
          github: 'github',
          linkedin: 'linkedin'
        },
        skills: ['TypeScript'],
        experience: [{
          institution: 'Company',
          role: 'Dev',
          period: '2020',
          description: ['Working with TypeScript and React']
        }],
        education: []
      };

      const result = atsService.analyze(resumeWithAllContacts);

      // Contacts: 15 (email) + 10 (github) + 10 (phone) + 5 (linkedin) = 40
      // Summary: 10 (has title)
      // Skills: 5 (1+ skill)
      // Projects: 5 (1+ project)
      // Experience: 10 (filled)
      // Keywords: depends on content
      expect(result.score).toBeGreaterThanOrEqual(40);
    });
  });

  describe('missing LinkedIn', () => {
    it('should report missing LinkedIn as error', () => {
      const resumeWithoutLinkedIn: ResumeData = {
        ...createFullResume(),
        personal: {
          ...createFullResume().personal,
          linkedin: ''
        }
      };

      const result = atsService.analyze(resumeWithoutLinkedIn);

      expect(result.issues.some(i => i.message === '❌ Missing LinkedIn')).toBe(true);
    });
  });

  describe('issue types', () => {
    it('should have error, warning, and success issue types', () => {
      const partialResume: ResumeData = {
        personal: {
          name: 'Partial',
          title: 'Dev',
          email: 'partial@test.com',
          phone: '',
          location: '',
          github: '',
          linkedin: ''
        },
        education: [],
        experience: [],
        skills: ['Skill1']
      };

      const result = atsService.analyze(partialResume);

      const hasError = result.issues.some(i => i.type === 'error');
      const hasWarning = result.issues.some(i => i.type === 'warning');
      const hasSuccess = result.issues.some(i => i.type === 'success');

      expect(hasError).toBe(true);
      expect(hasWarning).toBe(true);
      expect(hasSuccess).toBe(true);
    });
  });
});
