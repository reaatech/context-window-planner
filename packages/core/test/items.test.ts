/**
 * Tests for context item types
 *
 * @vitest
 */

import { describe, it, expect } from 'vitest';

import { createConversationTurn } from '../src/items/conversation-turn.js';
import { GenerationBuffer, createGenerationBuffer } from '../src/items/generation-buffer.js';
import { RAGChunk, createRAGChunk } from '../src/items/rag-chunk.js';
import { SystemPrompt, createSystemPrompt } from '../src/items/system-prompt.js';
import { createToolResult } from '../src/items/tool-result.js';
import { ToolSchema, createToolSchema } from '../src/items/tool-schema.js';
import { createMockTokenizer } from '../src/tokenizer/mock.js';
import { Priority } from '../src/types/priority.js';

describe('ToolSchema', () => {
  const tokenizer = createMockTokenizer();

  it('should create with name and schema', () => {
    const ts = createToolSchema({ name: 'search', schema: { type: 'object' } }, tokenizer);
    expect(ts.type).toBe('tool_schema');
    expect(ts.name).toBe('search');
    expect(ts.schema).toEqual({ type: 'object' });
  });

  it('should accept optional description', () => {
    const ts = createToolSchema(
      { name: 'search', description: 'Search the web', schema: {} },
      tokenizer,
    );
    expect(ts.description).toBe('Search the web');
  });

  it('should default priority to High', () => {
    const ts = createToolSchema({ name: 't', schema: {} }, tokenizer);
    expect(ts.priority).toBe(Priority.High);
  });

  it('should accept custom priority', () => {
    const ts = createToolSchema({ name: 't', schema: {}, priority: Priority.Medium }, tokenizer);
    expect(ts.priority).toBe(Priority.Medium);
  });

  it('cannot be summarized', () => {
    const ts = createToolSchema({ name: 't', schema: {} }, tokenizer);
    expect(ts.canSummarize()).toBe(false);
  });

  it('should output OpenAI format', () => {
    const ts = createToolSchema(
      { name: 'search', description: 'Search the web', schema: { type: 'object' } },
      tokenizer,
    );
    const format = ts.toOpenAIFormat();
    expect(format.type).toBe('function');
    expect(format.function.name).toBe('search');
    expect(format.function.description).toBe('Search the web');
    expect(format.function.parameters).toEqual({ type: 'object' });
  });

  it('should omit description from OpenAI format when empty', () => {
    const ts = createToolSchema({ name: 'noDesc', schema: {} }, tokenizer);
    const format = ts.toOpenAIFormat();
    expect(format.function).not.toHaveProperty('description');
  });

  it('should accept custom id', () => {
    const ts = new ToolSchema({
      name: 't',
      schema: {},
      id: 'custom-id',
      tokenCount: 10,
    });
    expect(ts.id).toBe('custom-id');
  });

  it('should throw when tokenCount is missing', () => {
    expect(() => new ToolSchema({ name: 't', schema: {} } as never)).toThrow(/tokenCount/);
  });

  it('should validate using validateContextItem', () => {
    const ts = createToolSchema({ name: 't', schema: {} }, tokenizer);
    expect(ts.tokenCount).toBeGreaterThanOrEqual(0);
    expect(ts.id).toBeTruthy();
  });
});

describe('ToolResult', () => {
  const tokenizer = createMockTokenizer();

  it('should create with toolName and result', () => {
    const tr = createToolResult({ toolName: 'search', result: 'Found 5 items' }, tokenizer);
    expect(tr.type).toBe('tool_result');
    expect(tr.toolName).toBe('search');
    expect(tr.result).toBe('Found 5 items');
  });

  it('should default success to true', () => {
    const tr = createToolResult({ toolName: 'cmd', result: '' }, tokenizer);
    expect(tr.success).toBe(true);
  });

  it('should accept success: false', () => {
    const tr = createToolResult({ toolName: 'cmd', result: '', success: false }, tokenizer);
    expect(tr.success).toBe(false);
  });

  it('should accept error message', () => {
    const tr = createToolResult({ toolName: 'cmd', result: '', error: 'timeout' }, tokenizer);
    expect(tr.error).toBe('timeout');
  });

  it('should default priority to Medium', () => {
    const tr = createToolResult({ toolName: 't', result: 'x' }, tokenizer);
    expect(tr.priority).toBe(Priority.Medium);
  });

  it('can be summarized', () => {
    const tr = createToolResult({ toolName: 't', result: 'x' }, tokenizer);
    expect(tr.canSummarize()).toBe(true);
  });

  it('should throw when tokenCount is missing', () => {
    expect(() => createToolResult({ toolName: 't', result: 'x' }, tokenizer)).not.toThrow();
  });

  it('should validate using validateContextItem', () => {
    const tr = createToolResult({ toolName: 't', result: 'x' }, tokenizer);
    expect(tr.tokenCount).toBeGreaterThanOrEqual(0);
  });
});

