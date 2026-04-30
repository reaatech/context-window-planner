/**
 * Agent Skill: Packing Strategies
 *
 * This skill defines patterns and procedures for implementing packing strategies
 * in the @reaatech/context-window-planner project.
 */

export const skill = {
  name: 'strategy',
  description: 'Creating packing strategies',
  version: '1.0.0',
};

/**
 * Template for a new packing strategy
 */
export function createStrategy(name, description, algorithm, options = {}) {
  const { configProperties = [], additionalMethods = [] } = options;

  const fileName = `packages/core/src/strategies/${name}.ts`;

  return {
    type: 'file',
    name: fileName,
    content: `/**
 * ${description}
 * 
 * ${algorithm}
 * 
 * @module
 */

import type {
  PackingStrategy,
  PackingContext,
  PackingResult,
  ContextItem,
  PackWarning,
} from '../types/index.js';
import { Priority } from '../types/priority.js';

/**
 * Configuration options for the ${name} strategy
 */
export interface ${capitalize(name)}StrategyOptions {
  ${configProperties
    .map(
      (p) => `/** ${p.description} */
  ${p.name}${p.optional ? '?' : ''}: ${p.type};`,
    )
    .join('\n  ')}
}

/**
 * ${description}
 * 
 * ${algorithm}
 */
export class ${capitalize(name)}Strategy implements PackingStrategy {
  readonly name = '${name}';
  ${configProperties
    .map(
      (p) => `
  /** ${p.description} */
  private readonly _${p.name}: ${p.type};`,
    )
    .join('')}

  constructor(options: ${capitalize(name)}StrategyOptions = {}) {
    ${configProperties
      .map((p) => {
        if (p.default !== undefined) {
          return `this._${p.name} = options.${p.name} ?? ${p.default};`;
        }
        if (p.required) {
          return `if (options.${p.name} === undefined) {
        throw new Error('${p.name} is required for ${name} strategy');
      }
      this._${p.name} = options.${p.name} as ${p.type};`;
        }
        return `this._${p.name} = options.${p.name} as ${p.type};`;
      })
      .join('\n    ')}
  }

  /**
   * Execute the packing algorithm.
   * 
   * @param context - The packing context containing budget, items, and tokenizer
   * @returns The packing result with included, summarized, and dropped items
   */
  execute(context: PackingContext): PackingResult {
    const result: PackingResult = {
      included: [],
      summarize: [],
      dropped: [],
      usedTokens: 0,
      remainingTokens: context.budget.available,
      warnings: [],
    };

    // Sort items by priority (highest first)
    const sortedItems = this.sortItems(context.items);

    for (const item of sortedItems) {
      if (item.tokenCount <= result.remainingTokens) {
        // Item fits within remaining budget
        result.included.push(item);
        result.usedTokens += item.tokenCount;
        result.remainingTokens -= item.tokenCount;
      } else if (item.canSummarize?.()) {
        // Item can be summarized to fit
        result.summarize.push(item);
        this.addWarning(result, 'ITEM_SUMMARIZED', \`Item "\${item.id}" will be summarized to fit within budget\`, item);
      } else {
        // Item must be dropped
        result.dropped.push(item);
        this.addWarning(result, 'ITEM_DROPPED', \`Item "\${item.id}" dropped due to budget constraints\`, item);
      }
    }

    // Add warnings for low remaining tokens
    if (result.remainingTokens < context.budget.available * 0.1) {
      this.addWarning(result, 'LOW_REMAINING', 
        \`Only \${result.remainingTokens} tokens remaining (\${Math.round(result.remainingTokens / context.budget.available * 100)}% of budget)\`);
    }

    return result;
  }

  /**
   * Sort items by priority and strategy-specific criteria.
   * Override in subclasses for custom sorting.
   */
  protected sortItems(items: ContextItem[]): ContextItem[] {
    return [...items].sort((a, b) => {
      // Higher priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Same priority: maintain original order (FIFO)
      return 0;
    });
  }

  /**
   * Add a warning to the result.
   */
  protected addWarning(
    result: PackingResult,
    code: string,
    message: string,
    item?: ContextItem,
    suggestion?: string,
  ): void {
    result.warnings.push({
      code,
      message,
      item,
      suggestion,
    } satisfies PackWarning);
  }
}

/**
 * Factory function to create a ${name} strategy.
 * 
 * @param options - Strategy configuration options
 * @returns A new ${capitalize(name)}Strategy instance
 */
export function create${capitalize(name)}Strategy(
  options: ${capitalize(name)}StrategyOptions = {},
): ${capitalize(name)}Strategy {
  return new ${capitalize(name)}Strategy(options);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
`,
  };
}

