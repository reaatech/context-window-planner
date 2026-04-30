/**
 * Tests for ContextPlanner
 *
 * @vitest
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { BudgetExceededError } from '../src/errors.js';
import { createConversationTurn } from '../src/items/conversation-turn.js';
import { GenerationBuffer } from '../src/items/generation-buffer.js';
import { createSystemPrompt } from '../src/items/system-prompt.js';
import { ContextPlanner } from '../src/planner.js';
import { createPriorityGreedyStrategy } from '../src/strategies/priority-greedy.js';
import { createMockTokenizer } from '../src/tokenizer/mock.js';
import { Priority } from '../src/types/priority.js';

describe('ContextPlanner', () => {
  let planner: ContextPlanner;
  let tokenizer: ReturnType<typeof createMockTokenizer>;

  beforeEach(() => {
    tokenizer = createMockTokenizer();
    planner = new ContextPlanner({
      budget: 10000,
      tokenizer,
      strategy: createPriorityGreedyStrategy(),
    });
  });

  describe('construction', () => {
    it('should create planner with valid budget', () => {
      expect(planner).toBeInstanceOf(ContextPlanner);
      expect(planner.getBudget().total).toBe(10000);
    });

    it('should throw on invalid budget', () => {
      expect(
        () =>
          new ContextPlanner({
            budget: 0,
            tokenizer,
            strategy: createPriorityGreedyStrategy(),
          }),
      ).toThrow();
    });

    it('should throw on negative budget', () => {
      expect(
        () =>
          new ContextPlanner({
            budget: -100,
            tokenizer,
            strategy: createPriorityGreedyStrategy(),
          }),
      ).toThrow();
    });
  });

  describe('adding items', () => {
    it('should add a single item', () => {
      const item = createSystemPrompt({ content: 'Test prompt' }, tokenizer);
      planner.add(item);

      expect(planner.getItems()).toHaveLength(1);
      expect(planner.getItems()[0].id).toBe(item.id);
    });

    it('should add multiple items', () => {
      const items = [
        createSystemPrompt({ content: 'Prompt' }, tokenizer),
        createConversationTurn({ role: 'user', content: 'Hello' }, tokenizer),
      ];
      planner.addAll(items);

      expect(planner.getItems()).toHaveLength(2);
    });

    it('should support method chaining', () => {
      const item1 = createSystemPrompt({ content: 'Prompt' }, tokenizer);
      const item2 = new GenerationBuffer({ reservedTokens: 100 });

      planner.add(item1).add(item2);

      expect(planner.getItems()).toHaveLength(2);
    });
  });

  describe('removing items', () => {
    it('should remove item by ID', () => {
      const item = createSystemPrompt({ content: 'Test' }, tokenizer);
      planner.add(item);
      planner.remove(item.id);

      expect(planner.getItems()).toHaveLength(0);
    });

    it('should remove items by type', () => {
      const prompt = createSystemPrompt({ content: 'Prompt' }, tokenizer);
      const turn = createConversationTurn({ role: 'user', content: 'Hi' }, tokenizer);

      planner.addAll([prompt, turn]);
      planner.removeByType('system_prompt');

      expect(planner.getItems()).toHaveLength(1);
      expect(planner.getItems()[0].type).toBe('conversation_turn');
    });
  });

  describe('packing', () => {
    it('should include items that fit in budget', () => {
      const prompt = createSystemPrompt({ content: 'Short' }, tokenizer);
      planner.add(prompt);

      const result = planner.pack();

      expect(result.included).toHaveLength(1);
      expect(result.dropped).toHaveLength(0);
    });

    it('should drop items that exceed budget', () => {
      const largeContent = 'word '.repeat(10000);
      const largeItem = createSystemPrompt({ content: largeContent }, tokenizer);

      planner.add(largeItem);

      const result = planner.pack();

      expect(result.dropped).toHaveLength(1);
      expect(result.included).toHaveLength(0);
    });

    it('should prioritize critical items', () => {
      const critical = createSystemPrompt(
        {
          content: 'Important',
          priority: Priority.Critical,
        },
        tokenizer,
      );
      const low = createConversationTurn(
        {
          role: 'user',
          content: 'Trivial',
          priority: Priority.Low,
        },
        tokenizer,
      );

      planner = new ContextPlanner({
        budget: 50,
        tokenizer,
        strategy: createPriorityGreedyStrategy(),
      });
      planner.addAll([critical, low]);

      const result = planner.pack();

      expect(result.included.some((i) => i.id === critical.id)).toBe(true);
    });
  });

  describe('token usage', () => {
    it('should calculate total tokens', () => {
      const item1 = createSystemPrompt({ content: 'Hello world' }, tokenizer);
      const item2 = createConversationTurn({ role: 'user', content: 'Hi there' }, tokenizer);

      planner.addAll([item1, item2]);

      const usage = planner.getTokenUsage();
      expect(usage.used).toBeGreaterThan(0);
    });

    it('should check if items fit in budget', () => {
      const item = createSystemPrompt({ content: 'Short' }, tokenizer);
      planner.add(item);

      expect(planner.fitsInBudget()).toBe(true);
    });
  });

  describe('summary', () => {
    it('should generate summary', () => {
      planner.add(createSystemPrompt({ content: 'Test' }, tokenizer));
      planner.add(createConversationTurn({ role: 'user', content: 'Hi' }, tokenizer));

      const summary = planner.getSummary();

      expect(summary.totalItems).toBe(2);
      expect(summary.byType.system_prompt).toHaveLength(1);
      expect(summary.byType.conversation_turn).toHaveLength(1);
    });
  });

  describe('removeByType edge cases', () => {
    it('should be a no-op when removing a nonexistent type', () => {
      const item = createSystemPrompt({ content: 'Test' }, tokenizer);
      planner.add(item);
      planner.removeByType('nonexistent_type');
      expect(planner.getItems()).toHaveLength(1);
    });
  });

  describe('budget exceeded', () => {
    it('should throw BudgetExceededError when strategy exceeds budget', () => {
      const mockStrategy = {
        name: 'bad-strategy',
        execute: () => ({
          included: [],
          summarize: [],
          dropped: [],
          usedTokens: 99999,
          remainingTokens: 0,
          warnings: [],
        }),
      };

      const badPlanner = new ContextPlanner({
        budget: 100,
        tokenizer,
        strategy: mockStrategy,
      });

      expect(() => badPlanner.pack()).toThrow(BudgetExceededError);
    });
  });

  describe('clearing', () => {
    it('should clear all items', () => {
      planner.add(createSystemPrompt({ content: 'Test' }, tokenizer));
      planner.clear();

      expect(planner.getItems()).toHaveLength(0);
    });
  });
});
