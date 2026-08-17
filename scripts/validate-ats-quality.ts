import { ATSService } from '../src/services/ATSService';
import { ResumeData } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

// Golden dataset - synthetic resumes with known expected scores
const goldenDataset: Array<{ resume: ResumeData; expectedScore: number; description: string }> = [
  {
    description: 'Empty resume - should score very low',
    expectedScore: 0,
    resume: {
      personal: { name: '', title: '', email: '', phone: '', location: '', github: '', linkedin: '' },
      education: [],
      experience: [],
      skills: []
    }
  },
  {
    description: 'Strong technical resume - should score high',
    expectedScore: 95,
    resume: {
      personal: {
        name: 'John Doe',
        title: 'Senior Software Engineer with 10+ years of experience in building scalable web applications',
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
          description: ['GPA: 3.8/4.0', "Dean's List"]
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
        }
      ],
      skills: [
        'TypeScript', 'JavaScript', 'React', 'Node.js', 'HTML', 'CSS',
        'Git', 'SQL', 'Docker', 'AWS', 'Python', 'MongoDB'
      ]
    }
  },
  {
    description: 'Student resume with projects - should score moderate-high',
    expectedScore: 90,
    resume: {
      personal: {
        name: 'Jane Student',
        title: 'Computer Science Student',
        email: 'jane@university.edu',
        phone: '',
        location: 'Boston, MA',
        github: 'github.com/janestudent',
        linkedin: ''
      },
      education: [
        {
          institution: 'University of Technology',
          role: 'B.S. Computer Science (Expected 2025)',
          period: '2021 - Present',
          description: ['GPA: 3.5/4.0', 'Relevant coursework: Data Structures, Algorithms']
        }
      ],
      experience: [],
      skills: ['Python', 'Java', 'JavaScript', 'HTML', 'CSS']
    }
  },
  {
    description: 'Resume missing contact info - should score low-moderate',
    expectedScore: 65,
    resume: {
      personal: {
        name: 'No Contact Person',
        title: 'Developer',
        email: '',
        phone: '',
        location: '',
        github: '',
        linkedin: ''
      },
      education: [],
      experience: [
        {
          institution: 'Some Company',
          role: 'Developer',
          period: '2020 - Present',
          description: ['Worked on various projects']
        }
      ],
      skills: ['JavaScript', 'TypeScript']
    }
  },
  {
    description: 'Design-focused resume - should score high based on design keywords',
    expectedScore: 90,
    resume: {
      personal: {
        name: 'Design Pro',
        title: 'UX/UI Designer with expertise in user research and prototyping',
        email: 'designer@example.com',
        phone: '+1-555-123-4567',
        location: 'New York, NY',
        github: 'github.com/designpro',
        linkedin: 'linkedin.com/in/designpro'
      },
      education: [
        {
          institution: 'Design School',
          role: 'BFA in Interaction Design',
          period: '2015 - 2019',
          description: ['Focus on user-centered design']
        }
      ],
      experience: [
        {
          institution: 'Creative Agency',
          role: 'UX Designer',
          period: '2019 - Present',
          description: [
            'Conducted user research and usability testing',
            'Created wireframes and prototypes in Figma',
            'Designed accessible interfaces following WCAG guidelines'
          ]
        }
      ],
      skills: ['Figma', 'Sketch', 'Adobe XD', 'Prototyping', 'User Research', 'Wireframing']
    }
  }
];

interface ValidationResult {
  passed: boolean;
  actualScore: number;
  expectedScore: number;
  difference: number;
  description: string;
}

function validateATSQuality(): void {
  const atsService = new ATSService();
  const results: ValidationResult[] = [];
  
  console.log('🧪 Running ATS Quality Validation on Golden Dataset...\n');
  
  let totalDifference = 0;
  
  for (const testCase of goldenDataset) {
    const result = atsService.analyze(testCase.resume);
    const difference = Math.abs(result.score - testCase.expectedScore);
    totalDifference += difference;
    
    const passed = difference <= 15; // Allow 15 point tolerance
    
    results.push({
      passed,
      actualScore: result.score,
      expectedScore: testCase.expectedScore,
      difference,
      description: testCase.description
    });
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status}: ${testCase.description}`);
    console.log(`   Expected: ${testCase.expectedScore}, Actual: ${result.score}, Difference: ${difference}\n`);
  }
  
  const passCount = results.filter(r => r.passed).length;
  const avgDifference = totalDifference / results.length;
  
  console.log('='.repeat(60));
  console.log(`Results: ${passCount}/${results.length} tests passed`);
  console.log(`Average score difference: ${avgDifference.toFixed(2)}`);
  
  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passedTests: passCount,
    averageDifference: avgDifference,
    results,
    metrics: {
      correlation: 1 - (avgDifference / 100), // Simple correlation metric
      mae: avgDifference
    }
  };
  
  const reportPath = path.join(reportsDir, 'golden-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Also save metrics.json for the CI workflow
  const metricsPath = path.join(reportsDir, 'metrics.json');
  fs.writeFileSync(metricsPath, JSON.stringify(report.metrics, null, 2));
  console.log(`📊 Metrics saved to: ${metricsPath}`);
  
  // Fail if too many tests fail or average difference is too high
  if (passCount < results.length * 0.8 || avgDifference > 20) {
    console.error('\n❌ ATS Quality validation FAILED');
    console.error(`   Pass rate: ${(passCount / results.length * 100).toFixed(1)}%`);
    console.error(`   Average difference: ${avgDifference.toFixed(2)} (threshold: 20)`);
    process.exit(1);
  }
  
  console.log('\n✅ ATS Quality validation PASSED');
  process.exit(0);
}

validateATSQuality();
