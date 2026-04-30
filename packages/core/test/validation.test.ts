/**
 * Tests for validation utilities
 *
 * @vitest
 */

import { describe, expect, it } from 'vitest';

import { ValidationError } from '../src/errors.js';
import type { ContextItem } from '../src/types/index.js';
import { Priority } from '../src/types/priority.js';
import { TokenBudget } from '../src/types/token-budget.js';
import {
  createBudget,
  truncateContent,
  validateBudget,
  validateContextItem,
  validateModel,
} from '../src/utils/validation.js';

describe('validateBudget', () => {
  it('should accept valid budget', () => {
    expect(() => validateBudget({ total: 1000, reserved: 100 })).not.toThrow();
  });

  it('should throw on zero total', () => {
    expect(() => validateBudget({ total: 0, reserved: 0 })).toThrow(ValidationError);
  });

  it('should throw on negative total', () => {
    expect(() => validateBudget({ total: -1, reserved: 0 })).toThrow(ValidationError);
  });

  it('should throw on negative reserved', () => {
    expect(() => validateBudget({ total: 100, reserved: -1 })).toThrow(ValidationError);
  });

  it('should throw when reserved >= total', () => {
    expect(() => validateBudget({ total: 100, reserved: 100 })).toThrow(ValidationError);
    expect(() => validateBudget({ total: 100, reserved: 150 })).toThrow(ValidationError);
  });
});

describe('createBudget', () => {
  it('should return a TokenBudget', () => {
    const budget = createBudget(1000, 100);
    expect(budget).toBeInstanceOf(TokenBudget);
    expect(budget.total).toBe(1000);
    expect(budget.reserved).toBe(100);
    expect(budget.available).toBe(900);
  });

  it('should default reserved to 0', () => {
    const budget = createBudget(500);
    expect(budget.reserved).toBe(0);
  });
});

describe('validateContextItem', () => {
  it('should accept valid item', () => {
    const item: ContextItem = {
      id: 'abc',
      type: 'custom',
      priority: Priority.Medium,
      tokenCount: 10,
      metadata: undefined,
      canSummarize: () => false,
    };
    expect(() => validateContextItem(item)).not.toThrow();
  });

  it('should throw on missing id', () => {
    const item: ContextItem = {
      id: '',
      type: 'custom',
      priority: Priority.Medium,
      tokenCount: 10,
      metadata: undefined,
      canSummarize: () => false,
    };
    expect(() => validateContextItem(item)).toThrow(ValidationError);
  });

  it('should throw on invalid type', () => {
    const item: ContextItem = {
      id: 'abc',
      type: '',
      priority: Priority.Medium,
      tokenCount: 10,
      metadata: undefined,
      canSummarize: () => false,
    };
    expect(() => validateContextItem(item)).toThrow(ValidationError);
  });

  it('should throw on invalid priority', () => {
    const item = {
      id: 'abc',
      type: 'custom',
      priority: 'high',
      tokenCount: 10,
      metadata: undefined,
      canSummarize: () => false,
    };
    expect(() => validateContextItem(item as unknown as ContextItem)).toThrow(ValidationError);
  });

  it('should throw on negative token count', () => {
    const item: ContextItem = {
      id: 'abc',
      type: 'custom',
      priority: Priority.Medium,
      tokenCount: -1,
      metadata: undefined,
      canSummarize: () => false,
    };
    expect(() => validateContextItem(item)).toThrow(ValidationError);
  });

  it('should throw on non-finite token count', () => {
    const item: ContextItem = {
      id: 'abc',
      type: 'custom',
      priority: Priority.Medium,
      tokenCount: Number.POSITIVE_INFINITY,
      metadata: undefined,
      canSummarize: () => false,
    };
    expect(() => validateContextItem(item)).toThrow(ValidationError);
  });
});

describe('validateModel', () => {
  it('should accept valid model', () => {
    expect(() => validateModel('gpt-4')).not.toThrow();
  });

  it('should throw on empty string', () => {
    expect(() => validateModel('')).toThrow(ValidationError);
  });

  it('should throw on non-string', () => {
    expect(() => validateModel(42 as unknown as string)).toThrow(ValidationError);
  });

  it('should throw on too-long model name', () => {
    expect(() => validateModel('a'.repeat(101))).toThrow(ValidationError);
  });

  it('should accept model at max length', () => {
    expect(() => validateModel('a'.repeat(100))).not.toThrow();
  });
});

describe('truncateContent', () => {
  it('should truncate content proportionally', () => {
    const result = truncateContent('hello world this is long', 10, 5);
    expect(result.length).toBeLessThan('hello world this is long'.length);
    expect(result).toMatch(/…$/);
  });

  it('should return original content when no truncation needed', () => {
    expect(truncateContent('hello', 10, 10)).toBe('hello');
    expect(truncateContent('hello', 5, 10)).toBe('hello');
  });

  it('should return original when originalTokens is zero', () => {
    expect(truncateContent('hello', 0, 5)).toBe('hello');
  });

  it('should produce at least one character', () => {
    const result = truncateContent('hello world', 100, 1);
    expect(result.length).toBeGreaterThanOrEqual(1);
  });
});
