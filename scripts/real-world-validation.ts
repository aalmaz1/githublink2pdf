import { ATSService } from '../src/services/ATSService';
import { ResumeData } from '../src/types';
import * as fs from 'fs';
import * as path from 'path';

// Real-world validation dataset - resumes that represent actual use cases
const realWorldDataset: Array<{ resume: ResumeData; description: string }> = [
  {
    description: 'Entry-level software developer',
    resume: {
      personal: {
        name: 'Alex Johnson',
        title: 'Junior Software Developer',
        email: 'alex.johnson@email.com',
        phone: '+1-555-987-6543',
        location: 'Austin, TX',
        github: 'github.com/alexj',
        linkedin: 'linkedin.com/in/alexjohnson'
      },
      education: [
        {
          institution: 'University of Texas',
          role: 'B.S. Computer Science',
          period: '2019 - 2023',
          description: ['GPA: 3.6/4.0', 'Capstone Project: E-commerce Platform']
        }
      ],
      experience: [
        {
          institution: 'Tech Startup',
          role: 'Software Engineering Intern',
          period: 'Summer 2022',
          description: [
            'Developed React components for customer dashboard',
            'Wrote unit tests using Jest',
            'Collaborated with team using Git'
          ]
        }
      ],
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js', 'Git', 'HTML', 'CSS']
    }
  },
  {
    description: 'Mid-level data scientist',
    resume: {
      personal: {
        name: 'Sarah Chen',
        title: 'Data Scientist with expertise in machine learning and statistical analysis',
        email: 'sarah.chen@email.com',
        phone: '+1-555-234-5678',
        location: 'Seattle, WA',
        github: 'github.com/sarachen',
        linkedin: 'linkedin.com/in/sarahchen'
      },
      education: [
        {
          institution: 'Stanford University',
          role: 'M.S. Data Science',
          period: '2018 - 2020',
          description: ['Thesis: Deep Learning for NLP']
        },
        {
          institution: 'UC Berkeley',
          role: 'B.S. Statistics',
          period: '2014 - 2018',
          description: ['Minor in Computer Science']
        }
      ],
      experience: [
        {
          institution: 'Amazon',
          role: 'Data Scientist II',
          period: '2020 - Present',
          description: [
            'Built ML models for product recommendations using Python and TensorFlow',
            'Analyzed large datasets with pandas and SQL',
            'Deployed models to AWS SageMaker'
          ]
        },
        {
          institution: 'Microsoft',
          role: 'Data Science Intern',
          period: 'Summer 2019',
          description: [
            'Developed predictive models for Azure usage forecasting',
            'Created data visualizations with matplotlib and seaborn'
          ]
        }
      ],
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL', 'pandas', 'AWS', 'Statistics', 'R']
    }
  },
  {
    description: 'Career changer - bootcamp graduate',
    resume: {
      personal: {
        name: 'Michael Brown',
        title: 'Full Stack Web Developer',
        email: 'michael.brown@email.com',
        phone: '',
        location: 'Denver, CO',
        github: 'github.com/mikebrown',
        linkedin: 'linkedin.com/in/michaelbrown'
      },
      education: [
        {
          institution: 'General Assembly',
          role: 'Software Engineering Immersive',
          period: '2023',
          description: ['Full-stack JavaScript development']
        }
      ],
      experience: [
        {
          institution: 'Previous Career (Non-tech)',
          role: 'Project Manager',
          period: '2018 - 2023',
          description: [
            'Led cross-functional teams',
            'Managed project timelines and budgets'
          ]
        }
      ],
      skills: ['JavaScript', 'React', 'Node.js', 'Express', 'MongoDB', 'HTML', 'CSS', 'Git']
    }
  },
  {
    description: 'Senior engineering manager',
    resume: {
      personal: {
        name: 'Jennifer Lee',
        title: 'Engineering Director | Building high-performing teams and scalable systems',
        email: 'jennifer.lee@email.com',
        phone: '+1-555-345-6789',
        location: 'San Francisco Bay Area',
        github: '',
        linkedin: 'linkedin.com/in/jenniferlee'
      },
      education: [
        {
          institution: 'MIT',
          role: 'M.S. Computer Science',
          period: '2008 - 2010',
          description: []
        }
      ],
      experience: [
        {
          institution: 'Google',
          role: 'Engineering Director',
          period: '2018 - Present',
          description: [
            'Leading a team of 25 engineers across 5 product areas',
            'Defined technical strategy and architecture for core platform',
            'Improved team velocity by 40% through process optimization'
          ]
        },
        {
          institution: 'Facebook',
          role: 'Senior Engineering Manager',
          period: '2014 - 2018',
          description: [
            'Managed infrastructure team supporting billions of users',
            'Launched key features driving user engagement'
          ]
        }
      ],
      skills: ['Leadership', 'Strategy', 'System Design', 'Team Management', 'Agile', 'Cloud Architecture']
    }
  }
];

interface RealWorldResult {
  score: number;
  description: string;
  profile: string;
}

function validateRealWorld(): void {
  const atsService = new ATSService();
  const results: RealWorldResult[] = [];
  
  console.log('🌍 Running ATS Validation on Real-World Dataset...\n');
  
  for (const testCase of realWorldDataset) {
    const result = atsService.analyze(testCase.resume);
    
    // Detect profile type for reporting
    let profile = 'other';
    const text = JSON.stringify(testCase.resume).toLowerCase();
    if (/student|intern|graduate|junior|entry/.test(text)) {
      profile = 'student/junior';
    } else if (/senior|staff|principal|lead/.test(text)) {
      profile = 'senior';
    } else if (/manager|director|vp|chief/.test(text)) {
      profile = 'management';
    } else if (/designer|ux|ui/.test(text)) {
      profile = 'design';
    }
    
    results.push({
      score: result.score,
      description: testCase.description,
      profile
    });
    
    const statusIcon = result.score >= 70 ? '✅' : result.score >= 50 ? '⚠️' : '❌';
    console.log(`${statusIcon} ${testCase.description}`);
    console.log(`   Profile: ${profile}, Score: ${result.score}\n`);
  }
  
  const avgScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;
  const allAboveThreshold = results.every(r => r.score >= 50);
  
  console.log('='.repeat(60));
  console.log(`Average Score: ${avgScore.toFixed(1)}`);
  console.log(`All resumes above minimum threshold (50): ${allAboveThreshold ? 'Yes' : 'No'}`);
  
  // Create reports directory if it doesn't exist
  const reportsDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  // Save detailed report
  const report = {
    timestamp: new Date().toISOString(),
    totalResumes: results.length,
    averageScore: avgScore,
    results,
    metrics: {
      avgScore,
      minScore: Math.min(...results.map(r => r.score)),
      maxScore: Math.max(...results.map(r => r.score))
    }
  };
  
  const reportPath = path.join(reportsDir, 'real-world-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Fail if average score is too low
  if (avgScore < 50) {
    console.error('\n❌ Real-world validation FAILED - average score too low');
    process.exit(1);
  }
  
  console.log('\n✅ Real-world validation PASSED');
  process.exit(0);
}

validateRealWorld();
