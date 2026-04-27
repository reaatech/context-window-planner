/**
 * Error Classes
 *
 * Custom error types for the context-window-planner library.
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
  public readonly details: Record<string, unknown> | undefined;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'ContextPlannerError';
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ContextPlannerError);
    }
  }
}

/**
 * Error thrown when the token budget is exceeded.
 */
export class BudgetExceededError extends ContextPlannerError {
  constructor(message: string, details?: { used: number; available: number }) {
    super(message, 'BUDGET_EXCEEDED', details);
    this.name = 'BudgetExceededError';
  }
}

/**
 * Error thrown when token counting fails.
 */
export class TokenCountError extends ContextPlannerError {
  constructor(message: string, details?: { text?: string; model?: string }) {
    super(message, 'TOKEN_COUNT_ERROR', details);
    this.name = 'TokenCountError';
  }
}

/**
 * Error thrown for invalid context items.
 */
export class InvalidItemError extends ContextPlannerError {
  constructor(message: string, details?: { item?: unknown; reason?: string }) {
    super(message, 'INVALID_ITEM', details);
    this.name = 'InvalidItemError';
  }
}

/**
 * Error thrown when tokenizer operations fail.
 */
export class TokenizerError extends ContextPlannerError {
  constructor(message: string, details?: { model?: string; cause?: string }) {
    super(message, 'TOKENIZER_ERROR', details);
    this.name = 'TokenizerError';
  }
}

/**
 * Error thrown for invalid strategy configuration.
 */
export class StrategyError extends ContextPlannerError {
  constructor(message: string, details?: { strategy?: string; option?: string }) {
    super(message, 'STRATEGY_ERROR', details);
    this.name = 'StrategyError';
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends ContextPlannerError {
  constructor(message: string, details?: { field?: string; value?: unknown }) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}
