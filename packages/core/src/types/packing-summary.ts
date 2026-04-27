/**
 * Summary of current packing state
 *
 * @module
 */

import type { ContextItemType } from './context-item-type.js';
import type { ContextItem } from './context-item.js';
import type { Priority } from './priority.js';

/**
 * Summary of current packing state.
 */
export interface PackingSummary {
  /** Total number of items */
  readonly totalItems: number;

  /** Total tokens across all items */
  readonly totalTokens: number;

  /** Items grouped by type */
  readonly byType: Partial<Record<ContextItemType, ContextItem[]>>;

  /** Items grouped by priority */
  readonly byPriority: Record<Priority, ContextItem[]>;
}
