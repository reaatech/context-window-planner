/**
 * Summarize and replace strategy for older items
 *
 * Actively summarizes older items to fit more content. Uses a compression ratio
 * to estimate summarized token counts.
 *
 * @module
 */

import type { PackingContext, PackingStrategy } from './base.js';
import type { ContextItem, PackWarning, PackingResult } from '../types/index.js';
import type { Summarizable } from '../types/summarizable.js';

/**
 * Configuration options for the summarize-replace strategy
 */
export interface SummarizeReplaceStrategyOptions {
  /** Expected compression ratio (0-1) */
  compressionRatio?: number;
  /** Maximum number of items to summarize */
  maxSummaries?: number;
}

/**
 * Summarize and replace strategy for older items.
 *
 * Actively summarizes older items to fit more content.
 */
export class SummarizeAndReplaceStrategy implements PackingStrategy {
  readonly name = 'summarize-replace';
  private readonly compressionRatio: number;
  private readonly maxSummaries: number;

  constructor(options: SummarizeReplaceStrategyOptions = {}) {
    this.compressionRatio = options.compressionRatio ?? 0.3;
    this.maxSummaries = options.maxSummaries ?? 10;
  }

  execute(context: PackingContext): PackingResult {
    const sortedItems = [...context.items].sort((a, b) => b.priority - a.priority);

    const included: ContextItem[] = [];
    const summarize: ContextItem[] = [];
    const dropped: ContextItem[] = [];
    const warnings: PackWarning[] = [];
    let usedTokens = 0;
    let summaryCount = 0;

    for (const item of sortedItems) {
      if (item.tokenCount <= context.budget.available - usedTokens) {
        included.push(item);
        usedTokens += item.tokenCount;
      } else if (
        item.canSummarize() &&
        summaryCount < this.maxSummaries &&
        this.isSummarizable(item)
      ) {
        const summarized = this.summarizeItem(item);
        if (summarized.tokenCount <= context.budget.available - usedTokens) {
          included.push(summarized);
          usedTokens += summarized.tokenCount;
          summaryCount++;
        } else {
          summarize.push(item);
          summaryCount++;
        }
        warnings.push({
          code: 'ITEM_SUMMARIZED',
          message: `Item "${item.id}" summarized with compression ratio ${this.compressionRatio}`,
          item,
        });
      } else {
        dropped.push(item);
        warnings.push({
          code: 'ITEM_DROPPED',
          message: `Item "${item.id}" dropped due to budget constraints`,
          item,
        });
      }
    }

    return {
      included,
      summarize,
      dropped,
      usedTokens,
      remainingTokens: context.budget.available - usedTokens,
      warnings,
    };
  }

  private isSummarizable(item: ContextItem): item is Summarizable {
    return 'estimatedSummarizedTokenCount' in item;
  }

  private summarizeItem(item: Summarizable): ContextItem {
    const targetTokens = Math.ceil(item.tokenCount * this.compressionRatio);
    return item.summarize(targetTokens);
  }
}

/**
 * Factory function to create a summarize-and-replace strategy.
 *
 * @param options - Strategy configuration options
 * @returns A new SummarizeAndReplaceStrategy instance
 */
export function createSummarizeAndReplaceStrategy(
  options: SummarizeReplaceStrategyOptions = {},
): SummarizeAndReplaceStrategy {
  return new SummarizeAndReplaceStrategy(options);
}
