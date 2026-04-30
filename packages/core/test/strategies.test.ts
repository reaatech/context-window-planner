/**
 * Tests for packing strategies
 *
 * @vitest
 */

import { fc } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';

import { createConversationTurn } from '../src/items/conversation-turn.js';
import { GenerationBuffer } from '../src/items/generation-buffer.js';
import { createRAGChunk } from '../src/items/rag-chunk.js';
import { createSystemPrompt } from '../src/items/system-prompt.js';
import { ContextPlanner } from '../src/planner.js';
import {
  createPriorityGreedyStrategy,
  createRAGSelectionStrategy,
  createSlidingWindowStrategy,
  createStrategy,
  createSummarizeAndReplaceStrategy,
} from '../src/strategies/index.js';
import { createMockTokenizer } from '../src/tokenizer/mock.js';
import type { ContextItem } from '../src/types/index.js';
import { Priority } from '../src/types/priority.js';
import { TokenBudget } from '../src/types/token-budget.js';

describe('PriorityGreedyStrategy', () => {
  it('should include items by priority order', () => {
    const tokenizer = createMockTokenizer();
    const items = [
      createSystemPrompt({ content: 'Low', priority: Priority.Low }, tokenizer),
      createSystemPrompt({ content: 'Critical', priority: Priority.Critical }, tokenizer),
      createSystemPrompt({ content: 'High', priority: Priority.High }, tokenizer),
    ];

    const strategy = createPriorityGreedyStrategy();
    const result = strategy.execute({
      budget: new TokenBudget(10000, 0),
      items,
      tokenizer,
    });

    expect(result.included[0].priority).toBe(Priority.Critical);
    expect(result.included[1].priority).toBe(Priority.High);
    expect(result.included[2].priority).toBe(Priority.Low);
  });

  it('should drop items that exceed budget', () => {
    const tokenizer = createMockTokenizer();
    const items = [
      createSystemPrompt(
        { content: 'word '.repeat(10000), priority: Priority.Critical },
        tokenizer,
      ),
    ];

    const strategy = createPriorityGreedyStrategy();
    const result = strategy.execute({
      budget: new TokenBudget(100, 0),
      items,
      tokenizer,
    });

    expect(result.dropped).toHaveLength(1);
    expect(result.included).toHaveLength(0);
  });
});

describe('SlidingWindowStrategy', () => {
  it('should keep most recent turns', () => {
    const tokenizer = createMockTokenizer();
    const now = Date.now();
    const items = [
      createConversationTurn({ role: 'user', content: 'Old', timestamp: now - 60000 }, tokenizer),
      createConversationTurn({ role: 'user', content: 'New', timestamp: now }, tokenizer),
    ];

    const strategy = createSlidingWindowStrategy({ windowSize: 1 });
    const result = strategy.execute({
      budget: new TokenBudget(10000, 0),
      items,
      tokenizer,
    });

    const includedTurns = result.included.filter((i) => i.type === 'conversation_turn');
    expect(includedTurns.length).toBeGreaterThanOrEqual(1);
  });
});

describe('SummarizeAndReplaceStrategy', () => {
  it('should summarize items when over budget', () => {
    const tokenizer = createMockTokenizer();
    const items = [
      createSystemPrompt({ content: 'Critical', priority: Priority.Critical }, tokenizer),
      createConversationTurn(
        { role: 'user', content: 'word '.repeat(5000), priority: Priority.Low },
        tokenizer,
      ),
    ];

    const strategy = createSummarizeAndReplaceStrategy();
    const result = strategy.execute({
      budget: new TokenBudget(100, 0),
      items,
      tokenizer,
    });

    expect(result.included.length + result.summarize.length + result.dropped.length).toBe(2);
  });
});

