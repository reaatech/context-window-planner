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
import { PackingMemoizer } from './utils/memoize.js';
import { validateBudget, validateContextItem } from './utils/validation.js';

/**
 * Result of a multi-turn planning operation.
 */
export interface TurnPlan {
  /** Estimated number of concurrent turns that can fit */
  readonly turnCount: number;
  /** Tokens reserved per turn */
  readonly tokensPerTurn: number;
  /** Tokens remaining after reservation */
  readonly remainingForStatic: number;
  /** Whether the plan is feasible */
  readonly feasible: boolean;
}

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
  #memoizer: PackingMemoizer;
  #dirty: boolean = true;

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
    this.#memoizer = new PackingMemoizer();
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
    this.#memoizer.invalidate();
    this.#dirty = true;
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
    this.#memoizer.invalidate();
    this.#dirty = true;
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
    this.#memoizer.invalidate();
    this.#dirty = true;
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
    this.#memoizer.invalidate();
    this.#dirty = true;
    return this;
  }

  /**
   * Execute the packing algorithm and return results.
   *
   * @returns The packing result with included, summarized, and dropped items
   */
  pack(): PackingResult {
    const cached = this.#memoizer.get(this.items, this.budget);
    if (cached !== null) {
      return cached;
    }

    const context: PackingContext = {
      budget: this.budget,
      items: this.items,
      tokenizer: this.tokenizer,
      options: {},
    };

    const result = this.strategy.execute(context);

    if (result.usedTokens > this.budget.available) {
      throw new BudgetExceededError(
        `Packing exceeded available budget: ${result.usedTokens} > ${this.budget.available}`,
        { used: result.usedTokens, available: this.budget.available },
      );
    }

    this.#memoizer.set(this.items, this.budget, result);
    this.#dirty = false;
    return result;
  }

  /**
   * Re-pack items, reusing the last result if the state is unchanged.
   *
   * This is a convenience method that delegates to `pack()` with
   * memoization. If items have not changed since the last pack,
   * the cached result is returned instantly.
   *
   * @returns The packing result
   */
  repack(): PackingResult {
    return this.pack();
  }

  /**
   * Plan for multi-turn conversations by estimating how many
   * conversation turns can fit in the budget alongside static items.
   *
   * Calculates the average token count of existing conversation turns,
   * reserves space for them, and returns a plan with the estimated
   * turn capacity.
   *
   * @param maxTurns - Maximum desired turns (default: unlimited)
   * @returns A turn plan with feasibility information
   */
  plan(maxTurns: number = Number.MAX_SAFE_INTEGER): TurnPlan {
    const staticItems = this.items.filter((item) => item.type !== 'conversation_turn');
    const turns = this.items.filter((item) => item.type === 'conversation_turn');

    const staticTokens = staticItems.reduce((sum, item) => sum + item.tokenCount, 0);
    const avgTurnTokens =
      turns.length > 0
        ? Math.ceil(turns.reduce((sum, item) => sum + item.tokenCount, 0) / turns.length)
        : 200;

    const availableForTurns = this.budget.available - staticTokens;

    if (availableForTurns <= 0) {
      return {
        turnCount: 0,
        tokensPerTurn: avgTurnTokens,
        remainingForStatic:
          staticTokens <= this.budget.available ? staticTokens : this.budget.available,
        feasible: false,
      };
    }

    const feasibleTurns = Math.min(Math.floor(availableForTurns / avgTurnTokens), maxTurns);

    return {
      turnCount: feasibleTurns,
      tokensPerTurn: avgTurnTokens,
      remainingForStatic: this.budget.available - feasibleTurns * avgTurnTokens,
      feasible: feasibleTurns > 0,
    };
  }

  /**
   * Whether the planner state has changed since the last pack.
   */
  get isDirty(): boolean {
    return this.#dirty;
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
    this.#memoizer.invalidate();
    this.#dirty = true;
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
