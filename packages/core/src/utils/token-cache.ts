/**
 * Token count caching utility.
 *
 * Standalone cache that tokenizer adapters delegate to for storing
 * computed token counts by content hash.
 *
 * @module
 */

/**
 * LRU cache for token counts keyed by content string.
 *
 * Supports configurable size limits with automatic eviction
 * of the oldest entry when the limit is reached.
 */
export class TokenCache {
  #cache: Map<string, number>;
  #maxSize: number;

  constructor(maxSize = 10000) {
    this.#cache = new Map();
    this.#maxSize = maxSize;
  }

  /**
   * Get a cached token count for a content key.
   *
   * @param key - The content key to look up
   * @returns The cached token count, or undefined
   */
  get(key: string): number | undefined {
    return this.#cache.get(key);
  }

  /**
   * Set a cached token count for a content key.
   *
   * Evicts the oldest entry if the cache exceeds the max size.
   *
   * @param key - The content key
   * @param count - The token count to cache
   */
  set(key: string, count: number): void {
    if (this.#cache.size >= this.#maxSize) {
      const firstKey = this.#cache.keys().next().value;
      if (firstKey !== undefined) {
        this.#cache.delete(firstKey);
      }
    }
    this.#cache.set(key, count);
  }

  /**
   * Invalidate a specific cached entry.
   *
   * @param key - The content key to remove
   */
  invalidate(key: string): void {
    this.#cache.delete(key);
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.#cache.clear();
  }

  /**
   * The number of entries currently in the cache.
   */
  get size(): number {
    return this.#cache.size;
  }

  /**
   * Get cache statistics.
   */
  getStats(): { size: number; limit: number } {
    return {
      size: this.#cache.size,
      limit: this.#maxSize,
    };
  }
}
