/**
 * Validation Utilities
 *
 * Input validation functions for the context planner.
 *
 * @module
 */

import { ValidationError } from '../errors.js';
import type { ContextItem } from '../types/index.js';
import { TokenBudget } from '../types/index.js';

interface BudgetLike {
  total: number;
  reserved: number;
}

/**
 * Validate a token budget configuration.
 *
 * @param budget - The budget to validate
 * @throws ValidationError if invalid
 */
export function validateBudget(budget: BudgetLike): void {
  if (budget.total <= 0) {
    throw new ValidationError('Budget total must be positive', {
      field: 'total',
      value: budget.total,
    });
  }

  if (budget.reserved < 0) {
    throw new ValidationError('Budget reserved cannot be negative', {
      field: 'reserved',
      value: budget.reserved,
    });
  }

  if (budget.reserved >= budget.total) {
    throw new ValidationError('Budget reserved must be less than total', {
      field: 'reserved',
      value: budget.reserved,
    });
  }
}

/**
 * Create a TokenBudget from raw values.
 *
 * @param total - Total available tokens
 * @param reserved - Reserved tokens
 * @returns A validated TokenBudget
 */
export function createBudget(total: number, reserved: number = 0): TokenBudget {
  validateBudget({ total, reserved });
  return new TokenBudget(total, reserved);
}

/**
 * Validate a context item.
 *
 * @param item - The item to validate
 * @throws ValidationError if invalid
 */
export function validateContextItem(item: ContextItem): void {
  if (!item.id || typeof item.id !== 'string') {
    throw new ValidationError('Context item must have a valid ID', {
      field: 'id',
      value: item.id,
    });
  }

  if (!item.type || typeof item.type !== 'string') {
    throw new ValidationError('Context item must have a valid type', {
      field: 'type',
      value: item.type,
    });
  }

  if (typeof item.priority !== 'number') {
    throw new ValidationError('Context item must have a valid priority', {
      field: 'priority',
      value: item.priority,
    });
  }

  if (item.tokenCount < 0 || !Number.isFinite(item.tokenCount)) {
    throw new ValidationError('Context item token count must be a non-negative number', {
      field: 'tokenCount',
      value: item.tokenCount,
    });
  }
}

/**
 * Truncate content to approximately fit a target token budget.
 *
 * Uses character-length ratio as a rough token-count estimate.
 * Appends "…" when truncation occurs.
 *
 * @param content - Original content
 * @param originalTokens - Token count of the original content
 * @param targetTokens - Desired token count after truncation
 * @returns Truncated content string
 */
export function truncateContent(
  content: string,
  originalTokens: number,
  targetTokens: number,
): string {
  if (content.length === 0 || originalTokens <= 0 || targetTokens >= originalTokens) {
    return content;
  }
  const ratio = targetTokens / originalTokens;
  const charLimit = Math.max(1, Math.floor(content.length * ratio) - 1);
  return content.slice(0, charLimit) + '\u2026';
}

/**
 * Validate a model identifier.
 *
 * @param model - The model identifier
 * @throws ValidationError if invalid
 */
export function validateModel(model: string): void {
  if (!model || typeof model !== 'string') {
    throw new ValidationError('Model must be a non-empty string', {
      field: 'model',
      value: model,
    });
  }

  if (model.length > 100) {
    throw new ValidationError('Model identifier too long (max 100 characters)', {
      field: 'model',
      value: model,
    });
  }
}
