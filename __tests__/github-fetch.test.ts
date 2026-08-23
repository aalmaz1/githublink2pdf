import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fetchGitHubResumeData } from '../src/github-provider';
import { githubCache } from '../src/utils/github-cache';

const profile = {
  login: 'octocat',
  name: 'The Octocat',
  bio: 'Building developer tools. Open source enthusiast.',
  email: null,
  location: 'San Francisco',
  html_url: 'https://github.com/octocat',
  blog: '',
  public_repos: 8,
  created_at: '2011-01-25T18:44:36Z'
};

const repos = [
  {
    name: 'hello-world',
    description: 'A tiny demo repository',
    language: 'TypeScript',
    topics: ['cli'],
    stargazers_count: 42,
    forks_count: 7,
    fork: false,
    homepage: '',
    created_at: '2020-02-01T00:00:00Z',
    updated_at: '2022-06-01T00:00:00Z'
  }
];

/** Build a fetch stub that serves the GitHub endpoints the provider calls. */
function mockGitHub(overrides: { user?: unknown; repos?: unknown; userStatus?: number; reposStatus?: number } = {}) {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes('/repos?')) {
      const status = overrides.reposStatus ?? 200;
      return {
        ok: status < 400,
        status,
        json: async () => overrides.repos ?? repos
      } as unknown as Response;
    }
    if (url.includes('/readme')) {
      return { ok: false, status: 404, json: async () => ({}) } as unknown as Response;
    }
    const status = overrides.userStatus ?? 200;
    return {
      ok: status < 400,
      status,
      json: async () => overrides.user ?? profile
    } as unknown as Response;
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

beforeEach(() => {
  // The provider memoises API responses, so each case needs a clean slate.
  githubCache.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchGitHubResumeData', () => {
  it('should map repositories to projects, not employment', async () => {
    mockGitHub();

    const data = await fetchGitHubResumeData('octocat');

    expect(data.projects?.length).toBe(1);
    expect(data.projects?.[0].role).toBe('Hello World');
    // The critical guarantee: a side project must never be labelled as a job.
    expect(data.experience).toEqual([]);
    expect(JSON.stringify(data)).not.toContain('GitHub Open Source');
  });

  it('should not invent employment or education history', async () => {
    mockGitHub();

    const data = await fetchGitHubResumeData('octocat');

    expect(data.experience).toEqual([]);
    expect(data.education).toEqual([]);
    // The old build claimed "Active Developer since <year>" as a degree.
    expect(JSON.stringify(data)).not.toContain('GitHub Contributions');
  });

  it('should leave the email blank when GitHub exposes none', async () => {
    mockGitHub();

    const data = await fetchGitHubResumeData('octocat');

    // `login@github.com` is not a real mailbox and would silently swallow
    // recruiter replies, so an empty value is the honest answer.
    expect(data.personal.email).toBe('');
    expect(data.personal.email).not.toContain('@github.com');
  });

  it('should keep a real public email when GitHub provides one', async () => {
    mockGitHub({ user: { ...profile, email: 'octocat@example.com' } });

    const data = await fetchGitHubResumeData('octocat');

    expect(data.personal.email).toBe('octocat@example.com');
  });

  it('should leave forks out rather than present them as own work', async () => {
    mockGitHub({ repos: [{ ...repos[0], fork: true }] });

    const data = await fetchGitHubResumeData('octocat');

    expect(data.projects).toEqual([]);
  });

  it('should report rate limiting separately from a missing user', async () => {
    mockGitHub({ userStatus: 403 });

    await expect(fetchGitHubResumeData('octocat')).rejects.toThrow(/rate limit/i);
  });

  it('should report a missing user as not found', async () => {
    mockGitHub({ userStatus: 404 });

    await expect(fetchGitHubResumeData('octocat')).rejects.toThrow(/not found/i);
  });

  it('should use the repository description verbatim instead of inventing praise', async () => {
    mockGitHub();

    const data = await fetchGitHubResumeData('octocat');
    const bullets = data.projects?.[0].description ?? [];

    expect(bullets[0]).toBe('A tiny demo repository');
    const joined = bullets.join(' ');
    // Phrases the old generator produced from nothing but a repo name.
    expect(joined).not.toMatch(/demonstrating community impact/i);
    expect(joined).not.toMatch(/emphasizing code quality/i);
    expect(joined).not.toMatch(/Architected|Revolutionized/);
  });

  it('should report stars and forks as plain counts', async () => {
    mockGitHub();

    const bullets = (await fetchGitHubResumeData('octocat')).projects?.[0].description ?? [];

    expect(bullets).toContain('42 stars, 7 forks on GitHub.');
    expect(bullets).toContain('Tech stack: TypeScript, cli.');
  });

  it('should omit traction and stack lines when GitHub has no such data', async () => {
    mockGitHub({
      repos: [{
        name: 'quiet-repo',
        description: null,
        language: null,
        topics: [],
        stargazers_count: 0,
        forks_count: 0,
        fork: false,
        homepage: '',
        created_at: '2021-03-01T00:00:00Z',
        updated_at: '2021-09-01T00:00:00Z'
      }]
    });

    const bullets = (await fetchGitHubResumeData('octocat')).projects?.[0].description ?? [];

    // Nothing verifiable to say, so say nothing rather than pad it out.
    expect(bullets).toEqual([]);
  });

  it('should produce identical output across runs', async () => {
    mockGitHub();
    const first = await fetchGitHubResumeData('octocat');
    githubCache.clear();
    mockGitHub();
    const second = await fetchGitHubResumeData('octocat');

    // The old fallback picked a sentence with Math.random().
    expect(second).toEqual(first);
  });

  it('should rank skills by how often each language is used', async () => {
    mockGitHub({
      repos: [
        { ...repos[0], name: 'a', language: 'Go', topics: [] },
        { ...repos[0], name: 'b', language: 'Rust', topics: ['cli'] },
        { ...repos[0], name: 'c', language: 'Rust', topics: ['cli'] }
      ]
    });

    const data = await fetchGitHubResumeData('octocat');
    const languages = data.skills.find(
      (s): s is { category: string; items: string[] } =>
        typeof s !== 'string' && s.category === 'Languages'
    );

    expect(languages?.items).toEqual(['Rust', 'Go']);
  });

  it('should survive a non-array repos payload', async () => {
    mockGitHub({ reposStatus: 403, repos: { message: 'rate limited' } });

    const data = await fetchGitHubResumeData('octocat');

    expect(data.projects).toEqual([]);
    expect(data.personal.name).toBe('The Octocat');
  });
});
