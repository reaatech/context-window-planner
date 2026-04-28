/**
 * OpenAI Tiktoken Adapter
 *
 * Provides token counting for OpenAI models using js-tiktoken.
 *
 * @module
 */

import { encodingForModel, type TiktokenModel } from 'js-tiktoken';

import type { Message, TokenPattern, TokenizerAdapter } from './adapter.js';
import { TokenCache } from '../utils/token-cache.js';

/**
 * Configuration options for the Tiktoken tokenizer
 */
export interface TiktokenTokenizerOptions {
  /** Model identifier to use for tokenization */
  model?: string;
  /** Custom cache size limit */
  cacheLimit?: number;
}

/**
 * OpenAI tiktoken adapter for GPT models.
 *
 * Uses js-tiktoken for accurate token counting.
 */
export class TiktokenTokenizerAdapter implements TokenizerAdapter {
  readonly model: string;
  #cache: TokenCache;
  #encoder: ReturnType<typeof encodingForModel>;

  constructor(options: TiktokenTokenizerOptions = {}) {
    this.model = options.model ?? 'gpt-4';
    this.#cache = new TokenCache(options.cacheLimit ?? 10000);
    this.#encoder = encodingForModel(this.model as TiktokenModel);
  }

  /**
   * Count tokens in a text string.
   *
   * @param text - The text to count tokens for
   * @returns The number of tokens
   */
  count(text: string): number {
    if (text.length === 0) {
      return 0;
    }

    const cached = this.#cache.get(text);
    if (cached !== undefined) {
      return cached;
    }

    const tokenCount = this.#encoder.encode(text).length;
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
    return this.#cache.getStats();
  }
}

/**
 * Factory function to create a Tiktoken tokenizer adapter.
 *
 * @param options - Configuration options
 * @returns A new TiktokenTokenizerAdapter instance
 */
export function createTiktokenTokenizer(
  options: TiktokenTokenizerOptions = {},
): TiktokenTokenizerAdapter {
  return new TiktokenTokenizerAdapter(options);
}
