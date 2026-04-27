/**
 * Tokenizer Factory
 *
 * Provides a centralized factory for creating tokenizer adapters.
 *
 * @module
 */

import { TokenizerError } from '../errors.js';
import type { TokenizerAdapter, TokenizerFactory } from './adapter.js';
import { AnthropicTokenizerAdapter } from './anthropic.js';
import { MockTokenizerAdapter } from './mock.js';
import { TiktokenTokenizerAdapter } from './tiktoken.js';

/**
 * Default tokenizer factory implementation.
 */
export class DefaultTokenizerFactory implements TokenizerFactory {
  private cache = new Map<string, TokenizerAdapter>();

  /**
   * Create a tokenizer adapter for a given model.
   *
   * @param model - The model identifier
   * @returns A tokenizer adapter for the model
   * @throws Error if the model is not supported
   */
  create(model: string): TokenizerAdapter {
    const cached = this.cache.get(model);
    if (cached) {
      return cached;
    }

    let adapter: TokenizerAdapter;

    if (model.startsWith('gpt-4') || model.startsWith('gpt-3.5')) {
      adapter = new TiktokenTokenizerAdapter({ model });
    } else if (model.startsWith('claude')) {
      adapter = new AnthropicTokenizerAdapter({ model });
    } else if (model === 'mock') {
      adapter = new MockTokenizerAdapter(model);
    } else {
      throw new TokenizerError(`Unsupported model: ${model}. Use 'mock' for testing.`, { model });
    }

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
 *
 * @param model - The model identifier
 * @returns A tokenizer adapter for the model
 */
export function createTokenizer(model: string): TokenizerAdapter {
  return tokenizers.create(model);
}
