/**
 * Custom strategy example.
 *
 * Demonstrates implementing a PackingStrategy — here, a "type-weighted" strategy
 * that prefers tool schemas over conversation turns when space is tight.
 *
 * Run: `pnpm --filter @example/custom-strategy start`
 */

import {
  ContextPlanner,
  createConversationTurn,
  createMockTokenizer,
  createSystemPrompt,
  createToolSchema,
  type PackingContext,
  type PackingResult,
  type PackingStrategy,
} from 'context-window-planner';

const TYPE_WEIGHTS: Record<string, number> = {
  system_prompt: 1000,
  tool_schema: 500,
  tool_result: 200,
  conversation_turn: 100,
  rag_chunk: 150,
  generation_buffer: 10_000,
  custom: 50,
};

class TypeWeightedStrategy implements PackingStrategy {
  readonly name = 'type-weighted';

  execute(context: PackingContext): PackingResult {
    const sorted = [...context.items].sort((a, b) => {
      const wa = (TYPE_WEIGHTS[a.type] ?? 0) + a.priority;
      const wb = (TYPE_WEIGHTS[b.type] ?? 0) + b.priority;
      return wb - wa;
    });

    const included = [];
    const dropped = [];
    let usedTokens = 0;

    for (const item of sorted) {
      if (item.tokenCount <= context.budget.available - usedTokens) {
        included.push(item);
        usedTokens += item.tokenCount;
      } else {
        dropped.push(item);
      }
    }

    return {
      included,
      summarize: [],
      dropped,
      usedTokens,
      remainingTokens: context.budget.available - usedTokens,
      warnings: [],
    };
  }
}

const tokenizer = createMockTokenizer();

const planner = new ContextPlanner({
  budget: 500,
  tokenizer,
  strategy: new TypeWeightedStrategy(),
});

planner.addAll([
  createSystemPrompt({ content: 'You are a tool-using assistant.' }, tokenizer),
  createToolSchema(
    { name: 'search', description: 'Search the web', schema: { type: 'object' } },
    tokenizer,
  ),
  createConversationTurn({ role: 'user', content: 'How big is Mars?' }, tokenizer),
]);

const result = planner.pack();

for (const item of result.included) {
  console.log(`kept: ${item.type} (${item.tokenCount} tokens)`);
}
for (const item of result.dropped) {
  console.log(`drop: ${item.type} (${item.tokenCount} tokens)`);
}
