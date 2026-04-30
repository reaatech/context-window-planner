/**
 * Tests for tokenizer adapters
 *
 * @vitest
 */

import { describe, expect, it } from 'vitest';

import { AnthropicTokenizerAdapter, createAnthropicTokenizer } from '../src/tokenizer/anthropic.js';
import { createTokenizer, tokenizers } from '../src/tokenizer/factory.js';
import { MockTokenizerAdapter, createMockTokenizer } from '../src/tokenizer/mock.js';
import { TiktokenTokenizerAdapter, createTiktokenTokenizer } from '../src/tokenizer/tiktoken.js';

describe('MockTokenizerAdapter', () => {
  it('should count tokens for text', () => {
    const tokenizer = createMockTokenizer();
    expect(tokenizer.count('hello world')).toBeGreaterThan(0);
  });

  it('should return 0 for empty string', () => {
    const tokenizer = createMockTokenizer();
    expect(tokenizer.count('')).toBe(0);
  });

  it('should count message tokens', () => {
    const tokenizer = createMockTokenizer();
    const count = tokenizer.countMessage({ role: 'user', content: 'hello' });
    expect(count).toBeGreaterThan(0);
  });

  it('should estimate text pattern', () => {
    const tokenizer = createMockTokenizer();
    const count = tokenizer.estimate({ type: 'text', text: 'hello' });
    expect(count).toBeGreaterThan(0);
  });

  it('should estimate message pattern', () => {
    const tokenizer = createMockTokenizer();
    const count = tokenizer.estimate({ type: 'message', message: { role: 'user', content: 'hi' } });
    expect(count).toBeGreaterThan(0);
  });

  it('should estimate estimated_length pattern', () => {
    const tokenizer = createMockTokenizer();
    const count = tokenizer.estimate({ type: 'estimated_length', estimatedLength: 100 });
    expect(count).toBeGreaterThan(0);
  });

  it('should return 0 for unknown estimate type', () => {
    const tokenizer = createMockTokenizer();
    const count = tokenizer.estimate({ type: 'unknown' as never });
    expect(count).toBe(0);
  });

  it('should accept custom model name', () => {
    const tokenizer = createMockTokenizer('custom-model');
    expect(tokenizer.model).toBe('custom-model');
  });
});

describe('TokenizerFactory', () => {
  it('should create mock tokenizer', () => {
    const tokenizer = createTokenizer('mock');
    expect(tokenizer).toBeInstanceOf(MockTokenizerAdapter);
  });

  it('should create tiktoken tokenizer for gpt models', () => {
    const tokenizer = createTokenizer('gpt-4');
    expect(tokenizer.model).toBe('gpt-4');
  });

  it('should create anthropic tokenizer for claude models', () => {
    const tokenizer = createTokenizer('claude-3-opus');
    expect(tokenizer.model).toBe('claude-3-opus');
  });

  it('should throw for unsupported models', () => {
    expect(() => createTokenizer('unknown-model')).toThrow();
  });

  it('should cache tokenizer instances', () => {
    const t1 = createTokenizer('mock');
    const t2 = createTokenizer('mock');
    expect(t1).toBe(t2);
  });

  it('should clear adapter cache', () => {
    (tokenizers as { clearCache(): void }).clearCache();
    const t1 = createTokenizer('mock');
    const t2 = createTokenizer('mock');
    expect(t1).toBe(t2);
    (tokenizers as { clearCache(): void }).clearCache();
    const t3 = createTokenizer('mock');
    expect(t3).not.toBe(t1);
  });

  it('should cache tiktoken instances', () => {
    const t1 = createTokenizer('gpt-4');
    const t2 = createTokenizer('gpt-4');
    expect(t1).toBe(t2);
    expect(t1).toBeInstanceOf(TiktokenTokenizerAdapter);
  });
});

describe('TiktokenTokenizerAdapter directly', () => {
  it('should create via factory function', () => {
    const tokenizer = createTiktokenTokenizer({ model: 'gpt-4' });
    expect(tokenizer.model).toBe('gpt-4');
  });

  it('should count text', () => {
    const tokenizer = createTiktokenTokenizer();
    const count = tokenizer.count('hello');
    expect(count).toBeGreaterThan(0);
  });

  it('should cache repeated counts', () => {
    const tokenizer = createTiktokenTokenizer();
    const c1 = tokenizer.count('test string');
    const c2 = tokenizer.count('test string');
    expect(c1).toBe(c2);
  });

  it('should get cache stats', () => {
    const tokenizer = createTiktokenTokenizer();
    tokenizer.count('cached text');
    const stats = tokenizer.getCacheStats();
    expect(stats.size).toBeGreaterThanOrEqual(1);
    expect(stats.limit).toBe(10000);
  });

  it('should clear cache', () => {
    const tokenizer = createTiktokenTokenizer();
    tokenizer.count('some text');
    tokenizer.clearCache();
    expect(tokenizer.getCacheStats().size).toBe(0);
  });
});

describe('AnthropicTokenizerAdapter directly', () => {
  it('should create via factory function', () => {
    const tokenizer = createAnthropicTokenizer({ model: 'claude-3-opus' });
    expect(tokenizer.model).toBe('claude-3-opus');
  });

  it('should count text approximately', () => {
    const tokenizer = createAnthropicTokenizer();
    const count = tokenizer.count('hello world');
    expect(count).toBeGreaterThan(0);
  });

  it('should cache repeated counts', () => {
    const tokenizer = createAnthropicTokenizer();
    const c1 = tokenizer.count('another test');
    const c2 = tokenizer.count('another test');
    expect(c1).toBe(c2);
  });

  it('should get cache stats and clear cache', () => {
    const tokenizer = createAnthropicTokenizer();
    tokenizer.count('cached');
    const stats = tokenizer.getCacheStats();
    expect(stats.size).toBeGreaterThanOrEqual(1);
    tokenizer.clearCache();
    expect(tokenizer.getCacheStats().size).toBe(0);
  });

  it('should handle empty string', () => {
    const tokenizer = createAnthropicTokenizer();
    expect(tokenizer.count('')).toBe(0);
  });
});
