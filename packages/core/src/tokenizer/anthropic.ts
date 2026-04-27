/**
 * Anthropic Claude Tokenizer Adapter
 *
 * Provides approximate token counting for Anthropic Claude models.
 * Note: Anthropic does not publish an official tokenizer. This adapter
 * uses character-based estimation (~3.5 chars/token) which is suitable
 * for budgeting but not exact token counting.
 *
 * @module
 */

import type { Message, TokenPattern, TokenizerAdapter } from './adapter.js';

/**
 * Configuration options for the Anthropic tokenizer
 */
export interface AnthropicTokenizerOptions {
  /** Model identifier to use for tokenization */
  model?: string;
  /** Custom cache size limit */
  cacheLimit?: number;
}

/**
 * Anthropic Claude tokenizer adapter.
 *
 * Uses approximate character-based estimation (~3.5 chars/token).
 * This is suitable for budgeting but not exact token counting.
 */
export class AnthropicTokenizerAdapter implements TokenizerAdapter {
  readonly model: string;
  #cache: Map<string, number>;
  #cacheLimit: number;

  constructor(options: AnthropicTokenizerOptions = {}) {
    this.model = options.model ?? 'claude-3-opus-20240229';
    this.#cache = new Map();
    this.#cacheLimit = options.cacheLimit ?? 10000;
  }

  /**
   * Count tokens in a text string.
   *
   * Uses approximate ratio of 3.5 characters per token for Claude models.
   *
   * @param text - The text to count tokens for
   * @returns The approximate number of tokens
   */
  count(text: string): number {
    if (text.length === 0) {
      return 0;
    }

    const cached = this.#cache.get(text);
    if (cached !== undefined) {
      return cached;
    }

    const tokenCount = Math.ceil(text.length / 3.5);

    if (this.#cache.size >= this.#cacheLimit) {
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
}

/**
 * Factory function to create an Anthropic tokenizer adapter.
 *
 * @param options - Configuration options
 * @returns A new AnthropicTokenizerAdapter instance
 */
export function createAnthropicTokenizer(
  options: AnthropicTokenizerOptions = {},
): AnthropicTokenizerAdapter {
  return new AnthropicTokenizerAdapter(options);
}
