/**
 * Priority Resolver for dynamic priority calculation.
 *
 * Adjusts item priorities based on recency, relevance, grouping,
 * and custom resolution rules.
 *
 * @module
 */

import type { ContextItemType } from './types/context-item-type.js';
import type { ContextItem } from './types/context-item.js';
import { Priority } from './types/priority.js';

/**
 * Options for priority resolution.
 */
export interface PriorityResolverOptions {
  /** Boost factor for recent conversation turns (added to priority) */
  recencyBoost?: number;
  /** Decay factor for older items (percentage of original priority) */
  ageDecay?: number;
  /** Time window in milliseconds for "recent" items */
  recentWindowMs?: number;
  /** Custom priority overrides per item type */
  typeOverrides?: Partial<Record<ContextItemType, Priority>>;
  /** Custom resolver function (receives item and original priority, returns adjusted, or undefined to skip) */
  customResolver?: (item: ContextItem, originalPriority: Priority) => Priority | undefined;
}

/**
 * Resolves dynamic priorities for context items.
 *
 * Applies recency boosts, age decay, type overrides, and
 * custom resolution rules on top of each item's static priority.
 */
export class PriorityResolver {
  private readonly recencyBoost: number;
  private readonly ageDecay: number;
  private readonly recentWindowMs: number;
  private readonly typeOverrides: Partial<Record<ContextItemType, Priority>>;
  private readonly customResolver:
    | ((item: ContextItem, originalPriority: Priority) => Priority | undefined)
    | undefined;

  constructor(options: PriorityResolverOptions = {}) {
    this.recencyBoost = options.recencyBoost ?? 0;
    this.ageDecay = options.ageDecay ?? 0;
    this.recentWindowMs = options.recentWindowMs ?? 300000; // 5 minutes
    this.typeOverrides = options.typeOverrides ?? {};
    this.customResolver = options.customResolver;
  }

  /**
   * Resolve the effective priority for a single item.
   *
   * @param item - The context item to evaluate
   * @returns The resolved (adjusted) priority
   */
  resolve(item: ContextItem): Priority {
    let resolved = item.priority;

    const override = this.typeOverrides[item.type];
    if (override !== undefined) {
      resolved = override;
    }

    if (this.customResolver) {
      const overridden = this.customResolver(item, resolved);
      if (overridden !== undefined) {
        resolved = overridden;
      }
    }

    resolved = this.applyRecencyBoost(item, resolved);
    resolved = this.applyAgeDecay(item, resolved);

    return this.clampPriority(resolved);
  }

  /**
   * Resolve priorities for all items, returning adjusted copies.
   *
   * Does NOT mutate the original items.
   *
   * @param items - Array of context items
   * @returns New array with adjusted priorities (other properties preserved)
   */
  resolveAll(items: ReadonlyArray<ContextItem>): ContextItem[] {
    return items.map((item) => ({
      ...item,
      priority: this.resolve(item),
    }));
  }

  /**
   * Resolve priorities for a group of items that inherit a parent priority.
   *
   * Items within the group receive the parent's priority, then have their
   * individual adjustments applied on top.
   *
   * @param items - Items in the group
   * @param parentPriority - The priority inherited from the group
   * @returns New array with inherited and adjusted priorities
   */
  resolveGroup(items: ReadonlyArray<ContextItem>, parentPriority: Priority): ContextItem[] {
    return items.map((item) => {
      const baseItem = { ...item, priority: parentPriority };
      const resolved = this.resolve(baseItem);
      return { ...item, priority: resolved };
    });
  }

  private applyRecencyBoost(item: ContextItem, currentPriority: Priority): Priority {
    if (this.recencyBoost <= 0) {
      return currentPriority;
    }

    const timestamp = this.getTimestamp(item);
    if (timestamp === undefined) {
      return currentPriority;
    }

    const age = Date.now() - timestamp;
    if (age > this.recentWindowMs) {
      return currentPriority;
    }

    return (currentPriority + this.recencyBoost) as Priority;
  }

  private applyAgeDecay(item: ContextItem, currentPriority: Priority): Priority {
    if (this.ageDecay <= 0) {
      return currentPriority;
    }

    const timestamp = this.getTimestamp(item);
    if (timestamp === undefined) {
      return currentPriority;
    }

    const ageMs = Date.now() - timestamp;
    const ageSeconds = ageMs / 1000;
    const decayFactor = Math.max(0, 1 - this.ageDecay * (ageSeconds / 3600));
    return Math.round(currentPriority * decayFactor) as Priority;
  }

  private getTimestamp(item: ContextItem): number | undefined {
    const meta = item.metadata;
    if (!meta) {
      return undefined;
    }
    const ts = meta.timestamp;
    if (typeof ts === 'number') {
      return ts;
    }
    if (typeof ts === 'string') {
      return new Date(ts).getTime();
    }
    return undefined;
  }

  private clampPriority(value: number): Priority {
    return Math.max(
      Priority.Disposable,
      Math.min(Priority.Critical, Math.round(value)),
    ) as Priority;
  }
}
