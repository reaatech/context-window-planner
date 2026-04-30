/**
 * Relevance-scored RAG chunk selection strategy
 *
 * Selects RAG chunks by relevance score, keeping highest-scoring chunks that fit
 * within the allocated RAG budget.
 *
 * @module
 */

import type { ContextItem, PackWarning, PackingResult } from '../types/index.js';
import type { PackingContext, PackingStrategy } from './base.js';

/**
 * Configuration options for the rag-selection strategy
 */
export interface RAGSelectionStrategyOptions {
  /** Fraction of budget for RAG chunks */
  ragBudgetRatio?: number;
  /** Minimum relevance score threshold */
  minRelevanceScore?: number;
  /** Maximum number of RAG chunks */
  maxChunks?: number;
}

/**
 * Relevance-scored RAG chunk selection strategy.
 *
 * Selects RAG chunks by relevance score, keeping highest-scoring chunks
 * that fit within the allocated RAG budget.
 */
export class RelevanceScoredRAGStrategy implements PackingStrategy {
  readonly name = 'rag-selection';
  private readonly ragBudgetRatio: number;
  private readonly minRelevanceScore: number;
  private readonly maxChunks: number;

  constructor(options: RAGSelectionStrategyOptions = {}) {
    this.ragBudgetRatio = options.ragBudgetRatio ?? 0.3;
    this.minRelevanceScore = options.minRelevanceScore ?? 0.5;
    this.maxChunks = options.maxChunks ?? 20;
  }

  execute(context: PackingContext): PackingResult {
    const ragChunks = context.items.filter((item) => item.type === 'rag_chunk');
    const others = context.items.filter((item) => item.type !== 'rag_chunk');

    const included: ContextItem[] = [];
    const summarize: ContextItem[] = [];
    const dropped: ContextItem[] = [];
    const warnings: PackWarning[] = [];

    const scoredRag: Array<{ item: ContextItem; score: number }> = [];
    for (const item of ragChunks) {
      if (hasRelevanceScore(item)) {
        scoredRag.push({ item, score: item.relevanceScore });
      } else {
        dropped.push(item);
        warnings.push({
          code: 'ITEM_DROPPED',
          message: `RAG chunk "${item.id}" dropped: missing relevanceScore`,
          item,
          suggestion:
            'Ensure RAG chunks are created via createRAGChunk or include a relevanceScore field.',
        });
      }
    }

    const sortedRag = scoredRag.sort((a, b) => b.score - a.score);

    const ragBudget = Math.floor(context.budget.available * this.ragBudgetRatio);

    let usedTokens = 0;
    let ragTokens = 0;
    let ragCount = 0;

    for (const { item, score } of sortedRag) {
      if (ragCount >= this.maxChunks) {
        dropped.push(item);
        warnings.push({
          code: 'ITEM_DROPPED',
          message: `RAG chunk "${item.id}" dropped: exceeds maxChunks (${this.maxChunks})`,
          item,
        });
        continue;
      }

      if (score < this.minRelevanceScore) {
        dropped.push(item);
        warnings.push({
          code: 'ITEM_DROPPED',
          message: `RAG chunk "${item.id}" dropped: score ${score} below threshold ${this.minRelevanceScore}`,
          item,
        });
        continue;
      }

      if (item.tokenCount <= ragBudget - ragTokens) {
        included.push(item);
        ragTokens += item.tokenCount;
        ragCount++;
      } else if (item.canSummarize()) {
        summarize.push(item);
        warnings.push({
          code: 'ITEM_SUMMARIZED',
          message: `RAG chunk "${item.id}" will be summarized to fit within RAG budget`,
          item,
        });
      } else {
        dropped.push(item);
        warnings.push({
          code: 'ITEM_DROPPED',
          message: `RAG chunk "${item.id}" dropped due to RAG budget constraints`,
          item,
        });
      }
    }

    usedTokens += ragTokens;

    const sortedOthers = [...others].sort((a, b) => b.priority - a.priority);
    for (const item of sortedOthers) {
      if (item.tokenCount <= context.budget.available - usedTokens) {
        included.push(item);
        usedTokens += item.tokenCount;
      } else if (item.canSummarize()) {
        summarize.push(item);
        warnings.push({
          code: 'ITEM_SUMMARIZED',
          message: `Item "${item.id}" will be summarized to fit within budget`,
          item,
        });
      } else {
        dropped.push(item);
        warnings.push({
          code: 'ITEM_DROPPED',
          message: `Item "${item.id}" dropped due to budget constraints`,
          item,
        });
      }
    }

    return {
      included,
      summarize,
      dropped,
      usedTokens,
      remainingTokens: context.budget.available - usedTokens,
      warnings,
    };
  }
}

function hasRelevanceScore(item: ContextItem): item is ContextItem & { relevanceScore: number } {
  return (
    'relevanceScore' in item &&
    typeof (item as { relevanceScore: unknown }).relevanceScore === 'number'
  );
}

/**
 * Factory function to create a RAG selection strategy.
 *
 * @param options - Strategy configuration options
 * @returns A new RelevanceScoredRAGStrategy instance
 */
export function createRAGSelectionStrategy(
  options: RAGSelectionStrategyOptions = {},
): RelevanceScoredRAGStrategy {
  return new RelevanceScoredRAGStrategy(options);
}