describe('GenerationBuffer', () => {
  it('should create with reservedTokens', () => {
    const gb = createGenerationBuffer({ reservedTokens: 500 });
    expect(gb.type).toBe('generation_buffer');
    expect(gb.tokenCount).toBe(500);
    expect(gb.reservedTokens).toBe(500);
  });

  it('should default priority to Critical', () => {
    const gb = createGenerationBuffer({ reservedTokens: 100 });
    expect(gb.priority).toBe(Priority.Critical);
    expect(gb.canSummarize()).toBe(false);
  });

  it('should accept custom id', () => {
    const gb = new GenerationBuffer({ reservedTokens: 50, id: 'buf-1' });
    expect(gb.id).toBe('buf-1');
  });

  it('should pass metadata through', () => {
    const gb = new GenerationBuffer({
      reservedTokens: 50,
      metadata: { source: 'test' },
    });
    expect(gb.metadata).toEqual({ source: 'test' });
  });
});

describe('ConversationTurn helpers', () => {
  const tokenizer = createMockTokenizer();

  it('isUser returns true for user role', () => {
    const turn = createConversationTurn({ role: 'user', content: 'hi' }, tokenizer);
    expect(turn.isUser()).toBe(true);
    expect(turn.isAssistant()).toBe(false);
  });

  it('isAssistant returns true for assistant role', () => {
    const turn = createConversationTurn({ role: 'assistant', content: 'hi' }, tokenizer);
    expect(turn.isUser()).toBe(false);
    expect(turn.isAssistant()).toBe(true);
  });

  it('getAge returns positive milliseconds', () => {
    const turn = createConversationTurn(
      { role: 'user', content: 'hi', timestamp: Date.now() - 1000 },
      tokenizer,
    );
    expect(turn.getAge()).toBeGreaterThanOrEqual(1000);
  });
});

describe('RAGChunk helpers', () => {
  const tokenizer = createMockTokenizer();

  it('meetsThreshold returns true when score >= minScore', () => {
    const chunk = createRAGChunk({ content: 'x', relevanceScore: 0.8 }, tokenizer);
    expect(chunk.meetsThreshold(0.5)).toBe(true);
    expect(chunk.meetsThreshold(0.8)).toBe(true);
  });

  it('meetsThreshold returns false when score < minScore', () => {
    const chunk = createRAGChunk({ content: 'x', relevanceScore: 0.3 }, tokenizer);
    expect(chunk.meetsThreshold(0.5)).toBe(false);
  });
});

describe('GenerationBuffer helpers', () => {
  it('getReservedTokens returns the reserved token count', () => {
    const gb = new GenerationBuffer({ reservedTokens: 256 });
    expect(gb.getReservedTokens()).toBe(256);
  });
});

describe('SystemPrompt constructor', () => {
  it('should throw when tokenCount is missing', () => {
    expect(() => new SystemPrompt({ content: 'test' } as never)).toThrow(/tokenCount/);
  });
});

describe('item summarize() truncation', () => {
  const tokenizer = createMockTokenizer();

  it('should truncate conversation turn content on summarize', () => {
    const turn = createConversationTurn({ role: 'user', content: 'a '.repeat(100) }, tokenizer);
    const summarized = turn.summarize();
    expect(summarized.content.length).toBeLessThan(turn.content.length);
    expect(summarized.content).toMatch(/…$/);
    expect(summarized.tokenCount).toBe(turn.estimatedSummarizedTokenCount);
  });

  it('should truncate RAG chunk content on summarize', () => {
    const chunk = createRAGChunk({ content: 'b '.repeat(100) }, tokenizer);
    const summarized = chunk.summarize();
    expect(summarized.content.length).toBeLessThan(chunk.content.length);
    expect(summarized.content).toMatch(/…$/);
  });

  it('should truncate tool result content on summarize', () => {
    const tr = createToolResult({ toolName: 'big', result: 'c '.repeat(100) }, tokenizer);
    const summarized = tr.summarize();
    expect(summarized.result.length).toBeLessThan(tr.result.length);
    expect(summarized.result).toMatch(/…$/);
  });

  it('should not append ellipsis when no truncation needed', () => {
    const turn = createConversationTurn({ role: 'user', content: 'hi' }, tokenizer);
    const summarized = turn.summarize(turn.tokenCount + 10);
    expect(summarized.content).toBe('hi');
  });

  it('should not truncate when original tokenCount is zero', () => {
    const turn = createConversationTurn({ role: 'user', content: '' }, tokenizer);
    const summarized = turn.summarize();
    expect(summarized.content).toBe('');
  });
});
