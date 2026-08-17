import { describe, it, expect } from 'vitest';
import { renderResume } from '../src/resume-builder';
import type { ResumeData } from '../src/types';

describe('Resume Builder', () => {
  const mockData: ResumeData = {
    personal: {
      name: 'John Doe',
      title: 'Software Engineer',
      email: 'john@example.com',
      phone: '+1234567890',
      location: 'New York, USA',
      github: 'github.com/johndoe'
    },
    experience: [
      {
        institution: 'Acme Corp',
        role: 'Senior Developer',
        period: '2020 - Present',
        description: [
          'Developed modern web applications',
          'Led a team of 5 developers'
        ]
      }
    ],
    education: [
      {
        institution: 'Tech University',
        role: 'B.S. Computer Science',
        period: '2016 - 2020',
        description: ['GPA: 3.8/4.0']
      }
    ],
    skills: [
      'TypeScript',
      'React',
      {
        category: 'Tools',
        items: ['Git', 'Docker']
      }
    ]
  };

  it('should render resume without throwing errors', () => {
    const container = document.createElement('div');
    expect(() => renderResume(mockData, container)).not.toThrow();
  });

  it('should render header with personal information', () => {
    const container = document.createElement('div');
    renderResume(mockData, container);
    
    const header = container.querySelector('.resume-header');
    expect(header).toBeTruthy();
    expect(container.textContent).toContain('John Doe');
    expect(container.textContent).toContain('Software Engineer');
  });

  it('should render experience section', () => {
    const container = document.createElement('div');
    renderResume(mockData, container);
    
    expect(container.textContent).toContain('Experience');
    expect(container.textContent).toContain('Acme Corp');
    expect(container.textContent).toContain('Senior Developer');
  });

  it('should render education section', () => {
    const container = document.createElement('div');
    renderResume(mockData, container);
    
    expect(container.textContent).toContain('Education');
    expect(container.textContent).toContain('Tech University');
  });

  it('should render skills section', () => {
    const container = document.createElement('div');
    renderResume(mockData, container);
    
    expect(container.textContent).toContain('Skills');
    expect(container.textContent).toContain('TypeScript');
    expect(container.textContent).toContain('Tools');
  });

  it('should use textContent instead of innerHTML for security', () => {
    const maliciousData: ResumeData = {
      ...mockData,
      personal: {
        ...mockData.personal,
        name: '<script>alert("xss")</script>'
      }
    };
    
    const container = document.createElement('div');
    renderResume(maliciousData, container);
    
    // Script tags should be escaped as text, not executed
    expect(container.innerHTML).not.toContain('<script>');
    expect(container.textContent).toContain('<script>alert("xss")</script>');
  });
});
