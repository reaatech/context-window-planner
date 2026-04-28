/**
 * Summarizer interface for compressing context items.
 *
 * Strategies delegate to a Summarizer to estimate and perform
 * summarization of context items when space is constrained.
 *
 * @module
 */

import type { ContextItem } from './context-item.js';

/**
 * Interface for summarizers that can compress context items.
 *
 * Implementations can range from placeholder markers to full
 * LLM-based summarization.
 */
export interface Summarizer {
  /** Human-readable name of the summarizer */
  readonly name: string;

  /**
   * Estimate the token count after summarizing an item.
   *
   * @param item - The item to estimate summarization for
   * @returns Estimated token count after summarization
   */
  estimate(item: ContextItem): number;

  /**
   * Summarize an item to a target token budget (best-effort).
   *
   * @param item - The item to summarize
   * @param targetTokens - Optional target token count for the summary
   * @returns A new summarized context item
   */
  summarize(item: ContextItem, targetTokens?: number): ContextItem;
}
