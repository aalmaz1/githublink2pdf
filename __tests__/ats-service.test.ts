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

      expect(result.issues.some(i => i.message === 'Email is missing')).toBe(true);
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

      expect(result.issues.some(i => i.message === 'Skills section is empty')).toBe(true);
      // Verify the error issue type is present
      expect(result.issues.some(i => i.type === 'error')).toBe(true);
    });
  });

  describe('missing projects/experience', () => {
    it('should report an error when neither experience nor projects exist', () => {
      const resumeWithoutProjects: ResumeData = {
        ...createFullResume(),
        experience: []
      };

      const result = atsService.analyze(resumeWithoutProjects);

      expect(
        result.issues.some(i => i.message === 'No experience or projects listed')
      ).toBe(true);
      expect(result.issues.some(i => i.type === 'error')).toBe(true);
    });

    it('should credit projects but still ask for work experience', () => {
      // A self-taught developer: no job, no degree, only shipped code.
      const noEvidence: ResumeData = {
        personal: {
          name: 'Jane Roe',
          title: 'Builds data tooling for small teams',
          email: 'jane@example.com',
          phone: '+1-234-567-8900',
          location: 'Berlin, DE',
          github: 'github.com/janeroe'
        },
        education: [],
        experience: [],
        skills: [{ category: 'Languages', items: ['TypeScript', 'Python'] }]
      };
      const withProjects: ResumeData = {
        ...noEvidence,
        projects: [
          {
            institution: 'Personal / Open Source',
            role: 'Analytics Toolkit',
            period: '2021 — 2023',
            description: ['Processed 2M records per run using Python and SQL.']
          }
        ]
      };

      const result = atsService.analyze(withProjects);

      expect(
        result.issues.some(i =>
          i.message.includes('Projects are listed but work experience is missing')
        )
      ).toBe(true);
      // Verifiable project work must score better than an empty resume...
      expect(result.score).toBeGreaterThan(atsService.analyze(noEvidence).score);
      // ...but must not be treated as equal to real employment.
      expect(result.score).toBeLessThan(atsService.analyze(createFullResume()).score);
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

      expect(result.issues.some(i => i.message === 'Summary is too short')).toBe(true);
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

      expect(result.issues.some(i => i.message === 'Missing LinkedIn')).toBe(true);
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

  describe('date parsing', () => {
    const withPeriods = (periods: string[]): ResumeData => ({
      ...createFullResume(),
      education: [],
      experience: periods.map((period, i) => ({
        institution: 'Company ' + i,
        role: 'Software Engineer',
        period,
        description: [
          'Developed TypeScript services and React interfaces improving latency by 30 percent'
        ]
      }))
    });

    const dateMessages = (data: ResumeData): string[] =>
      atsService.analyze(data).issues.filter(i => i.category === 'dates').map(i => i.message);

    it('should treat an open-ended current role as a range, not a format mismatch', () => {
      const messages = dateMessages(withPeriods(['2020 - Present', '2016 - 2020']));
      expect(messages.some(m => m.includes('Inconsistent date formats'))).toBe(false);
    });

    it('should accept "to" as a range separator', () => {
      const messages = dateMessages(withPeriods(['2016 to 2020', '2012 to 2016']));
      expect(messages.some(m => m.includes('not in reverse chronological order'))).toBe(false);
      expect(messages.some(m => m.includes('employment gap'))).toBe(false);
    });

    it('should not split month names containing "t" or "o" (e.g. Oct)', () => {
      const messages = dateMessages(withPeriods(['Oct 2020 - Present', 'Jan 2016 - Sep 2020']));
      expect(messages.some(m => m.includes('Inconsistent date formats'))).toBe(false);
      expect(messages.some(m => m.includes('not in reverse chronological order'))).toBe(false);
    });

    it('should still flag entries listed out of reverse chronological order', () => {
      const messages = dateMessages(withPeriods(['2012 - 2016', '2016 - 2020']));
      expect(messages.some(m => m.includes('not in reverse chronological order'))).toBe(true);
    });

    it('should still flag a real employment gap', () => {
      const messages = dateMessages(withPeriods(['2020 - 2022', '2012 - 2015']));
      expect(messages.some(m => m.includes('employment gap'))).toBe(true);
    });
  });

  describe('issue message text', () => {
    it('should not embed status emoji in messages (status icon is rendered separately)', () => {
      const statusEmojiPattern = /^[✅✔️✓⚠️⚠❗❌✖️×💡]\s*/;

      const results = [
        atsService.analyze(createFullResume()),
        atsService.analyze(createEmptyResume())
      ];

      for (const result of results) {
        expect(result.issues.length).toBeGreaterThan(0);
        for (const issue of result.issues) {
          expect(statusEmojiPattern.test(issue.message)).toBe(false);
        }
      }
    });
  });
  describe('whole-word keyword matching', () => {
    it('should not count technical keywords hidden inside unrelated words', () => {
      // "restaurant" contains "rest", "going" contains "go",
      // "available" contains "ai". Substring matching scored a chef as a
      // technical candidate.
      const chef: ResumeData = {
        personal: {
          name: 'Maria Gonzalez',
          title: 'Pastry Chef',
          email: 'maria@example.com',
          phone: '+34 600 000 000',
          location: 'Lyon',
          github: '',
          linkedin: ''
        },
        education: [],
        experience: [{
          institution: 'Michelin restaurant',
          role: 'Pastry Chef',
          period: '2019 - 2024',
          description: [
            'Ran the dessert station and everything going out of the pass was available on time.',
            'Trained six junior cooks and cut ingredient waste across the kitchen brigade.'
          ]
        }],
        skills: [{ category: 'Kitchen', items: ['plating', 'chocolate work', 'gelato'] }]
      };

      const result = atsService.analyze(chef);

      expect(
        result.issues.some(i => i.message.includes('No role-relevant keywords found'))
      ).toBe(true);
      expect(result.breakdown.keywords.score).toBe(0);
    });

    it('should still match real keywords that appear as whole words', () => {
      const result = atsService.analyze(createFullResume());

      expect(
        result.issues.some(i => /technical keywords|keywords presence|keyword/i.test(i.message))
      ).toBe(true);
      expect(result.breakdown.keywords.score).toBeGreaterThan(0);
    });

    it('should not treat "led" inside "settled" as an action verb', () => {
      const noVerbs: ResumeData = {
        ...createFullResume(),
        experience: [{
          institution: 'Front Desk Ltd',
          role: 'Receptionist',
          period: '2020 - 2023',
          description: ['Handled complaints and settled billing disputes at the front desk.']
        }]
      };

      const result = atsService.analyze(noVerbs);

      expect(
        result.issues.some(i => i.message.includes('Use action verbs'))
      ).toBe(true);
    });
  });

  describe('quantifiable achievement detection', () => {
    it('should count every metric bullet, not every other one', () => {
      // The shared patterns used to carry the /g flag, so a stateful
      // lastIndex made repeated .test() calls skip alternating bullets.
      const metrics: ResumeData = {
        ...createFullResume(),
        experience: [{
          institution: 'Scale Co',
          role: 'Engineer',
          period: '2020 - 2024',
          description: [
            'Reduced p99 latency by 40% for the checkout service across all regions.',
            'Reduced infrastructure spend by 25% on the data pipeline over two quarters.',
            'Reduced onboarding time by 30% for new engineers with better documentation.',
            'Reduced flaky tests by 80% so the pipeline stopped blocking daily releases.'
          ]
        }]
      };

      const result = atsService.analyze(metrics);
      const message = result.issues.find(i => i.message.includes('quantifiable achievements'));

      expect(message?.message).toContain('4');
    });

    it('should be deterministic across repeated analyses of the same resume', () => {
      const resume = createFullResume();
      const scores = [1, 2, 3, 4, 5].map(() => atsService.analyze(resume).score);

      expect(new Set(scores).size).toBe(1);
    });

    it('should not treat an unmeasured claim as a quantified achievement', () => {
      const vague: ResumeData = {
        ...createFullResume(),
        experience: [{
          institution: 'Vague Corp',
          role: 'Engineer',
          period: '2020 - 2024',
          description: [
            'Improved performance of the service and optimized the database layer.',
            'Reduced complexity of the codebase while increasing developer happiness.'
          ]
        }]
      };

      const result = atsService.analyze(vague);

      expect(
        result.issues.some(i => i.message.includes('No quantified achievements'))
      ).toBe(true);
    });
  });

  describe('summary component', () => {
    it('should score the headline instead of reporting a permanent zero', () => {
      const result = atsService.analyze(createFullResume());

      expect(result.breakdown.summary.weight).toBeGreaterThan(0);
      expect(result.breakdown.summary.score).toBeGreaterThan(0);
    });

    it('should flag a missing headline', () => {
      const noTitle: ResumeData = {
        ...createFullResume(),
        personal: { ...createFullResume().personal, title: '' }
      };

      const result = atsService.analyze(noTitle);

      expect(result.breakdown.summary.score).toBe(0);
      expect(
        result.issues.some(i => i.category === 'summary' && i.message.includes('headline is empty'))
      ).toBe(true);
    });

    it('should rank a keyword-bearing headline above a bare one', () => {
      const base = createFullResume();
      const bare: ResumeData = { ...base, personal: { ...base.personal, title: 'Employee' } };
      const specific: ResumeData = {
        ...base,
        personal: { ...base.personal, title: 'Backend Engineer specialising in Python and Kubernetes' }
      };

      expect(atsService.analyze(specific).breakdown.summary.score)
        .toBeGreaterThan(atsService.analyze(bare).breakdown.summary.score);
    });
  });

  describe('score weighting', () => {
    it('should use component weights that sum to 1 for every profile', () => {
      const profiles: ResumeData[] = [
        createFullResume(),
        { ...createFullResume(), personal: { ...createFullResume().personal, title: 'Marketing Director' } },
        { ...createFullResume(), personal: { ...createFullResume().personal, title: 'Product Designer' } },
        { ...createEmptyResume(), personal: { ...createEmptyResume().personal, title: 'Computer Science student' } }
      ];

      for (const resume of profiles) {
        const { breakdown } = atsService.analyze(resume);
        const total = Object.values(breakdown)
          .filter((component): component is NonNullable<typeof component> => !!component)
          .reduce((sum, component) => sum + component.weight, 0);

        expect(total).toBeCloseTo(1, 5);
      }
    });
  });

  describe('issue severity', () => {
    it('should not report a recommended-only contact field as an error', () => {
      const result = atsService.analyze({
        ...createFullResume(),
        personal: { ...createFullResume().personal, linkedin: '' }
      });

      const linkedIn = result.issues.find(i => i.message === 'Missing LinkedIn');

      expect(linkedIn?.type).toBe('warning');
    });

    it('should report issues in English only', () => {
      const results = [
        atsService.analyze(createFullResume()),
        atsService.analyze(createEmptyResume())
      ];

      for (const result of results) {
        for (const issue of result.issues) {
          expect(issue.message).not.toMatch(/[\u0400-\u04FF]/);
        }
      }
    });
  });

  describe('ideal resume', () => {
    it('should reach a perfect score when every criterion is met', () => {
      const ideal: ResumeData = {
        ...createFullResume(),
        personal: { ...createFullResume().personal, title: 'Senior Full Stack Engineer — TypeScript, React, Node.js' },
        experience: [
          {
            institution: 'Tech Corp',
            role: 'Senior Developer',
            period: '2020 - Present',
            description: [
              'Led the migration of a legacy dashboard to TypeScript and React, cutting page load time by 42%.',
              'Designed and shipped a REST API serving 1.2M requests per day with 99.95% uptime.',
              'Mentored 4 junior engineers and introduced code review guidelines adopted across 3 teams.',
              'Automated deployments with Docker and Kubernetes, reducing release time from 3 hours to 20 minutes.'
            ]
          },
          {
            institution: 'Startup Inc',
            role: 'Full Stack Developer',
            period: '2017 - 2020',
            description: [
              'Reduced CI pipeline duration from 18 to 6 minutes by parallelising builds and caching dependencies.',
              'Implemented automated regression tests, lowering production defects by 35% over two quarters.',
              'Optimised PostgreSQL queries and indexing, improving p95 response time from 800ms to 180ms.',
              'Built a customer analytics dashboard in React that increased weekly active usage by 28%.'
            ]
          },
          {
            institution: 'Web Agency',
            role: 'Junior Developer',
            period: '2014 - 2017',
            description: [
              'Containerised 12 services with Docker and Kubernetes, enabling zero-downtime deployments.',
              'Collaborated with designers in Figma to deliver responsive React interfaces for 40 client projects.',
              'Wrote 60+ Jest unit tests and helped raise code coverage from 62% to 91%.'
            ]
          }
        ],
        skills: [
          'TypeScript', 'JavaScript', 'React', 'Node.js', 'HTML', 'CSS', 'Git', 'SQL', 'PostgreSQL',
          'Docker', 'Kubernetes', 'AWS', 'Python', 'REST', 'GraphQL', 'CI/CD', 'Agile', 'Scrum',
          'TDD', 'Linux', 'Bash', 'Jest'
        ]
      };

      const result = atsService.analyze(ideal);

      expect(result.score).toBe(100);
    });

    it('should name real entries and keywords instead of generic advice', () => {
      const weakResume: ResumeData = {
        ...createFullResume(),
        skills: ['Cooking', 'Gardening', 'Photography'],
        experience: [{
          institution: 'Tech Corp',
          role: 'Senior Developer',
          period: '2020 - Present',
          description: ['Improved the developer workflow', 'Managed a small team']
        }]
      };

      const result = atsService.analyze(weakResume);

      const keywordAdvice = result.issues.find(issue =>
        issue.category === 'keywords' && issue.message.includes('technical keywords')
      );
      const formatAdvice = result.issues.find(issue =>
        issue.category === 'format' && issue.message.includes('quantifiable achievements')
      );

      expect(keywordAdvice?.message).toMatch(/(Docker|AWS|Kubernetes|SQL|CI\/CD|GraphQL)/);
      expect(formatAdvice?.message).toMatch(/Senior Developer \(Tech Corp\)/);
    });
  });

  describe('job description keyword matching', () => {
    it('should expose found and missing keywords derived from the job description', () => {
      const atsService = new ATSService();
      const resume = createFullResume();
      atsService.setJobDescription(
        'Looking for a Senior Software Engineer who knows TypeScript, React, PostgreSQL and Kubernetes.'
      );

      const result = atsService.analyze(resume);

      expect(result.foundKeywords).toBeDefined();
      expect(result.foundKeywords!.length).toBeGreaterThan(0);
      expect(result.foundKeywords!.map(k => k.toLowerCase()))
        .toEqual(expect.arrayContaining(['typescript', 'react']));

      expect(result.missingKeywords!.map(k => k.toLowerCase())).toContain('kubernetes');
    });

    it('should report all job keywords as found when the resume covers them', () => {
      const atsService = new ATSService();
      const resume = createFullResume();
      atsService.setJobDescription('We use TypeScript, React and Docker.');

      const result = atsService.analyze(resume);

      expect(result.missingKeywords).toHaveLength(0);
      expect(result.foundKeywords!.map(k => k.toLowerCase()))
        .toEqual(expect.arrayContaining(['typescript', 'react', 'docker']));
    });

    it('should still expose keyword arrays when no job description is set', () => {
      const atsService = new ATSService();
      const result = atsService.analyze(createFullResume());

      expect(result.foundKeywords).toBeDefined();
      expect(result.missingKeywords).toBeDefined();
    });
  });
});