/**
 * Create the base strategy interface file
 */
export function createStrategyInterface() {
  return {
    type: 'file',
    name: 'packages/core/src/strategies/base.ts',
    content: `/**
 * Packing Strategy Interfaces
 * 
 * Defines the contracts for packing strategy implementations.
 * 
 * @module
 */

import type {
  TokenBudget,
  ContextItem,
  PackingResult,
  PackWarning,
} from '../types/index.js';

/**
 * Strategy-specific options
 */
export interface StrategyOptions {
  [key: string]: unknown;
}

/**
 * Context provided to strategies during execution.
 */
export interface PackingContext {
  /** The token budget to respect */
  budget: TokenBudget;
  /** All candidate items for inclusion */
  items: ContextItem[];
  /** Tokenizer for counting tokens */
  tokenizer: { count(text: string): number };
  /** Strategy-specific options */
  options: StrategyOptions;
}

/**
 * Interface for packing strategies.
 * 
 * Strategies determine which items to include, summarize, or drop
 * based on the available token budget.
 */
export interface PackingStrategy {
  /** Unique name for this strategy */
  readonly name: string;

  /**
   * Execute the packing algorithm.
   * 
   * @param context - The packing context
   * @returns The packing result
   */
  execute(context: PackingContext): PackingResult;
}

/**
 * Interface for strategy factories.
 */
export interface StrategyFactory {
  /**
   * Create a strategy by name.
   * 
   * @param name - The strategy name
   * @param options - Strategy options
   * @returns A strategy instance
   */
  create(name: string, options?: StrategyOptions): PackingStrategy;
}
`,
  };
}

/**
 * Create the Priority Greedy strategy
 */
export function createPriorityGreedyStrategy() {
  return createStrategy(
    'priority-greedy',
    'Priority-based greedy packing strategy',
    'Fills the context window by priority, highest first. Within the same priority level, uses first-come-first-served ordering.',
    {
      configProperties: [
        {
          name: 'safetyMargin',
          type: 'number',
          description: 'Safety margin as a fraction of budget',
          default: '0.05',
          optional: true,
        },
      ],
    },
  );
}

/**
 * Create the Sliding Window strategy
 */
export function createSlidingWindowStrategy() {
  return createStrategy(
    'sliding-window',
    'Sliding window strategy for conversation history',
    'Keeps the most recent N conversation turns, then fills remaining space with other items by priority. Older turns are candidates for summarization or dropping.',
    {
      configProperties: [
        {
          name: 'windowSize',
          type: 'number',
          description: 'Number of recent turns to keep',
          required: true,
        },
        {
          name: 'prioritizeRecent',
          type: 'boolean',
          description: 'Whether to prioritize recent turns',
          default: 'true',
          optional: true,
        },
      ],
    },
  );
}

/**
 * Create the Summarize and Replace strategy
 */
export function createSummarizeReplaceStrategy() {
  return createStrategy(
    'summarize-replace',
    'Summarize and replace strategy for older items',
    'Actively summarizes older items to fit more content. Uses a compression ratio to estimate summarized token counts.',
    {
      configProperties: [
        {
          name: 'compressionRatio',
          type: 'number',
          description: 'Expected compression ratio (0-1)',
          default: '0.3',
          optional: true,
        },
        {
          name: 'maxSummaries',
          type: 'number',
          description: 'Maximum number of items to summarize',
          default: '10',
          optional: true,
        },
      ],
    },
  );
}

/**
 * Create the RAG Selection strategy
 */
