/**
 * Agent Skill: Tokenizer Adapters
 *
 * This skill defines patterns and procedures for implementing tokenizer adapters
 * in the @reaatech/context-window-planner project.
 */

export const skill = {
  name: 'tokenizer',
  description: 'Implementing tokenizer adapters',
  version: '1.0.0',
};

/**
 * Template for a new tokenizer adapter
 */
export function createTokenizerAdapter(name, model, options = {}) {
  const { description = '', dependencies = [], baseEstimate = 'charCount / 4' } = options;

  const fileName = `packages/core/src/tokenizer/${name}.ts`;

  return {
    type: 'file',
    name: fileName,
    content: `/**
 * ${description || name} Tokenizer Adapter
 * 
 * Provides token counting for ${model} models.
 * 
 * @module
 */

import type { TokenizerAdapter, Message, TokenPattern } from './adapter.js';

/**
 * Configuration options for the ${name} tokenizer
 */
export interface ${capitalize(name)}TokenizerOptions {
  /** Model identifier to use for tokenization */
  model?: string;
  /** Custom cache size limit */
  cacheLimit?: number;
}

/**
 * ${description || name} tokenizer adapter for ${model} models.
 * 
 * Uses ${dependencies.length > 0 ? dependencies.join(', ') : 'character-based estimation'} for token counting.
 */
export class ${capitalize(name)}TokenizerAdapter implements TokenizerAdapter {
  readonly model: string;
  #cache: Map<string, number>;
  #cacheLimit: number;

  constructor(options: ${capitalize(name)}TokenizerOptions = {}) {
    this.model = options.model ?? '${model}';
    this.#cache = new Map();
    this.#cacheLimit = options.cacheLimit ?? 10000;
  }

  /**
   * Count tokens in a text string.
   * 
   * @param text - The text to count tokens for
   * @returns The number of tokens
   */
  count(text: string): number {
    // Check cache first
    const cached = this.#cache.get(text);
    if (cached !== undefined) {
      return cached;
    }

    // Calculate token count
    const tokenCount = this.countTokens(text);

    // Cache the result
    if (this.#cache.size >= this.#cacheLimit) {
      // Simple LRU: clear oldest entry
      const firstKey = this.#cache.keys().next().value;
      if (firstKey) {
        this.#cache.delete(firstKey);
      }
    }
    this.#cache.set(text, tokenCount);

    return tokenCount;
  }

  /**
   * Count tokens for a message structure.
   * 
   * @param message - The message to count tokens for
   * @returns The number of tokens
   */
  countMessage(message: Message): number {
    const roleTokens = this.count(message.role);
    const contentTokens = this.count(message.content);
    // Add overhead for message structure (typically 3-4 tokens per message)
    const overhead = 4;
    return roleTokens + contentTokens + overhead;
  }

  /**
   * Estimate tokens for known patterns.
   * 
   * @param pattern - The token pattern to estimate
   * @returns Estimated token count
   */
  estimate(pattern: TokenPattern): number {
    switch (pattern.type) {
      case 'text':
        return this.count(pattern.text);
      case 'message':
        return this.countMessage(pattern.message);
      case 'estimated_length':
        // Use the provided estimate with a safety factor
        return Math.ceil(pattern.estimatedLength * 1.1);
      default:
        return 0;
    }
  }

  /**
   * Clear the token cache.
   */
  clearCache(): void {
    this.#cache.clear();
  }

  /**
   * Get cache statistics.
   */
  getCacheStats(): { size: number; limit: number } {
    return {
      size: this.#cache.size,
      limit: this.#cacheLimit,
    };
  }

  /**
   * Internal token counting implementation.
   * Override this method in subclasses for specific tokenization logic.
   */
  protected countTokens(text: string): number {
    if (text.length === 0) {
      return 0;
    }

    // Default: character-based estimation
    // Override in subclasses for actual tokenizer implementations
    return Math.ceil(text.length / 4);
  }
}

/**
 * Factory function to create a ${name} tokenizer adapter.
 * 
 * @param options - Configuration options
 * @returns A new ${capitalize(name)}TokenizerAdapter instance
 */
export function create${capitalize(name)}Tokenizer(
  options: ${capitalize(name)}TokenizerOptions = {},
): ${capitalize(name)}TokenizerAdapter {
  return new ${capitalize(name)}TokenizerAdapter(options);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
`,
  };
}