describe('RelevanceScoredRAGStrategy', () => {
  it('should select high-relevance chunks', () => {
    const tokenizer = createMockTokenizer();
    const items = [
      createSystemPrompt({ content: 'Prompt' }, tokenizer),
      createRAGChunk({ content: 'High relevance', relevanceScore: 0.9 }, tokenizer),
      createRAGChunk({ content: 'Low relevance', relevanceScore: 0.1 }, tokenizer),
    ];

    const strategy = createRAGSelectionStrategy();
    const result = strategy.execute({
      budget: new TokenBudget(10000, 0),
      items,
      tokenizer,
    });

    const ragIncluded = result.included.filter((i) => i.type === 'rag_chunk');
    expect(ragIncluded.every((i) => (i as { relevanceScore: number }).relevanceScore >= 0.5)).toBe(
      true,
    );
  });

  it('should drop rag_chunk items missing relevanceScore with a warning', () => {
    const tokenizer = createMockTokenizer();
    const foreignChunk: ContextItem = {
      id: 'foreign-1',
      type: 'rag_chunk',
      priority: Priority.Medium,
      tokenCount: 5,
      metadata: undefined,
      canSummarize: () => false,
    };

    const strategy = createRAGSelectionStrategy();
    const result = strategy.execute({
      budget: new TokenBudget(10000, 0),
      items: [foreignChunk],
      tokenizer,
    });

    expect(result.included).toHaveLength(0);
    expect(result.dropped).toContain(foreignChunk);
    expect(
      result.warnings.some(
        (w) => w.code === 'ITEM_DROPPED' && w.message.includes('missing relevanceScore'),
      ),
    ).toBe(true);
  });
});

describe('Planner budget validation', () => {
  it('rejects safety margin outside [0, 1]', () => {
    const tokenizer = createMockTokenizer();
    expect(
      () =>
        new ContextPlanner({
          budget: 1000,
          tokenizer,
          strategy: createPriorityGreedyStrategy(),
          safetyMargin: 1.5,
        }),
    ).toThrow(/Safety margin/);
    expect(
      () =>
        new ContextPlanner({
          budget: 1000,
          tokenizer,
          strategy: createPriorityGreedyStrategy(),
          safetyMargin: -0.1,
        }),
    ).toThrow(/Safety margin/);
  });

  it('rejects reserved + safety margin >= total', () => {
    const tokenizer = createMockTokenizer();
    expect(
      () =>
        new ContextPlanner({
          budget: 1000,
          reserved: 950,
          tokenizer,
          strategy: createPriorityGreedyStrategy(),
          safetyMargin: 0.1,
        }),
    ).toThrow();
  });
});

describe('SlidingWindowStrategy branches', () => {
  it('should work with prioritizeRecent: false', () => {
    const tokenizer = createMockTokenizer();
    const now = Date.now();
    const items = [
      createConversationTurn({ role: 'user', content: 'Old', timestamp: now - 60000 }, tokenizer),
      createConversationTurn({ role: 'user', content: 'New', timestamp: now }, tokenizer),
    ];

    const strategy = createSlidingWindowStrategy({ windowSize: 1, prioritizeRecent: false });
    const result = strategy.execute({
      budget: new TokenBudget(10000, 0),
      items,
      tokenizer,
    });

    const includedTurns = result.included.filter((i) => i.type === 'conversation_turn');
    expect(includedTurns.length).toBeGreaterThanOrEqual(1);
  });

  it('should throw when windowSize is missing', () => {
    expect(() =>
      createSlidingWindowStrategy({ windowSize: undefined as unknown as number }),
    ).toThrow(/windowSize/);
  });

  it('should summarize old turns over budget', () => {
    const tokenizer = createMockTokenizer();
    const now = Date.now();
    const items = [
      createSystemPrompt({ content: 'Prompt', priority: Priority.Critical }, tokenizer),
      createConversationTurn(
        { role: 'user', content: 'word '.repeat(5000), timestamp: now - 120000 },
        tokenizer,
      ),
      createConversationTurn({ role: 'user', content: 'Recent', timestamp: now }, tokenizer),
    ];

    const strategy = createSlidingWindowStrategy({ windowSize: 1 });
    const result = strategy.execute({
      budget: new TokenBudget(30, 0),
      items,
      tokenizer,
    });

    const total = result.included.length + result.summarize.length + result.dropped.length;
    expect(total).toBe(3);
  });
});

