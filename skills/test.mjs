/**
 * Agent Skill: Testing with Vitest
 *
 * This skill defines patterns and procedures for writing tests
 * in the @reaatech/context-window-planner project.
 */

export const skill = {
  name: 'test',
  description: 'Writing tests with Vitest',
  version: '1.0.0',
};

/**
 * Test file template for a class
 */
export function createClassTest(className, modulePath, testCases) {
  const fileName = `packages/core/test/${className.toLowerCase()}.test.ts`;

  return {
    type: 'file',
    name: fileName,
    content: `/**
 * Tests for ${className}
 * 
 * @vitest
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ${className} } from '${modulePath}';

describe('${className}', () => {
  let instance: ${className};

  beforeEach(() => {
    // Setup test instance
    instance = new ${className}({
      // Add required constructor args
    });
  });

  ${testCases
    .map(
      (tc) => `/**
   * ${tc.description}
   */
  it('${tc.description}', () => {
    ${tc.setup || ''}
    ${tc.assertion}
  });
`,
    )
    .join('\n  ')}
});
`,
  };
}

/**
 * Create unit tests for Priority type
 */
export function createPriorityTests() {
  return {
    type: 'file',
    name: 'packages/core/test/priority.test.ts',
    content: `/**
 * Tests for Priority enum
 * 
 * @vitest
 */

import { describe, it, expect } from 'vitest';
import { Priority } from '../src/types/priority.js';

describe('Priority', () => {
  describe('values', () => {
    it('should have Critical as highest priority', () => {
      expect(Priority.Critical).toBe(100);
    });

    it('should have High priority', () => {
      expect(Priority.High).toBe(75);
    });

    it('should have Medium priority', () => {
      expect(Priority.Medium).toBe(50);
    });

    it('should have Low priority', () => {
      expect(Priority.Low).toBe(25);
    });

    it('should have Disposable as lowest priority', () => {
      expect(Priority.Disposable).toBe(0);
    });
  });

  describe('ordering', () => {
    it('should have correct priority ordering', () => {
      expect(Priority.Critical).toBeGreaterThan(Priority.High);
      expect(Priority.High).toBeGreaterThan(Priority.Medium);
      expect(Priority.Medium).toBeGreaterThan(Priority.Low);
      expect(Priority.Low).toBeGreaterThan(Priority.Disposable);
    });

    it('should sort items by priority correctly', () => {
      const items = [
        { priority: Priority.Low },
        { priority: Priority.Critical },
        { priority: Priority.Medium },
        { priority: Priority.High },
      ];

      const sorted = items.sort((a, b) => b.priority - a.priority);

      expect(sorted[0].priority).toBe(Priority.Critical);
      expect(sorted[1].priority).toBe(Priority.High);
      expect(sorted[2].priority).toBe(Priority.Medium);
      expect(sorted[3].priority).toBe(Priority.Low);
    });
  });
});
`,
  };
}

/**
 * Create unit tests for ContextPlanner
 */
export function createContextPlannerTests() {
  return {
    type: 'file',
    name: 'packages/core/test/planner.test.ts',
    content: `/**
 * Tests for ContextPlanner
 * 
 * @vitest
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextPlanner } from '../src/planner.js';
import { Priority } from '../src/types/priority.js';
import { createMockTokenizer } from '../src/tokenizer/mock.js';
import { SystemPrompt } from '../src/items/system-prompt.js';
import { ConversationTurn } from '../src/items/conversation-turn.js';
import { GenerationBuffer } from '../src/items/generation-buffer.js';
import { createPriorityGreedyStrategy } from '../src/strategies/priority-greedy.js';

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
      expect(() => new ContextPlanner({
        budget: 0,
        tokenizer,
        strategy: createPriorityGreedyStrategy(),
      })).toThrow();
    });

    it('should throw on negative budget', () => {
      expect(() => new ContextPlanner({
        budget: -100,
        tokenizer,
        strategy: createPriorityGreedyStrategy(),
      })).toThrow();
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
      // Create a very large item
      const largeContent = 'word '.repeat(10000);
      const largeItem = createSystemPrompt({ content: largeContent }, tokenizer);
      
      planner.add(largeItem);
      
      const result = planner.pack();
      
      expect(result.dropped).toHaveLength(1);
      expect(result.included).toHaveLength(0);
    });

    it('should prioritize critical items', () => {
      const critical = createSystemPrompt({ 
        content: 'Important', 
        priority: Priority.Critical 
      }, tokenizer);
      const low = createConversationTurn({ 
        role: 'user', 
        content: 'Trivial', 
        priority: Priority.Low 
      }, tokenizer);
      
      // Set small budget to force dropping
      planner = new ContextPlanner({
        budget: 50,
        tokenizer,
        strategy: createPriorityGreedyStrategy(),
      });
      planner.addAll([critical, low]);
      
      const result = planner.pack();
      
      expect(result.included.some(i => i.id === critical.id)).toBe(true);
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
      expect(summary.byType['system_prompt']).toHaveLength(1);
      expect(summary.byType['conversation_turn']).toHaveLength(1);
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
`,
  };
}

