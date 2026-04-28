/**
 * Packing Strategy Interfaces
 *
 * Defines the contracts for packing strategy implementations.
 *
 * @module
 */

import type { TokenizerAdapter } from '../tokenizer/index.js';
import type { ContextItem, PackingResult, TokenBudget } from '../types/index.js';

/**
 * Strategy-specific options
 */
export type StrategyOptions = Record<string, unknown>;

/**
 * Context provided to strategies during execution.
 */
export interface PackingContext {
  /** The token budget to respect */
  budget: TokenBudget;

  /** All candidate items for inclusion */
  items: ReadonlyArray<ContextItem>;

  /** Tokenizer for counting tokens */
  tokenizer: TokenizerAdapter;

  /** Strategy-specific options */
  options: StrategyOptions;
}

/**
 * Interface for packing strategies.
 *
 * Strategies determine which items to include, summarize, or drop
 * based on the available token budget.
 */
export interface PackingStrategy {
  /** Unique name for this strategy */
  readonly name: string;

  /**
   * Execute the packing algorithm.
   *
   * @param context - The packing context
   * @returns The packing result
   */
  execute(context: PackingContext): PackingResult;
}

/**
 * Interface for strategy factories.
 */
export interface StrategyFactory {
  /**
   * Create a strategy by name.
   *
   * @param name - The strategy name
   * @param options - Strategy options
   * @returns A strategy instance
   */
  create(name: string, options?: StrategyOptions): PackingStrategy;
}
