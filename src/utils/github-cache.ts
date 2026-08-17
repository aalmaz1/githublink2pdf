/**
 * GitHub API Cache - caches GitHub API responses to reduce rate limits
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class GitHubCache {
  private cache = new Map<string, CacheEntry<any>>();

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > CACHE_TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  public set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  public clear(): void {
    this.cache.clear();
  }

  public delete(key: string): void {
    this.cache.delete(key);
  }
}

// Singleton instance for global cache
export const githubCache = new GitHubCache();
