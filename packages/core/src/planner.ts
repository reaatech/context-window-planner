/**
 * Context Planner
 *
 * Main planning engine for context window optimization.
 *
 * @module
 */

import { BudgetExceededError, ValidationError } from './errors.js';
import type { PackingContext, PackingStrategy } from './strategies/index.js';
import type { TokenizerAdapter } from './tokenizer/index.js';
import type {
  ContextItemType,
  ContextItem,
  PackingResult,
  PackingSummary,
  TokenBudget,
} from './types/index.js';
import { TokenBudget as TokenBudgetClass } from './types/index.js';
import { Priority } from './types/priority.js';
import { validateBudget, validateContextItem } from './utils/validation.js';

/**
 * Configuration options for ContextPlanner
 */
export interface ContextPlannerOptions {
  /** Total token budget */
  budget: number;

  /** Reserved tokens (e.g., for generation buffer) */
  reserved?: number;

  /** Tokenizer adapter for counting tokens */
  tokenizer: TokenizerAdapter;

  /** Packing strategy to use */
  strategy: PackingStrategy;

  /** Safety margin as a fraction (0-1) */
  safetyMargin?: number;
}

/**
 * Context Planner - Main planning engine.
 *
 * Orchestrates the packing process by managing context items,
 * token budgets, and packing strategies.
 */
export class ContextPlanner {
  private readonly budget: TokenBudget;
  private readonly tokenizer: TokenizerAdapter;
  private readonly strategy: PackingStrategy;
  private items: ReadonlyArray<ContextItem> = [];

  constructor(options: ContextPlannerOptions) {
    const safetyMargin = options.safetyMargin ?? 0.05;
    if (!Number.isFinite(safetyMargin) || safetyMargin < 0 || safetyMargin > 1) {
      throw new ValidationError('Safety margin must be between 0 and 1', {
        field: 'safetyMargin',
        value: safetyMargin,
      });
    }

    const reserved = options.reserved ?? 0;
    const safetyReserve = Math.floor(options.budget * safetyMargin);
    const totalReserved = reserved + safetyReserve;

    validateBudget({ total: options.budget, reserved: totalReserved });

    this.tokenizer = options.tokenizer;
    this.strategy = options.strategy;
    this.budget = new TokenBudgetClass(options.budget, totalReserved);
  }

  /**
   * Add a context item to the planner.
   *
   * @param item - The item to add
   * @returns this for chaining
   */
  add(item: ContextItem): this {
    validateContextItem(item);
    this.items = [...this.items, item];
    return this;
  }

  /**
   * Add multiple context items.
   *
   * @param items - The items to add
   * @returns this for chaining
   */
  addAll(items: ContextItem[]): this {
    for (const item of items) {
      validateContextItem(item);
    }
    this.items = [...this.items, ...items];
    return this;
  }

  /**
   * Remove a context item by ID.
   *
   * @param id - The item ID to remove
   * @returns this for chaining
   */
  remove(id: string): this {
    this.items = this.items.filter((item) => item.id !== id);
    return this;
  }

  /**
   * Remove all items of a specific type.
   *
   * @param type - The item type to remove
   * @returns this for chaining
   */
  removeByType(type: string): this {
    this.items = this.items.filter((item) => item.type !== type);
    return this;
  }

  /**
   * Execute the packing algorithm and return results.
   *
   * @returns The packing result with included, summarized, and dropped items
   */
  pack(): PackingResult {
    const context: PackingContext = {
      budget: this.budget,
      items: this.items,
      tokenizer: this.tokenizer,
    };

    const result = this.strategy.execute(context);

    if (result.usedTokens > this.budget.available) {
      throw new BudgetExceededError(
        `Packing exceeded available budget: ${result.usedTokens} > ${this.budget.available}`,
        { used: result.usedTokens, available: this.budget.available },
      );
    }

    return result;
  }

  /**
   * Get a summary of the current packing state.
   *
   * @returns Packing summary
   */
  getSummary(): PackingSummary {
    const byType: Partial<Record<ContextItemType, ContextItem[]>> = {};
    const byPriority: Record<Priority, ContextItem[]> = {
      [Priority.Critical]: [],
      [Priority.High]: [],
      [Priority.Medium]: [],
      [Priority.Low]: [],
      [Priority.Disposable]: [],
    };

    for (const item of this.items) {
      const existing = byType[item.type];
      if (existing) {
        existing.push(item);
      } else {
        byType[item.type] = [item];
      }
      byPriority[item.priority].push(item);
    }

    return {
      totalItems: this.items.length,
      totalTokens: this.items.reduce((sum, item) => sum + item.tokenCount, 0),
      byType,
      byPriority,
    };
  }

  /**
   * Get the current token usage.
   *
   * @returns Current token usage statistics
   */
  getTokenUsage(): {
    used: number;
    available: number;
    total: number;
    reserved: number;
    remaining: number;
  } {
    const used = this.items.reduce((sum, item) => sum + item.tokenCount, 0);
    return {
      used,
      available: this.budget.available,
      total: this.budget.total,
      reserved: this.budget.reserved,
      remaining: Math.max(0, this.budget.available - used),
    };
  }

  /**
   * Clear all items from the planner.
   *
   * @returns this for chaining
   */
  clear(): this {
    this.items = [];
    return this;
  }

  /**
   * Get all current items.
   *
   * @returns Array of context items
   */
  getItems(): ReadonlyArray<ContextItem> {
    return this.items;
  }

  /**
   * Get items by type.
   *
   * @param type - The item type to filter by
   * @returns Array of matching items
   */
  getItemsByType(type: string): ReadonlyArray<ContextItem> {
    return this.items.filter((item) => item.type === type);
  }

  /**
   * Get items by priority.
   *
   * @param priority - The priority level to filter by
   * @returns Array of matching items
   */
  getItemsByPriority(priority: Priority): ReadonlyArray<ContextItem> {
    return this.items.filter((item) => item.priority === priority);
  }

  /**
   * Check if the current items fit within the budget.
   *
   * @returns true if all items fit, false otherwise
   */
  fitsInBudget(): boolean {
    const totalTokens = this.items.reduce((sum, item) => sum + item.tokenCount, 0);
    return totalTokens <= this.budget.available;
  }

  /**
   * Get the budget information.
   *
   * @returns The current token budget
   */
  getBudget(): TokenBudget {
    return new TokenBudgetClass(this.budget.total, this.budget.reserved);
  }
}