/**
 * Create property-based tests
 */
export function createPropertyBasedTests() {
  return {
    type: 'file',
    name: 'packages/core/test/property-based.test.ts',
    content: `/**
 * Property-based tests for packing strategies
 * 
 * Uses fast-check for property-based testing.
 * 
 * @vitest
 */

import { describe, it, expect } from 'vitest';
import { fc } from '@fast-check/vitest';
import { ContextPlanner } from '../src/planner.js';
import { createMockTokenizer } from '../src/tokenizer/mock.js';
import { createPriorityGreedyStrategy } from '../src/strategies/priority-greedy.js';
import { createSystemPrompt } from '../src/items/system-prompt.js';
import { Priority } from '../src/types/priority.js';

describe('Property-based tests', () => {
  describe('budget constraints', () => {
    it('should always respect budget constraints', () =>
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 100000 }),
          fc.array(
            fc.string().map((content) => ({ content })),
            { minLength: 1, maxLength: 50 },
          ),
          (budget, items) => {
            const tokenizer = createMockTokenizer();
            const planner = new ContextPlanner({
              budget,
              tokenizer,
              strategy: createPriorityGreedyStrategy(),
            });

            items.forEach(({ content }) => {
              planner.add(createSystemPrompt({ content }, tokenizer));
            });

            const result = planner.pack();
            
            return result.usedTokens <= budget;
          },
        ),
      ),
    );

    it('should include critical items before lower priority', () =>
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }),
          fc.integer({ min: 1, max: 20 }),
          (budget, itemCount) => {
            const tokenizer = createMockTokenizer();
            const planner = new ContextPlanner({
              budget,
              tokenizer,
              strategy: createPriorityGreedyStrategy(),
            });

            // Add items with varying priorities
            for (let i = 0; i < itemCount; i++) {
              const priority = [
                Priority.Critical,
                Priority.High,
                Priority.Medium,
                Priority.Low,
                Priority.Disposable,
              ][i % 5];
              
              planner.add(
                createSystemPrompt(
                  { content: 'item'.repeat(i + 1), priority },
                  tokenizer,
                ),
              );
            }

            const result = planner.pack();
            
            // Check that no dropped item has higher priority than an included item
            const minIncludedPriority = result.included.length > 0
              ? Math.min(...result.included.map((i) => i.priority))
              : Infinity;
            
            const maxDroppedPriority = result.dropped.length > 0
              ? Math.max(...result.dropped.map((i) => i.priority))
              : -Infinity;
            
            return maxDroppedPriority <= minIncludedPriority;
          },
        ),
      ),
    );
  });

  describe('edge cases', () => {
    it('should handle empty item list', () =>
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }),
          (budget) => {
            const tokenizer = createMockTokenizer();
            const planner = new ContextPlanner({
              budget,
              tokenizer,
              strategy: createPriorityGreedyStrategy(),
            });

            const result = planner.pack();
            
            return (
              result.included.length === 0 &&
              result.dropped.length === 0 &&
              result.usedTokens === 0
            );
          },
        ),
      ),
    );

    it('should handle single item', () =>
      fc.assert(
        fc.property(
          fc.integer({ min: 100, max: 10000 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (budget, content) => {
            const tokenizer = createMockTokenizer();
            const planner = new ContextPlanner({
              budget,
              tokenizer,
              strategy: createPriorityGreedyStrategy(),
            });

            planner.add(createSystemPrompt({ content }, tokenizer));
            const result = planner.pack();
            
            return result.included.length + result.dropped.length === 1;
          },
        ),
      ),
    );
  });
});
`,
  };
}

/**
 * Create integration tests
 */