describe('SummarizeAndReplaceStrategy branches', () => {
  it('should drop items that still exceed budget after summarization', () => {
    const tokenizer = createMockTokenizer();
    const items = [
      createConversationTurn({ role: 'user', content: 'word '.repeat(5000) }, tokenizer),
    ];

    const strategy = createSummarizeAndReplaceStrategy({
      compressionRatio: 0.9,
      maxSummaries: 1,
    });
    const result = strategy.execute({
      budget: new TokenBudget(5, 0),
      items,
      tokenizer,
    });

    expect(result.summarize.length).toBe(1);
  });

  it('should respect maxSummaries', () => {
    const tokenizer = createMockTokenizer();
    const items = [
      createSystemPrompt({ content: 'word '.repeat(5000), priority: Priority.Critical }, tokenizer),
      createConversationTurn({ role: 'user', content: 'word '.repeat(5000) }, tokenizer),
      createConversationTurn({ role: 'user', content: 'word '.repeat(5000) }, tokenizer),
    ];

    const strategy = createSummarizeAndReplaceStrategy({
      compressionRatio: 0.3,
      maxSummaries: 1,
    });
    const result = strategy.execute({
      budget: new TokenBudget(200, 0),
      items,
      tokenizer,
    });

    expect(result.summarize.length).toBeLessThanOrEqual(1);
  });

  it('should use default options', () => {
    const strategy = createSummarizeAndReplaceStrategy();
    expect(strategy.name).toBe('summarize-replace');
  });
});

describe('RAGSelectionStrategy branches', () => {
  it('should drop chunks exceeding maxChunks', () => {
    const tokenizer = createMockTokenizer();
    const chunks = Array.from({ length: 5 }, (_, i) =>
      createRAGChunk({ content: `chunk-${i}`, relevanceScore: 0.9 }, tokenizer),
    );

    const strategy = createRAGSelectionStrategy({ maxChunks: 2 });
    const result = strategy.execute({
      budget: new TokenBudget(10000, 0),
      items: chunks,
      tokenizer,
    });

    const ragIncluded = result.included.filter((i) => i.type === 'rag_chunk');
    expect(ragIncluded.length).toBeLessThanOrEqual(2);
  });

  it('should use default options', () => {
    const strategy = createRAGSelectionStrategy();
    expect(strategy.name).toBe('rag-selection');
  });
});

describe('PriorityGreedyStrategy branches', () => {
  it('should emit LOW_REMAINING warning when budget nearly full', () => {
    const tokenizer = createMockTokenizer();
    const item = createSystemPrompt(
      { content: 'word '.repeat(500), priority: Priority.Critical },
      tokenizer,
    );

    const strategy = createPriorityGreedyStrategy();
    const tightBudget = new TokenBudget(item.tokenCount + 1, 0);
    const result = strategy.execute({
      budget: tightBudget,
      items: [item],
      tokenizer,
    });

    expect(result.warnings.some((w) => w.code === 'LOW_REMAINING')).toBe(true);
  });
});

describe('Property-based tests', () => {
  it('priority-greedy never exceeds budget for any budget value', () =>
    fc.assert(
      fc.property(fc.integer({ min: 10, max: 10000 }), (budget) => {
        const tokenizer = createMockTokenizer();
        const items = [
          createSystemPrompt(
            { content: 'System prompt here', priority: Priority.Critical },
            tokenizer,
          ),
          createConversationTurn({ role: 'user', content: 'Hello' }, tokenizer),
          createConversationTurn({ role: 'assistant', content: 'Hi there' }, tokenizer),
          createConversationTurn({ role: 'user', content: 'How are you?' }, tokenizer),
        ];

        const strategy = createPriorityGreedyStrategy();
        const result = strategy.execute({
          budget: new TokenBudget(budget, 0),
          items,
          tokenizer,
        });

        expect(result.usedTokens).toBeLessThanOrEqual(budget);
      }),
    ));
});

describe('StrategyFactory', () => {
  it('should create strategy by name via factory', () => {
    const strategy = createStrategy('priority-greedy');
    expect(strategy.name).toBe('priority-greedy');
  });

  it('should create sliding-window with options', () => {
    const strategy = createStrategy('sliding-window', { windowSize: 5 });
    expect(strategy.name).toBe('sliding-window');
  });

  it('should create summarize-replace', () => {
    const strategy = createStrategy('summarize-replace');
    expect(strategy.name).toBe('summarize-replace');
  });

  it('should create rag-selection', () => {
    const strategy = createStrategy('rag-selection');
    expect(strategy.name).toBe('rag-selection');
  });

  it('should throw for unknown strategy', () => {
    expect(() => createStrategy('nonexistent')).toThrow(/Unknown strategy/);
  });
});
