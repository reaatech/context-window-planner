/**
 * Tests for ContextPlannerBuilder
 *
 * @vitest
 */

import { describe, expect, it } from 'vitest';

import { ContextPlannerBuilder } from '../src/builder.js';
import { ValidationError } from '../src/errors.js';
import { createSystemPrompt } from '../src/items/system-prompt.js';
import { ContextPlanner } from '../src/planner.js';
import { createPriorityGreedyStrategy } from '../src/strategies/priority-greedy.js';
import { createMockTokenizer } from '../src/tokenizer/mock.js';

describe('ContextPlannerBuilder', () => {
  it('builds a planner when all required options are set', () => {
    const tokenizer = createMockTokenizer();
    const planner = new ContextPlannerBuilder()
      .withBudget(1000)
      .withTokenizer(tokenizer)
      .withStrategy(createPriorityGreedyStrategy())
      .build();

    expect(planner).toBeInstanceOf(ContextPlanner);
    expect(planner.getBudget().total).toBe(1000);
  });

  it('applies reserved tokens and safety margin to available budget', () => {
    const tokenizer = createMockTokenizer();
    const planner = new ContextPlannerBuilder()
      .withBudget(1000)
      .withTokenizer(tokenizer)
      .withStrategy(createPriorityGreedyStrategy())
      .withReserved(100)
      .withSafetyMargin(0.1)
      .build();

    expect(planner.getBudget().reserved).toBe(200);
    expect(planner.getBudget().available).toBe(800);
  });

  it('carries items added via the builder into the planner', () => {
    const tokenizer = createMockTokenizer();
    const planner = new ContextPlannerBuilder()
      .withBudget(1000)
      .withTokenizer(tokenizer)
      .withStrategy(createPriorityGreedyStrategy())
      .addItem(createSystemPrompt({ content: 'hello' }, tokenizer))
      .addItems([createSystemPrompt({ content: 'world' }, tokenizer)])
      .build();

    expect(planner.getItems()).toHaveLength(2);
  });

  it('throws when required options are missing', () => {
    const tokenizer = createMockTokenizer();

    expect(() => new ContextPlannerBuilder().build()).toThrow(ValidationError);
    expect(() => new ContextPlannerBuilder().withBudget(100).build()).toThrow(ValidationError);
    expect(() =>
      new ContextPlannerBuilder().withBudget(100).withTokenizer(tokenizer).build(),
    ).toThrow(ValidationError);
  });

  it('rejects invalid budget, reserved, and safety margin values', () => {
    expect(() => new ContextPlannerBuilder().withBudget(0)).toThrow(ValidationError);
    expect(() => new ContextPlannerBuilder().withBudget(-1)).toThrow(ValidationError);
    expect(() => new ContextPlannerBuilder().withReserved(-5)).toThrow(ValidationError);
    expect(() => new ContextPlannerBuilder().withSafetyMargin(-0.1)).toThrow(ValidationError);
    expect(() => new ContextPlannerBuilder().withSafetyMargin(1.5)).toThrow(ValidationError);
  });
});
