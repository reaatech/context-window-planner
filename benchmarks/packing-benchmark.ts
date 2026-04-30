/**
 * Performance benchmarks for @reaatech/context-window-planner.
 *
 * Run with: pnpm vitest bench --config vitest.config.ts
 *
 * @module
 */

import {
  ContextPlanner,
  ConversationTurn,
  GenerationBuffer,
  Priority,
  RAGChunk,
  SystemPrompt,
  strategies,
  tokenizers,
} from '@reaatech/context-window-planner';
import { bench, describe } from 'vitest';

function createFakeTokenizer() {
  return tokenizers.create('mock');
}

function createSystemPromptItem() {
  return new SystemPrompt({
    id: 'system-prompt',
    content: 'You are a helpful assistant. Be concise and accurate.',
    tokenCount: 50,
  });
}

function createConversationTurn(i: number) {
  return new ConversationTurn({
    id: `turn-${i}`,
    role: i % 2 === 0 ? 'user' : 'assistant',
    content: `This is conversation turn number ${i} with enough content to consume some token budget for realistic benchmarking purposes.`,
    tokenCount: Math.floor(Math.random() * 200) + 100,
    timestamp: Date.now() - (1000 - i) * 60000,
    priority: Priority.High,
  });
}

function createRAGChunk(i: number) {
  return new RAGChunk({
    id: `rag-${i}`,
    content: `Relevant document chunk ${i}. This contains retrieved information that might be useful for answering the user's question.`,
    tokenCount: Math.floor(Math.random() * 300) + 100,
    relevanceScore: Math.random(),
    source: 'benchmark-doc',
    chunkIndex: i,
    priority: Priority.Medium,
  });
}

describe('Packing Benchmarks', () => {
  const tokenizer = createFakeTokenizer();

  bench('100 items - priority-greedy', () => {
    const planner = new ContextPlanner({
      budget: 128000,
      tokenizer,
      strategy: strategies.create('priority-greedy'),
    });
    planner.add(createSystemPromptItem());
    planner.add(new GenerationBuffer({ reservedTokens: 4096 }));
    for (let i = 0; i < 50; i++) {
      planner.add(createConversationTurn(i));
    }
    for (let i = 0; i < 48; i++) {
      planner.add(createRAGChunk(i));
    }
    planner.pack();
  });

  bench('500 items - priority-greedy', () => {
    const planner = new ContextPlanner({
      budget: 256000,
      tokenizer,
      strategy: strategies.create('priority-greedy'),
    });
    planner.add(createSystemPromptItem());
    planner.add(new GenerationBuffer({ reservedTokens: 8192 }));
    for (let i = 0; i < 300; i++) {
      planner.add(createConversationTurn(i));
    }
    for (let i = 0; i < 198; i++) {
      planner.add(createRAGChunk(i));
    }
    planner.pack();
  });

  bench('1000 items - priority-greedy', () => {
    const planner = new ContextPlanner({
      budget: 512000,
      tokenizer,
      strategy: strategies.create('priority-greedy'),
    });
    planner.add(createSystemPromptItem());
    planner.add(new GenerationBuffer({ reservedTokens: 16384 }));
    for (let i = 0; i < 600; i++) {
      planner.add(createConversationTurn(i));
    }
    for (let i = 0; i < 398; i++) {
      planner.add(createRAGChunk(i));
    }
    planner.pack();
  });

  bench('100 items - sliding-window', () => {
    const planner = new ContextPlanner({
      budget: 128000,
      tokenizer,
      strategy: strategies.create('sliding-window', { windowSize: 20 }),
    });
    planner.add(createSystemPromptItem());
    planner.add(new GenerationBuffer({ reservedTokens: 4096 }));
    for (let i = 0; i < 50; i++) {
      planner.add(createConversationTurn(i));
    }
    for (let i = 0; i < 48; i++) {
      planner.add(createRAGChunk(i));
    }
    planner.pack();
  });

  bench('100 items - summarize-replace', () => {
    const planner = new ContextPlanner({
      budget: 128000,
      tokenizer,
      strategy: strategies.create('summarize-replace', { compressionRatio: 0.3 }),
    });
    planner.add(createSystemPromptItem());
    planner.add(new GenerationBuffer({ reservedTokens: 4096 }));
    for (let i = 0; i < 50; i++) {
      planner.add(createConversationTurn(i));
    }
    for (let i = 0; i < 48; i++) {
      planner.add(createRAGChunk(i));
    }
    planner.pack();
  });

  bench('100 items - rag-selection', () => {
    const planner = new ContextPlanner({
      budget: 128000,
      tokenizer,
      strategy: strategies.create('rag-selection', { ragBudgetRatio: 0.3 }),
    });
    planner.add(createSystemPromptItem());
    planner.add(new GenerationBuffer({ reservedTokens: 4096 }));
    for (let i = 0; i < 50; i++) {
      planner.add(createConversationTurn(i));
    }
    for (let i = 0; i < 48; i++) {
      planner.add(createRAGChunk(i));
    }
    planner.pack();
  });
});
