/**
 * Agent Skill: Planning Engine
 *
 * This skill defines patterns and procedures for implementing and modifying
 * the main planning engine in the @reaatech/context-window-planner project.
 */

export const skill = {
  name: 'planner',
  description: 'Modifying the main planning engine',
  version: '1.0.0',
};

/**
 * Create the main ContextPlanner class
 */
export function createContextPlanner() {
  return {
    type: 'file',
    name: 'packages/core/src/planner.ts',
    content: `/**
 * Context Planner
 * 
 * Main planning engine for context window optimization.
 * 
 * @module
 */

import type {
  TokenBudget,
  ContextItem,
  PackingResult,
  PackWarning,
} from './types/index.js';
import { Priority } from './types/priority.js';
import type { TokenizerAdapter } from './tokenizer/index.js';
import type { PackingStrategy, PackingContext } from './strategies/index.js';
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
 * Summary of current packing state
 */
export interface PackingSummary {
  /** Total number of items */
  totalItems: number;
  /** Total tokens across all items */
  totalTokens: number;
  /** Items grouped by type */
  byType: Record<string, ContextItem[]>;
  /** Items grouped by priority */
  byPriority: Record<Priority, ContextItem[]>;
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
  private readonly safetyMargin: number;
  private items: ReadonlyArray<ContextItem> = [];

  constructor(options: ContextPlannerOptions) {
    validateBudget({ total: options.budget, reserved: options.reserved ?? 0 });

    this.tokenizer = options.tokenizer;
    this.strategy = options.strategy;
    this.safetyMargin = options.safetyMargin ?? 0.05;

    const reserved = options.reserved ?? 0;
    const safetyReserve = Math.floor(options.budget * this.safetyMargin);
    
    this.budget = {
      total: options.budget,
      reserved: reserved + safetyReserve,
    };
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
      options: {},
    };

    const result = this.strategy.execute(context);

    // Validate result respects budget
    if (result.usedTokens > this.budget.available) {
      const budgetWarning: PackWarning = {
        code: 'BUDGET_EXCEEDED',
        message: \`Packing exceeded available budget: \${result.usedTokens} > \${this.budget.available}\`,
      };
      return {
        ...result,
        warnings: [...result.warnings, budgetWarning],
      };
    }

    return result;
  }

  /**
   * Get a summary of the current packing state.
   * 
   * @returns Packing summary
   */
  getSummary(): PackingSummary {
    const byType: Record<string, ContextItem[]> = {};
    const byPriority: Record<Priority, ContextItem[]> = {
      [Priority.Critical]: [],
      [Priority.High]: [],
      [Priority.Medium]: [],
      [Priority.Low]: [],
      [Priority.Disposable]: [],
    };

    for (const item of this.items) {
      // Group by type
      byType[item.type] = byType[item.type] ? [...byType[item.type], item] : [item];

      // Group by priority
      byPriority[item.priority] = byPriority[item.priority]
        ? [...byPriority[item.priority], item]
        : [item];
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
    return { ...this.budget };
  }
}
`,
  };
}

/**
 * Create the ContextPlannerBuilder class
 */
export function createContextPlannerBuilder() {
  return {
    type: 'file',
    name: 'packages/core/src/builder.ts',
    content: `/**
 * Context Planner Builder
 * 
 * Fluent API for constructing ContextPlanner instances.
 * 
 * @module
 */

import type { TokenizerAdapter } from './tokenizer/index.js';
import type { PackingStrategy } from './strategies/index.js';
import type { ContextItem } from './types/index.js';
import { ContextPlanner } from './planner.js';

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
  private reserved: number = 0;
  private safetyMargin: number = 0.05;

  /**
   * Set the total token budget.
   * 
   * @param tokens - Total available tokens
   * @returns this for chaining
   */
  withBudget(tokens: number): this {
    if (tokens <= 0) {
      throw new Error('Budget must be positive');
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
      throw new Error('Reserved tokens cannot be negative');
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
      throw new Error('Safety margin must be between 0 and 1');
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
      throw new Error('Budget is required');
    }
    if (this.tokenizer === undefined) {
      throw new Error('Tokenizer is required');
    }
    if (this.strategy === undefined) {
      throw new Error('Strategy is required');
    }

    const planner = new ContextPlanner({
      budget: this.budget,
      tokenizer: this.tokenizer,
      strategy: this.strategy,
      reserved: this.reserved,
      safetyMargin: this.safetyMargin,
    });

    if (this.items.length > 0) {
      planner.addAll(this.items);
    }

    return planner;
  }
}
`,
  };
}

/**
 * Create the error classes
 */
