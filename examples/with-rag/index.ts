/**
 * RAG selection example.
 *
 * Pretend we retrieved 8 candidate chunks from a vector store. Use the
 * rag-selection strategy to keep the highest-scoring chunks within a RAG
 * budget while still fitting the system prompt and latest user turn.
 *
 * Run: `pnpm --filter @example/with-rag start`
 */

import {
  ContextPlannerBuilder,
  createConversationTurn,
  createMockTokenizer,
  createRAGChunk,
  createRAGSelectionStrategy,
  createSystemPrompt,
} from '@reaatech/context-window-planner';

const tokenizer = createMockTokenizer();

const chunks = [
  { score: 0.95, text: 'Paris is the capital of France.' },
  { score: 0.82, text: 'France has a population of ~68 million.' },
  { score: 0.61, text: 'The Eiffel Tower was completed in 1889.' },
  { score: 0.55, text: 'The Seine runs through Paris.' },
  { score: 0.44, text: 'Croissants originated in Austria, not France.' },
  { score: 0.3, text: 'Cheese production in France is diverse.' },
  { score: 0.2, text: 'Rugby is popular in southwest France.' },
  { score: 0.1, text: 'The Louvre museum holds many artworks.' },
].map((c, i) =>
  createRAGChunk(
    {
      content: c.text,
      relevanceScore: c.score,
      source: `doc-${i}`,
      chunkIndex: i,
    },
    tokenizer,
  ),
);

const planner = new ContextPlannerBuilder()
  .withBudget(300)
  .withTokenizer(tokenizer)
  .withStrategy(createRAGSelectionStrategy({ ragBudgetRatio: 0.6, minRelevanceScore: 0.4 }))
  .addItem(
    createSystemPrompt({ content: 'Answer using the provided sources when possible.' }, tokenizer),
  )
  .addItem(createConversationTurn({ role: 'user', content: 'Tell me about Paris.' }, tokenizer))
  .addItems(chunks)
  .build();

const result = planner.pack();

console.log('Included RAG chunks:');
for (const item of result.included) {
  if (item.type !== 'rag_chunk') {
    continue;
  }
  const score = (item as unknown as { relevanceScore: number }).relevanceScore;
  console.log(`  [${score.toFixed(2)}] ${(item as { content: string }).content}`);
}

console.log(`\ntokens: ${result.usedTokens} / ${planner.getBudget().total}`);
console.log(`warnings: ${result.warnings.length}`);