/**
 * Create a Tiktoken adapter (OpenAI)
 */
export function createTiktokenAdapter() {
  return createTokenizerAdapter('tiktoken', 'gpt-4, gpt-3.5-turbo', {
    description: 'OpenAI Tiktoken',
    dependencies: ['js-tiktoken'],
  });
}

/**
 * Create an Anthropic tokenizer adapter
 */
export function createAnthropicAdapter() {
  return createTokenizerAdapter('anthropic', 'claude-3-opus, claude-3-sonnet, claude-3-haiku', {
    description: 'Anthropic Claude',
    dependencies: ['@anthropic-ai/sdk'],
  });
}

/**
 * Create a mock tokenizer adapter for testing
 */
export function createMockAdapter() {
  return {
    type: 'file',
    name: 'packages/core/src/tokenizer/mock.ts',
    content: `/**
 * Mock Tokenizer Adapter
 * 
 * A simple character-based tokenizer for testing purposes.
 * 
 * @module
 */

import type { TokenizerAdapter, Message, TokenPattern } from './adapter.js';

/**
 * Mock tokenizer adapter that uses simple character-based estimation.
 * Useful for testing without external dependencies.
 */
export class MockTokenizerAdapter implements TokenizerAdapter {
  readonly model: string;

  constructor(model: string = 'mock') {
    this.model = model;
  }

  count(text: string): number {
    if (text.length === 0) return 0;
    // Simple word-based estimation: ~1.3 tokens per word
    const words = text.split(/\\s+/).filter(Boolean).length;
    return Math.ceil(words * 1.3);
  }

  countMessage(message: Message): number {
    return this.count(message.role) + this.count(message.content) + 4;
  }

  estimate(pattern: TokenPattern): number {
    switch (pattern.type) {
      case 'text':
        return this.count(pattern.text);
      case 'message':
        return this.countMessage(pattern.message);
      case 'estimated_length':
        return Math.ceil(pattern.estimatedLength * 1.3);
      default:
        return 0;
    }
  }
}

export function createMockTokenizer(model?: string): MockTokenizerAdapter {
  return new MockTokenizerAdapter(model);
}
`,
  };
}

/**
 * Create the base tokenizer adapter interface
 */
export function createTokenizerInterface() {
  return {
    type: 'file',
    name: 'packages/core/src/tokenizer/adapter.ts',
    content: `/**
 * Tokenizer Adapter Interface
 * 
 * Defines the contract for tokenizer implementations.
 * 
 * @module
 */

/**
 * A message structure for token counting
 */
export interface Message {
  /** The role of the message sender (e.g., 'user', 'assistant', 'system') */
  readonly role: string;
  /** The content of the message */
  readonly content: string;
}

/**
 * Token pattern types for estimation
 */
export interface TokenPatternText {
  readonly type: 'text';
  readonly text: string;
}

export interface TokenPatternMessage {
  readonly type: 'message';
  readonly message: Message;
}

export interface TokenPatternEstimated {
  readonly type: 'estimated_length';
  readonly estimatedLength: number;
}

export type TokenPattern = TokenPatternText | TokenPatternMessage | TokenPatternEstimated;

/**
 * Interface for tokenizer adapters.
 * 
 * Tokenizer adapters provide token counting functionality for different
 * LLM providers and models.
 */
export interface TokenizerAdapter {
  /** The model identifier for this tokenizer */
  readonly model: string;

  /**
   * Count tokens in a text string.
   * 
   * @param text - The text to count tokens for
   * @returns The number of tokens
   */
  count(text: string): number;

  /**
   * Count tokens for a message structure.
   * 
   * @param message - The message to count tokens for
   * @returns The number of tokens
   */
  countMessage(message: Message): number;

  /**
   * Estimate tokens for known patterns.
   * 
   * @param pattern - The token pattern to estimate
   * @returns Estimated token count
   */
  estimate(pattern: TokenPattern): number;
}

/**
 * Factory interface for creating tokenizer adapters
 */
export interface TokenizerFactory {
  /**
   * Create a tokenizer adapter for a given model.
   * 
   * @param model - The model identifier
   * @returns A tokenizer adapter for the model
   */
  create(model: string): TokenizerAdapter;
}
`,
  };
}

