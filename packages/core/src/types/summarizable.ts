/**
 * Extended interface for items that support summarization.
 * Strategies query this to decide whether summarizing is worthwhile.
 *
 * @module
 */

import type { ContextItem } from './context-item.js';

/**
 * Extended interface for items that support summarization.
 * Strategies can query the estimated token cost before deciding to summarize.
 */
export interface Summarizable extends ContextItem {
  /** Estimated token count after summarization */
  readonly estimatedSummarizedTokenCount: number;

  /** Summarize to a target token budget (best-effort) */
  summarize(targetTokens?: number): ContextItem;
}
