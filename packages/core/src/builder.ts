/**
 * Context Planner Builder
 *
 * Fluent API for constructing ContextPlanner instances.
 *
 * @module
 */

import { ValidationError } from './errors.js';
import { ContextPlanner } from './planner.js';
import type { PackingStrategy } from './strategies/index.js';
import type { TokenizerAdapter } from './tokenizer/index.js';
import type { ContextItem } from './types/index.js';

/**
 * Builder for ContextPlanner instances.
 *
 * Provides a fluent API for configuring and creating planners.
 */
export class ContextPlannerBuilder {
  private budget?: number;
  private tokenizer?: TokenizerAdapter;
  private strategy?: PackingStrategy;
  private items: ReadonlyArray<ContextItem> = [];
  private reserved = 0;
  private safetyMargin = 0.05;

  /**
   * Set the total token budget.
   *
   * @param tokens - Total available tokens
   * @returns this for chaining
   */
  withBudget(tokens: number): this {
    if (tokens <= 0) {
      throw new ValidationError('Budget must be positive', { field: 'budget', value: tokens });
    }
    this.budget = tokens;
    return this;
  }

  /**
   * Set the tokenizer adapter.
   *
   * @param adapter - Tokenizer adapter instance
   * @returns this for chaining
   */
  withTokenizer(adapter: TokenizerAdapter): this {
    this.tokenizer = adapter;
    return this;
  }

  /**
   * Set the packing strategy.
   *
   * @param strategy - Packing strategy instance
   * @returns this for chaining
   */
  withStrategy(strategy: PackingStrategy): this {
    this.strategy = strategy;
    return this;
  }

  /**
   * Set reserved tokens (e.g., for generation buffer).
   *
   * @param tokens - Number of tokens to reserve
   * @returns this for chaining
   */
  withReserved(tokens: number): this {
    if (tokens < 0) {
      throw new ValidationError('Reserved tokens cannot be negative', {
        field: 'reserved',
        value: tokens,
      });
    }
    this.reserved = tokens;
    return this;
  }

  /**
   * Set the safety margin as a fraction of budget.
   *
   * @param fraction - Safety margin fraction (0-1)
   * @returns this for chaining
   */
  withSafetyMargin(fraction: number): this {
    if (fraction < 0 || fraction > 1) {
      throw new ValidationError('Safety margin must be between 0 and 1', {
        field: 'safetyMargin',
        value: fraction,
      });
    }
    this.safetyMargin = fraction;
    return this;
  }

  /**
   * Add a single item.
   *
   * @param item - Context item to add
   * @returns this for chaining
   */
  addItem(item: ContextItem): this {
    this.items = [...this.items, item];
    return this;
  }

  /**
   * Add multiple items.
   *
   * @param items - Context items to add
   * @returns this for chaining
   */
  addItems(items: ContextItem[]): this {
    this.items = [...this.items, ...items];
    return this;
  }

  /**
   * Build the ContextPlanner instance.
   *
   * @returns A configured ContextPlanner
   * @throws Error if required configuration is missing
   */
  build(): ContextPlanner {
    if (this.budget === undefined) {
      throw new ValidationError('Budget is required');
    }
    if (this.tokenizer === undefined) {
      throw new ValidationError('Tokenizer is required');
    }
    if (this.strategy === undefined) {
      throw new ValidationError('Strategy is required');
    }

    const planner = new ContextPlanner({
      budget: this.budget,
      tokenizer: this.tokenizer,
      strategy: this.strategy,
      reserved: this.reserved,
      safetyMargin: this.safetyMargin,
    });

    if (this.items.length > 0) {
      planner.addAll([...this.items]);
    }

    return planner;
  }
}
