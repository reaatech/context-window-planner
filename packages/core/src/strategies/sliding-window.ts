/**
 * Sliding window strategy for conversation history
 *
 * Keeps the most recent N conversation turns, then fills remaining space with
 * other items by priority. Older turns are candidates for summarization or dropping.
 *
 * @module
 */

import { StrategyError } from '../errors.js';
import type { PackingContext, PackingStrategy } from './base.js';
import type { ContextItem, PackWarning, PackingResult } from '../types/index.js';

/**
 * Configuration options for the sliding-window strategy
 */
export interface SlidingWindowStrategyOptions {
  /** Number of recent turns to keep */
  windowSize: number;
  /** Whether to prioritize recent turns */
  prioritizeRecent?: boolean;
}

/**
 * Sliding window strategy for conversation history.
 *
 * Keeps the most recent N conversation turns, then fills remaining space
 * with other items by priority.
 */
export class SlidingWindowStrategy implements PackingStrategy {
  readonly name = 'sliding-window';
  private readonly windowSize: number;
  private readonly prioritizeRecent: boolean;

  constructor(options: SlidingWindowStrategyOptions) {
    if (options.windowSize === undefined) {
      throw new StrategyError('windowSize is required for sliding-window strategy', {
        strategy: 'sliding-window',
        option: 'windowSize',
      });
    }
    this.windowSize = options.windowSize;
    this.prioritizeRecent = options.prioritizeRecent ?? true;
  }

  execute(context: PackingContext): PackingResult {
    const turns = context.items.filter((item) => item.type === 'conversation_turn');
    const others = context.items.filter((item) => item.type !== 'conversation_turn');

    const sortedTurns = [...turns].sort((a, b) => {
      const aTime =
        typeof (a as unknown as { timestamp?: unknown }).timestamp === 'number'
          ? (a as unknown as { timestamp: number }).timestamp
          : 0;
      const bTime =
        typeof (b as unknown as { timestamp?: unknown }).timestamp === 'number'
          ? (b as unknown as { timestamp: number }).timestamp
          : 0;
      return bTime - aTime;
    });

    const recentTurns = sortedTurns.slice(0, this.windowSize);
    const oldTurns = sortedTurns.slice(this.windowSize);
    const oldTurnIds = new Set(oldTurns.map((t) => t.id));

    const included: ContextItem[] = [];
    const summarize: ContextItem[] = [];
    const dropped: ContextItem[] = [];
    const warnings: PackWarning[] = [];
    let usedTokens = 0;

    const allItems = this.prioritizeRecent
      ? [...recentTurns, ...others, ...oldTurns]
      : [...others, ...recentTurns, ...oldTurns];

    for (const item of allItems) {
      if (item.tokenCount <= context.budget.available - usedTokens) {
        included.push(item);
        usedTokens += item.tokenCount;
      } else if (item.canSummarize() && oldTurnIds.has(item.id)) {
        summarize.push(item);
        warnings.push({
          code: 'ITEM_SUMMARIZED',
          message: `Old turn "${item.id}" will be summarized`,
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
}

/**
 * Factory function to create a sliding window strategy.
 *
 * @param options - Strategy configuration options
 * @returns A new SlidingWindowStrategy instance
 */
export function createSlidingWindowStrategy(
  options: SlidingWindowStrategyOptions,
): SlidingWindowStrategy {
  return new SlidingWindowStrategy(options);
}
