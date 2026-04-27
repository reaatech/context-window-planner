/**
 * Base interface for all content types that can be included in the context window.
 *
 * @module
 */

import type { ContextItemType } from './context-item-type.js';
import type { Priority } from './priority.js';

/**
 * Base interface for all content types that can be included in the context window.
 */
export interface ContextItem {
  /** Unique identifier for this item */
  readonly id: string;

  /** The type of context item */
  readonly type: ContextItemType;

  /** Priority level for inclusion decisions */
  readonly priority: Priority;

  /** Number of tokens this item consumes */
  readonly tokenCount: number;

  /** Optional metadata for debugging */
  readonly metadata: Record<string, unknown> | undefined;

  /** Check if item can be summarized */
  canSummarize(): boolean;

  /** Get summarized version (if supported) */
  summarize?(): ContextItem;
}
