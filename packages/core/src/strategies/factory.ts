/**
 * Strategy Factory
 *
 * Provides a centralized factory for creating packing strategies.
 *
 * @module
 */

import { StrategyError } from '../errors.js';
import type { PackingStrategy, StrategyFactory, StrategyOptions } from './base.js';
import { createPriorityGreedyStrategy } from './priority-greedy.js';
import { createRAGSelectionStrategy } from './rag-selection.js';
import { createSlidingWindowStrategy } from './sliding-window.js';
import { createSummarizeAndReplaceStrategy } from './summarize-replace.js';

/**
 * Default strategy factory implementation.
 */
export class DefaultStrategyFactory implements StrategyFactory {
  /**
   * Create a strategy by name.
   *
   * @param name - The strategy name
   * @param options - Strategy options
   * @returns A strategy instance
   * @throws Error if the strategy is not found
   */
  create(name: string, options: StrategyOptions = {}): PackingStrategy {
    switch (name) {
      case 'priority-greedy':
        return createPriorityGreedyStrategy(options);
      case 'sliding-window':
        return createSlidingWindowStrategy(options as { windowSize: number });
      case 'summarize-replace':
        return createSummarizeAndReplaceStrategy(options);
      case 'rag-selection':
        return createRAGSelectionStrategy(options);
      default:
        throw new StrategyError(`Unknown strategy: ${name}`, { strategy: name });
    }
  }
}

/**
 * Default strategy factory instance.
 */
export const strategies: StrategyFactory = new DefaultStrategyFactory();

/**
 * Convenience function to create a strategy.
 *
 * @param name - The strategy name
 * @param options - Strategy options
 * @returns A strategy instance
 */
export function createStrategy(name: string, options?: StrategyOptions): PackingStrategy {
  return strategies.create(name, options);
}

export {
  createPriorityGreedyStrategy,
  createRAGSelectionStrategy,
  createSlidingWindowStrategy,
  createSummarizeAndReplaceStrategy,
};
