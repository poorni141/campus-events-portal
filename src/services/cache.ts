/**
 * TicketNest Redis-compatible Caching Layer
 * Provides in-memory / Redis cache-aside semantics with TTL, pattern invalidation,
 * and hit/miss telemetry. Authoritative inventory is never read from cache.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class CacheService {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    invalidations: 0,
  };

  /**
   * Get value from cache if present and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key) as CacheEntry<T> | undefined;
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.value;
  }

  /**
   * Set key with TTL in seconds (default 300s = 5m)
   */
  set<T>(key: string, value: T, ttlSeconds = 300): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    this.stats.sets++;
  }

  /**
   * Delete a specific key
   */
  del(key: string): void {
    if (this.store.delete(key)) {
      this.stats.invalidations++;
    }
  }

  /**
   * Invalidate all keys matching a prefix or pattern (e.g. "events:*")
   */
  invalidatePattern(prefix: string): number {
    let count = 0;
    const cleanPrefix = prefix.replace(/\*$/, '');
    for (const key of this.store.keys()) {
      if (key.startsWith(cleanPrefix)) {
        this.store.delete(key);
        count++;
      }
    }
    this.stats.invalidations += count;
    return count;
  }

  /**
   * Helper to invalidate all public event caches when organizer modifies an event
   */
  invalidateEventCaches(eventId?: string): void {
    this.del('public:events:list');
    this.del('public:events:categories');
    if (eventId) {
      this.del(`public:events:${eventId}`);
      this.del(`public:events:detail:${eventId}`);
    }
    this.invalidatePattern('public:events:');
  }

  /**
   * Telemetry stats for Admin / System monitor
   */
  getStats() {
    return {
      ...this.stats,
      activeKeysCount: this.store.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
        : '100%',
    };
  }

  /**
   * Clear all cache
   */
  flushAll(): void {
    this.store.clear();
  }
}

export const cache = new CacheService();