export function createRAGSelectionStrategy() {
  return createStrategy(
    'rag-selection',
    'Relevance-scored RAG chunk selection strategy',
    'Selects RAG chunks by relevance score, keeping highest-scoring chunks that fit within the allocated RAG budget.',
    {
      configProperties: [
        {
          name: 'ragBudgetRatio',
          type: 'number',
          description: 'Fraction of budget for RAG chunks',
          default: '0.3',
          optional: true,
        },
        {
          name: 'minRelevanceScore',
          type: 'number',
          description: 'Minimum relevance score threshold',
          default: '0.5',
          optional: true,
        },
        {
          name: 'maxChunks',
          type: 'number',
          description: 'Maximum number of RAG chunks',
          default: '20',
          optional: true,
        },
      ],
    },
  );
}

/**
 * Create the strategy factory
 */
export function createStrategyFactory() {
  return {
    type: 'file',
    name: 'packages/core/src/strategies/factory.ts',
    content: `/**
 * Strategy Factory
 * 
 * Provides a centralized factory for creating packing strategies.
 * 
 * @module
 */

import type { PackingStrategy, StrategyFactory, StrategyOptions } from './base.js';
import { PriorityGreedyStrategy, createPriorityGreedyStrategy } from './priority-greedy.js';
import { SlidingWindowStrategy, createSlidingWindowStrategy } from './sliding-window.js';
import { SummarizeAndReplaceStrategy, createSummarizeAndReplaceStrategy } from './summarize-replace.js';
import { RelevanceScoredRAGStrategy, createRelevanceScoredRAGStrategy } from './rag-selection.js';

/**
 * Default strategy factory implementation.
 */
export class DefaultStrategyFactory implements StrategyFactory {
  /**
   * Create a strategy by name.
   * 
   * @param name - The strategy name
   * @param options - Strategy options
   * @returns A strategy instance
   * @throws Error if the strategy is not found
   */
  create(name: string, options: StrategyOptions = {}): PackingStrategy {
    switch (name) {
      case 'priority-greedy':
        return createPriorityGreedyStrategy(options);
      case 'sliding-window':
        return createSlidingWindowStrategy(options);
      case 'summarize-replace':
        return createSummarizeAndReplaceStrategy(options);
      case 'rag-selection':
        return createRelevanceScoredRAGStrategy(options);
      default:
        throw new Error(\`Unknown strategy: \${name}\`);
    }
  }
}

/**
 * Default strategy factory instance.
 */
export const strategies: StrategyFactory = new DefaultStrategyFactory();

/**
 * Convenience function to create a strategy.
 */
export function createStrategy(name: string, options?: StrategyOptions): PackingStrategy {
  return strategies.create(name, options);
}

// Re-export individual strategy creators
export {
  createPriorityGreedyStrategy,
  createSlidingWindowStrategy,
  createSummarizeAndReplaceStrategy,
  createRelevanceScoredRAGStrategy,
};
`,
  };
}

/**
 * Create the strategies index file
 */
export function createStrategiesIndex() {
  return {
    type: 'file',
    name: 'packages/core/src/strategies/index.ts',
    content: `/**
 * Packing Strategies
 * 
 * Provides various strategies for packing context items within token budgets.
 * 
 * @module
 */

// Interfaces
export * from './base.js';

// Strategy implementations
export * from './priority-greedy.js';
export * from './sliding-window.js';
export * from './summarize-replace.js';
export * from './rag-selection.js';

// Factory
export { strategies, createStrategy } from './factory.js';
`,
  };
}

/**
 * Generate all strategy files
 */
export function generateStrategyFiles() {
  const files = {};

  // Base interface
  const base = createStrategyInterface();
  files[base.name] = base.content;

  // Individual strategies
  const priorityGreedy = createPriorityGreedyStrategy();
  const slidingWindow = createSlidingWindowStrategy();
  const summarizeReplace = createSummarizeReplaceStrategy();
  const ragSelection = createRAGSelectionStrategy();

  files[priorityGreedy.name] = priorityGreedy.content;
  files[slidingWindow.name] = slidingWindow.content;
  files[summarizeReplace.name] = summarizeReplace.content;
  files[ragSelection.name] = ragSelection.content;

  // Factory and index
  const factory = createStrategyFactory();
  const index = createStrategiesIndex();

  files[factory.name] = factory.content;
  files[index.name] = index.content;

  return files;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default skill;
