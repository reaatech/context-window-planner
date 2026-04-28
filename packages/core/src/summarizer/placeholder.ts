/**
 * Placeholder summarizer that marks items for later processing.
 *
 * This summarizer doesn't actually compress content — it returns
 * skeleton items with reduced token estimates and placeholder content
 * that indicates the item should be summarized by an external process.
 *
 * @module
 */

import type { ContextItem } from '../types/context-item.js';
import type { Summarizer } from '../types/summarizer.js';
import { generateId } from '../utils/id.js';

/**
 * Options for the placeholder summarizer.
 */
export interface PlaceholderSummarizerOptions {
  /**
   * Default target token count when summarizing without a specific target.
   * The summarized item's token count will be set to this value.
   */
  defaultTargetTokens?: number;
}

/**
 * Placeholder summarizer that marks items for deferred processing.
 *
 * Returns items with placeholder content and reduced token counts,
 * allowing strategies to make budget decisions without actually
 * performing expensive summarization.
 */
export class PlaceholderSummarizer implements Summarizer {
  readonly name = 'placeholder';
  private readonly defaultTargetTokens: number;

  constructor(options: PlaceholderSummarizerOptions = {}) {
    this.defaultTargetTokens = options.defaultTargetTokens ?? 50;
  }

  /**
   * Estimate the token count after summarizing an item.
   *
   * For items implementing Summarizable, uses their estimatedSummarizedTokenCount.
   * For other items, uses the default target or a fraction of the original.
   *
   * @param item - The item to estimate
   * @returns Estimated token count after summarization
   */
  estimate(item: ContextItem): number {
    if ('estimatedSummarizedTokenCount' in item) {
      const summarizable = item as ContextItem & { estimatedSummarizedTokenCount: number };
      return Math.min(summarizable.estimatedSummarizedTokenCount, item.tokenCount);
    }
    return Math.min(this.defaultTargetTokens, item.tokenCount);
  }

  /**
   * Summarize an item by replacing its content with a placeholder marker.
   *
   * The returned item retains the same type, ID, and priority but has
   * a placeholder content and reduced token count.
   *
   * @param item - The item to summarize
   * @param targetTokens - Target token count for the summary
   * @returns A new item with placeholder content
   */
  summarize(item: ContextItem, targetTokens?: number): ContextItem {
    const estimatedTokens = targetTokens ?? this.estimate(item);

    return {
      id: generateId(),
      type: item.type,
      priority: item.priority,
      tokenCount: Math.min(estimatedTokens, item.tokenCount),
      metadata: {
        ...item.metadata,
        summarized: true,
        originalId: item.id,
        originalTokenCount: item.tokenCount,
      },
      canSummarize() {
        return false;
      },
    };
  }
}