export function createIntegrationTests() {
  return {
    type: 'file',
    name: 'packages/core/test/integration.test.ts',
    content: `/**
 * Integration tests for @reaatech/context-window-planner
 * 
 * @vitest
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ContextPlannerBuilder } from '../src/builder.js';
import { createMockTokenizer } from '../src/tokenizer/mock.js';
import { strategies } from '../src/strategies/factory.js';
import { createSystemPrompt } from '../src/items/system-prompt.js';
import { createConversationTurn } from '../src/items/conversation-turn.js';
import { createRAGChunk } from '../src/items/rag-chunk.js';
import { createToolSchema } from '../src/items/tool-schema.js';
import { GenerationBuffer } from '../src/items/generation-buffer.js';
import { Priority } from '../src/types/priority.js';

describe('Integration tests', () => {
  describe('full workflow', () => {
    it('should handle complete RAG + conversation workflow', () => {
      const tokenizer = createMockTokenizer();
      
      const planner = new ContextPlannerBuilder()
        .withBudget(128000)
        .withTokenizer(tokenizer)
        .withStrategy(strategies.create('priority-greedy'))
        .withReserved(4096)
        .addItem(
          createSystemPrompt(
            { content: 'You are a helpful AI assistant.', priority: Priority.Critical },
            tokenizer,
          ),
        )
        .addItem(new GenerationBuffer({ reservedTokens: 4096 }))
        .addItems([
          createConversationTurn({ role: 'user', content: 'What is TypeScript?' }, tokenizer),
          createConversationTurn({ role: 'assistant', content: 'TypeScript is a typed superset of JavaScript.' }, tokenizer),
        ])
        .addItems(
          Array.from({ length: 10 }, (_, i) =>
            createRAGChunk(
              {
                content: \`Document chunk \${i + 1} with relevant information.\`,
                relevanceScore: 1 - i * 0.1,
              },
              tokenizer,
            ),
          ),
        )
        .addItem(
          createToolSchema(
            { 
              name: 'search', 
              description: 'Search for information',
              schema: { type: 'object', properties: { query: { type: 'string' } } },
            },
            tokenizer,
          ),
        )
        .build();

      const result = planner.pack();
      
      expect(result.included.length + result.dropped.length + result.summarize.length)
        .toBe(planner.getItems().length);
      expect(result.usedTokens).toBeLessThanOrEqual(128000);
    });

    it('should handle sliding window strategy', () => {
      const tokenizer = createMockTokenizer();
      
      const planner = new ContextPlannerBuilder()
        .withBudget(10000)
        .withTokenizer(tokenizer)
        .withStrategy(strategies.create('sliding-window', { windowSize: 3 }))
        .addItems(
          Array.from({ length: 10 }, (_, i) =>
            createConversationTurn(
              { 
                role: i % 2 === 0 ? 'user' : 'assistant',
                content: \`Message \${i + 1}\`,
                timestamp: Date.now() - (9 - i) * 60000,
              },
              tokenizer,
            ),
          ),
        )
        .build();

      const result = planner.pack();
      
      // Should prioritize recent messages
      expect(result.included.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle tokenizer errors gracefully', () => {
      const badTokenizer = {
        model: 'bad',
        count: () => { throw new Error('Tokenization failed'); },
        countMessage: () => 0,
        estimate: () => 0,
      };

      expect(() => {
        const planner = new ContextPlannerBuilder()
          .withBudget(1000)
          .withTokenizer(badTokenizer as any)
          .withStrategy(strategies.create('priority-greedy'))
          .addItem(createSystemPrompt({ content: 'Test' }, badTokenizer as any))
          .build();
      }).toThrow();
    });
  });

  describe('performance', () => {
    it('should pack 100 items in under 10ms', () => {
      const tokenizer = createMockTokenizer();
      const planner = new ContextPlannerBuilder()
        .withBudget(1000000)
        .withTokenizer(tokenizer)
        .withStrategy(strategies.create('priority-greedy'))
        .addItems(
          Array.from({ length: 100 }, (_, i) =>
            createRAGChunk(
              {
                content: \`Chunk \${i + 1} with some content\`,
                relevanceScore: Math.random(),
              },
              tokenizer,
            ),
          ),
        )
        .build();

      const start = performance.now();
      planner.pack();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });
  });
});
`,
  };
}

/**
 * Generate all test files
 */
export function generateTestFiles() {
  const files = {};

  const priorityTests = createPriorityTests();
  const plannerTests = createContextPlannerTests();
  const propertyTests = createPropertyBasedTests();
  const integrationTests = createIntegrationTests();

  files[priorityTests.name] = priorityTests.content;
  files[plannerTests.name] = plannerTests.content;
  files[propertyTests.name] = propertyTests.content;
  files[integrationTests.name] = integrationTests.content;

  return files;
}

export default skill;
