import { faker } from '@faker-js/faker';
import { ResumeData } from './types';

/**
 * Generates a demo profile with realistic random data using Faker.js
 */
export function generateDemoProfile(): ResumeData {
  // Generate a list of 5-6 random IT skills from a predefined pool
  const skillPool = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++',
    'React', 'Vue', 'Angular', 'Svelte',
    'Node.js', 'Express', 'Django', 'Flask',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
    'Git', 'CI/CD', 'GraphQL', 'REST API',
    'SQL', 'MongoDB', 'PostgreSQL', 'Redis'
  ];
  
  const skills: (string | { category: string; items: string[] })[] = [];
  const selectedSkills = new Set<string>();
  
  // Select 5-6 random skills
  const numSkills = faker.number.int({ min: 5, max: 6 });
  for (let i = 0; i < numSkills; i++) {
    selectedSkills.add(faker.helpers.arrayElement(skillPool));
  }
  
  // Add some categorized skills
  skills.push(...Array.from(selectedSkills));
  skills.push({
    category: 'Tools',
    items: [faker.helpers.arrayElement(['VS Code', 'IntelliJ', 'WebStorm']), faker.helpers.arrayElement(['Figma', 'Sketch', 'Adobe XD'])]
  });

  // Generate 2-3 work experiences
  const experience: { institution: string; role: string; period: string; description: string[] }[] = [];
  const numExperiences = faker.number.int({ min: 2, max: 3 });
  
  for (let i = 0; i < numExperiences; i++) {
    const startDate = faker.date.past({ years: 5 - i });
    const endDate = i === 0 ? faker.date.recent() : faker.date.between({ from: startDate, to: new Date() });
    
    experience.push({
      institution: faker.company.name(),
      role: faker.person.jobTitle(),
      period: `${startDate.getFullYear()} - ${endDate.getFullYear()}`,
      description: [
        faker.lorem.sentence({ min: 10, max: 20 }),
        faker.lorem.sentence({ min: 10, max: 20 })
      ]
    });
  }

  // Generate education
  const education: { institution: string; role: string; period: string; description: string[] }[] = [
    {
      institution: `${faker.location.city()} University`,
      role: `B.S. ${faker.helpers.arrayElement(['Computer Science', 'Software Engineering', 'Information Technology', 'Data Science'])}`,
      period: `${faker.number.int({ min: 2016, max: 2019 })} - ${faker.number.int({ min: 2020, max: 2024 })}`,
      description: [
        `GPA: ${faker.number.float({ min: 3.0, max: 4.0, fractionDigits: 1 })}/4.0`,
        faker.lorem.sentence({ min: 8, max: 15 })
      ]
    }
  ];

  return {
    personal: {
      name: faker.person.fullName(),
      title: faker.person.jobTitle(),
      email: faker.internet.email(),
      phone: faker.phone.number(),
      location: `${faker.location.city()}, ${faker.location.country()}`,
      github: `github.com/${faker.internet.userName()}`,
      linkedin: `linkedin.com/in/${faker.internet.userName()}`
    },
    education,
    experience,
    skills
  };
}
