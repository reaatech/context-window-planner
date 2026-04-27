/**
 * Mock Tokenizer Adapter
 *
 * A simple word-based tokenizer for testing purposes.
 *
 * @module
 */

import type { Message, TokenPattern, TokenizerAdapter } from './adapter.js';

/**
 * Mock tokenizer adapter that uses simple word-based estimation.
 * Useful for testing without external dependencies.
 */
export class MockTokenizerAdapter implements TokenizerAdapter {
  readonly model: string;

  constructor(model: string = 'mock') {
    this.model = model;
  }

  count(text: string): number {
    if (text.length === 0) {
      return 0;
    }
    const words = text.split(/\s+/).filter(Boolean).length;
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
        return Math.ceil(pattern.estimatedLength * 1.1);
      default:
        return 0;
    }
  }
}

/**
 * Factory function to create a mock tokenizer.
 *
 * @param model - Optional model name
 * @returns A new MockTokenizerAdapter instance
 */
export function createMockTokenizer(model?: string): MockTokenizerAdapter {
  return new MockTokenizerAdapter(model);
}
