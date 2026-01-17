/**
 * Cache adapter interface for scope-level caching
 * Provides a pluggable interface for different cache backends
 */
export interface CacheAdapter {
  /**
   * Get a value from the cache
   * @param key Cache key
   * @param evictTimestamp Optional timestamp to check if the entry should be evicted
   * @returns The cached value or null if not found or expired
   */
  get(key: string, evictTimestamp?: number): any | null;

  /**
   * Set a value in the cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds
   * @returns True if successful
   */
  set(key: string, value: any, ttl: number): boolean;

  /**
   * Delete a specific key from the cache
   * @param key Cache key to delete
   */
  del(key: string): void;

  /**
   * Invalidate cache entries by tags
   * @param tags Array of tags to invalidate
   */
  tagInvalidate(tags: string[]): void;

  /**
   * Clear all cache entries
   */
  clear(): void;
}

/**
 * No-op cache adapter (disabled caching)
 */
export class NoOpCacheAdapter implements CacheAdapter {
  get(_key: string, _evictTimestamp?: number): any | null {
    return null;
  }

  set(_key: string, _value: any, _ttl: number): boolean {
    return false;
  }

  del(_key: string): void {
    // No-op
  }

  tagInvalidate(_tags: string[]): void {
    // No-op
  }

  clear(): void {
    // No-op
  }
}

/**
 * In-memory cache adapter for testing and simple use cases
 */
export class InMemoryCacheAdapter implements CacheAdapter {
  private cache: Map<string, { value: any; expires: number }>;
  private tags: Map<string, Set<string>>;

  constructor() {
    this.cache = new Map();
    this.tags = new Map();
  }

  get(key: string, evictTimestamp?: number): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();

    // Check if expired by TTL
    if (entry.expires < now) {
      this.cache.delete(key);
      return null;
    }

    // Check if evicted by timestamp marker
    // If evictTimestamp is set and the entry expires after it,
    // the entry was created after invalidation and is still valid
    if (evictTimestamp && entry.expires <= evictTimestamp) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  set(key: string, value: any, ttl: number): boolean {
    const expires = Date.now() + ttl * 1000;
    this.cache.set(key, { value, expires });
    return true;
  }

  del(key: string): void {
    this.cache.delete(key);
    // Remove from all tag sets
    for (const [_tag, keys] of this.tags.entries()) {
      keys.delete(key);
    }
  }

  tagInvalidate(tags: string[]): void {
    for (const tag of tags) {
      const keys = this.tags.get(tag);
      if (keys) {
        for (const key of keys) {
          this.cache.delete(key);
        }
        this.tags.delete(tag);
      }
    }
  }

  clear(): void {
    this.cache.clear();
    this.tags.clear();
  }

  /**
   * Associate a cache key with tags for invalidation
   */
  tagKey(key: string, tags: string[]): void {
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(key);
    }
  }
}
