/**
 * Priority-based greedy packing strategy
 *
 * Fills the context window by priority, highest first. Within the same priority
 * level, uses first-come-first-served ordering.
 *
 * @module
 */

import type { PackingContext, PackingStrategy, StrategyOptions } from './base.js';
import type { ContextItem, PackWarning, PackingResult } from '../types/index.js';

/**
 * Configuration options for the priority-greedy strategy.
 *
 * This strategy currently has no configurable options. Safety margin is owned
 * by the ContextPlanner and is applied exactly once to the available budget.
 * The type alias exists for API stability as options may be added later.
 */
export type PriorityGreedyStrategyOptions = StrategyOptions;

/**
 * Priority-based greedy packing strategy.
 *
 * Fills the context window by priority, highest first.
 */
export class PriorityGreedyStrategy implements PackingStrategy {
  readonly name = 'priority-greedy';

  constructor(_options: PriorityGreedyStrategyOptions = {}) {
    // No options consumed at present.
  }

  execute(context: PackingContext): PackingResult {
    const effectiveBudget = context.budget.available;
    const sortedItems = this.sortItems(context.items);

    const included: ContextItem[] = [];
    const summarize: ContextItem[] = [];
    const dropped: ContextItem[] = [];
    const warnings: PackWarning[] = [];
    let usedTokens = 0;

    for (const item of sortedItems) {
      if (item.tokenCount <= effectiveBudget - usedTokens) {
        included.push(item);
        usedTokens += item.tokenCount;
      } else if (item.canSummarize()) {
        summarize.push(item);
        warnings.push({
          code: 'ITEM_SUMMARIZED',
          message: `Item "${item.id}" will be summarized to fit within budget`,
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

    const remainingTokens = context.budget.available - usedTokens;
    if (remainingTokens < context.budget.available * 0.1) {
      warnings.push({
        code: 'LOW_REMAINING',
        message: `Only ${remainingTokens} tokens remaining (${Math.round((remainingTokens / context.budget.available) * 100)}% of budget)`,
      });
    }

    return {
      included,
      summarize,
      dropped,
      usedTokens,
      remainingTokens,
      warnings,
    };
  }

  private sortItems(items: ReadonlyArray<ContextItem>): ContextItem[] {
    return [...items].sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return 0;
    });
  }
}

/**
 * Factory function to create a priority greedy strategy.
 *
 * @param options - Strategy configuration options
 * @returns A new PriorityGreedyStrategy instance
 */
export function createPriorityGreedyStrategy(
  options: PriorityGreedyStrategyOptions = {},
): PriorityGreedyStrategy {
  return new PriorityGreedyStrategy(options);
}
