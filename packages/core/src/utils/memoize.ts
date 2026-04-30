/**
 * Packing result memoization utility.
 *
 * Caches packing results keyed by a fingerprint of the
 * current state (item IDs, priorities, token counts, budget).
 *
 * @module
 */

import type { ContextItem } from '../types/context-item.js';
import type { PackingResult } from '../types/packing-result.js';
import type { TokenBudget } from '../types/token-budget.js';

/**
 * Memoizes packing results for a planner instance.
 *
 * Caches the last result and invalidates when state changes.
 */
export class PackingMemoizer {
  private lastFingerprint = '';
  private lastResult: PackingResult | null = null;

  /**
   * Compute a fingerprint of the current packing state.
   *
   * @param items - Current context items
   * @param budget - Current token budget
   * @returns A string fingerprint
   */
  fingerprint(items: ReadonlyArray<ContextItem>, budget: TokenBudget): string {
    const parts = items.map((item) => `${item.id}:${item.priority}:${item.tokenCount}`);
    return `${budget.total}:${budget.reserved}:${parts.join(',')}`;
  }

  /**
   * Get the cached result if it matches the current fingerprint.
   *
   * @param items - Current context items
   * @param budget - Current token budget
   * @returns The cached result, or null
   */
  get(items: ReadonlyArray<ContextItem>, budget: TokenBudget): PackingResult | null {
    const fp = this.fingerprint(items, budget);
    if (fp === this.lastFingerprint && this.lastResult !== null) {
      return this.lastResult;
    }
    return null;
  }

  /**
   * Store a result in the cache.
   *
   * @param items - Context items at the time of packing
   * @param budget - Token budget at the time of packing
   * @param result - The packing result to cache
   */
  set(items: ReadonlyArray<ContextItem>, budget: TokenBudget, result: PackingResult): void {
    this.lastFingerprint = this.fingerprint(items, budget);
    this.lastResult = result;
  }

  /**
   * Invalidate the cache.
   */
  invalidate(): void {
    this.lastFingerprint = '';
    this.lastResult = null;
  }

  /**
   * Whether a cached result exists.
   */
  get hasResult(): boolean {
    return this.lastResult !== null;
  }
}