/**
 * Create the tokenizer factory
 */
export function createTokenizerFactory() {
  return {
    type: 'file',
    name: 'packages/core/src/tokenizer/factory.ts',
    content: `/**
 * Tokenizer Factory
 * 
 * Provides a centralized factory for creating tokenizer adapters.
 * 
 * @module
 */

import type { TokenizerAdapter, TokenizerFactory } from './adapter.js';
import { TiktokenTokenizerAdapter } from './tiktoken.js';
import { AnthropicTokenizerAdapter } from './anthropic.js';
import { MockTokenizerAdapter } from './mock.js';

/**
 * Default tokenizer factory implementation.
 */
export class DefaultTokenizerFactory implements TokenizerFactory {
  private cache: Map<string, TokenizerAdapter> = new Map();

  /**
   * Create a tokenizer adapter for a given model.
   * 
   * @param model - The model identifier
   * @returns A tokenizer adapter for the model
   * @throws Error if the model is not supported
   */
  create(model: string): TokenizerAdapter {
    // Check cache first
    const cached = this.cache.get(model);
    if (cached) {
      return cached;
    }

    let adapter: TokenizerAdapter;

    // OpenAI models
    if (model.startsWith('gpt-4') || model.startsWith('gpt-3.5')) {
      adapter = new TiktokenTokenizerAdapter({ model });
    }
    // Anthropic models
    else if (model.startsWith('claude')) {
      adapter = new AnthropicTokenizerAdapter({ model });
    }
    // Mock/testing
    else if (model === 'mock') {
      adapter = new MockTokenizerAdapter(model);
    }
    // Unknown model
    else {
      throw new Error(\`Unsupported model: \${model}. Use 'mock' for testing.\`);
    }

    // Cache the adapter
    this.cache.set(model, adapter);

    return adapter;
  }

  /**
   * Clear the adapter cache.
   */
  clearCache(): void {
    this.cache.clear();
  }
}

/**
 * Default tokenizer factory instance.
 */
export const tokenizers: TokenizerFactory = new DefaultTokenizerFactory();

/**
 * Convenience function to create a tokenizer.
 */
export function createTokenizer(model: string): TokenizerAdapter {
  return tokenizers.create(model);
}
`,
  };
}

/**
 * Create the tokenizer index file
 */
export function createTokenizerIndex() {
  return {
    type: 'file',
    name: 'packages/core/src/tokenizer/index.ts',
    content: `/**
 * Tokenizer Adapters
 * 
 * Provides token counting functionality for various LLM providers.
 * 
 * @module
 */

// Interfaces
export * from './adapter.js';

// Implementations
export * from './tiktoken.js';
export * from './anthropic.js';
export * from './mock.js';

// Factory
export { tokenizers, createTokenizer } from './factory.js';
`,
  };
}

/**
 * Generate all tokenizer files
 */
export function generateTokenizerFiles() {
  const files = {};

  const tiktoken = createTiktokenAdapter();
  const anthropic = createAnthropicAdapter();
  const mock = createMockAdapter();
  const adapter = createTokenizerInterface();
  const factory = createTokenizerFactory();
  const index = createTokenizerIndex();

  files[tiktoken.name] = tiktoken.content;
  files[anthropic.name] = anthropic.content;
  files[mock.name] = mock.content;
  files[adapter.name] = adapter.content;
  files[factory.name] = factory.content;
  files[index.name] = index.content;

  return files;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default skill;
