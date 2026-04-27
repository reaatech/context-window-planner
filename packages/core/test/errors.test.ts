/**
 * Tests for error classes
 *
 * @vitest
 */

import { describe, it, expect } from 'vitest';

import {
  BudgetExceededError,
  ContextPlannerError,
  InvalidItemError,
  StrategyError,
  TokenCountError,
  TokenizerError,
  ValidationError,
} from '../src/errors.js';

describe('ContextPlannerError', () => {
  it('should have code and details', () => {
    const err = new ContextPlannerError('test', 'TEST_CODE', { key: 'val' });
    expect(err.code).toBe('TEST_CODE');
    expect(err.details).toEqual({ key: 'val' });
    expect(err.message).toBe('test');
    expect(err.name).toBe('ContextPlannerError');
  });

  it('should work without details', () => {
    const err = new ContextPlannerError('msg', 'CODE');
    expect(err.details).toBeUndefined();
    expect(err.code).toBe('CODE');
  });
});

describe('BudgetExceededError', () => {
  it('should have correct code', () => {
    const err = new BudgetExceededError('over', { used: 100, available: 50 });
    expect(err.code).toBe('BUDGET_EXCEEDED');
    expect(err.name).toBe('BudgetExceededError');
  });
});

describe('TokenCountError', () => {
  it('should have correct code', () => {
    const err = new TokenCountError('bad', { text: 'x', model: 'gpt-4' });
    expect(err.code).toBe('TOKEN_COUNT_ERROR');
  });
});

describe('InvalidItemError', () => {
  it('should have correct code', () => {
    const err = new InvalidItemError('bad item');
    expect(err.code).toBe('INVALID_ITEM');
  });
});

describe('TokenizerError', () => {
  it('should have correct code', () => {
    const err = new TokenizerError('bad tokenizer');
    expect(err.code).toBe('TOKENIZER_ERROR');
  });
});

describe('StrategyError', () => {
  it('should have correct code', () => {
    const err = new StrategyError('bad strategy');
    expect(err.code).toBe('STRATEGY_ERROR');
  });
});

describe('ValidationError', () => {
  it('should have correct code', () => {
    const err = new ValidationError('invalid');
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('should include field and value details', () => {
    const err = new ValidationError('invalid', { field: 'x', value: -1 });
    expect(err.details).toEqual({ field: 'x', value: -1 });
  });
});