export function createErrorClasses() {
  return {
    type: 'file',
    name: 'packages/core/src/errors.ts',
    content: `/**
 * Error Classes
 * 
 * Custom error types for the @reaatech/context-window-planner library.
 * 
 * @module
 */

/**
 * Base error class for all context planner errors.
 */
export class ContextPlannerError extends Error {
  /** Error code for programmatic handling */
  public readonly code: string;
  /** Additional error details */
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ContextPlannerError';
    this.code = code;
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ContextPlannerError);
    }
  }
}

/**
 * Error thrown when the token budget is exceeded.
 */
export class BudgetExceededError extends ContextPlannerError {
  constructor(
    message: string,
    details?: { used: number; available: number },
  ) {
    super(message, 'BUDGET_EXCEEDED', details);
    this.name = 'BudgetExceededError';
  }
}

/**
 * Error thrown when token counting fails.
 */
export class TokenCountError extends ContextPlannerError {
  constructor(
    message: string,
    details?: { text?: string; model?: string },
  ) {
    super(message, 'TOKEN_COUNT_ERROR', details);
    this.name = 'TokenCountError';
  }
}

/**
 * Error thrown for invalid context items.
 */
export class InvalidItemError extends ContextPlannerError {
  constructor(
    message: string,
    details?: { item?: unknown; reason?: string },
  ) {
    super(message, 'INVALID_ITEM', details);
    this.name = 'InvalidItemError';
  }
}

/**
 * Error thrown when tokenizer operations fail.
 */
export class TokenizerError extends ContextPlannerError {
  constructor(
    message: string,
    details?: { model?: string; cause?: string },
  ) {
    super(message, 'TOKENIZER_ERROR', details);
    this.name = 'TokenizerError';
  }
}

/**
 * Error thrown for invalid strategy configuration.
 */
export class StrategyError extends ContextPlannerError {
  constructor(
    message: string,
    details?: { strategy?: string; option?: string },
  ) {
    super(message, 'STRATEGY_ERROR', details);
    this.name = 'StrategyError';
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends ContextPlannerError {
  constructor(
    message: string,
    details?: { field?: string; value?: unknown },
  ) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
`,
  };
}

/**
 * Create utility files
 */
export function createUtilities() {
  return [
    {
      type: 'file',
      name: 'packages/core/src/utils/token-cache.ts',
      content: `/**
 * Token Cache
 * 
 * Caches token counts to avoid redundant calculations.
 * 
 * @module
 */

/**
 * Cache for token counts.
 */
export class TokenCache {
  private cache: Map<string, number>;
  private readonly maxSize: number;

  constructor(maxSize: number = 10000) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * Get a cached token count.
   * 
   * @param key - Cache key
   * @returns Token count or undefined
   */
  get(key: string): number | undefined {
    return this.cache.get(key);
  }

  /**
   * Set a token count in the cache.
   * 
   * @param key - Cache key
   * @param count - Token count
   */
  set(key: string, count: number): void {
    if (this.cache.size >= this.maxSize) {
      // Simple eviction: remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, count);
  }

  /**
   * Invalidate a cached entry.
   * 
   * @param key - Cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached entries.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }
}
`,
    },
    {
      type: 'file',
      name: 'packages/core/src/utils/validation.ts',
      content: `/**
 * Validation Utilities
 * 
 * Input validation functions for the context planner.
 * 
 * @module
 */

import type { TokenBudget, ContextItem } from '../types/index.js';
import { ValidationError } from '../errors.js';

/**
 * Validate a token budget configuration.
 * 
 * @param budget - The budget to validate
 * @throws ValidationError if invalid
 */
export function validateBudget(budget: TokenBudget): void {
  if (budget.total <= 0) {
    throw new ValidationError(
      'Budget total must be positive',
      { field: 'total', value: budget.total },
    );
  }

  if (budget.reserved < 0) {
    throw new ValidationError(
      'Budget reserved cannot be negative',
      { field: 'reserved', value: budget.reserved },
    );
  }

  if (budget.reserved >= budget.total) {
    throw new ValidationError(
      'Budget reserved must be less than total',
      { field: 'reserved', value: budget.reserved, total: budget.total },
    );
  }
}

/**
 * Validate a context item.
 * 
 * @param item - The item to validate
 * @throws ValidationError if invalid
 */
export function validateContextItem(item: ContextItem): void {
  if (!item.id || typeof item.id !== 'string') {
    throw new ValidationError(
      'Context item must have a valid ID',
      { field: 'id', value: item.id },
    );
  }

  if (!item.type || typeof item.type !== 'string') {
    throw new ValidationError(
      'Context item must have a valid type',
      { field: 'type', value: item.type },
    );
  }

  if (typeof item.priority !== 'number') {
    throw new ValidationError(
      'Context item must have a valid priority',
      { field: 'priority', value: item.priority },
    );
  }

  if (item.tokenCount < 0 || !Number.isFinite(item.tokenCount)) {
    throw new ValidationError(
      'Context item token count must be a non-negative number',
      { field: 'tokenCount', value: item.tokenCount },
    );
  }
}

/**
 * Validate a model identifier.
 * 
 * @param model - The model identifier
 * @throws ValidationError if invalid
 */
export function validateModel(model: string): void {
  if (!model || typeof model !== 'string') {
    throw new ValidationError(
      'Model must be a non-empty string',
      { field: 'model', value: model },
    );
  }

  if (model.length > 100) {
    throw new ValidationError(
      'Model identifier too long (max 100 characters)',
      { field: 'model', value: model },
    );
  }
}
`,
    },
  ];
}

/**
 * Generate all planner-related files
 */
export function generatePlannerFiles() {
  const files = {};

  // Main planner
  const planner = createContextPlanner();
  files[planner.name] = planner.content;

  // Builder
  const builder = createContextPlannerBuilder();
  files[builder.name] = builder.content;

  // Errors
  const errors = createErrorClasses();
  files[errors.name] = errors.content;

  // Utilities
  const utilities = createUtilities();
  for (const util of utilities) {
    files[util.name] = util.content;
  }

  return files;
}

export default skill;
