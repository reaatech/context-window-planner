/**
 * Basic packing example.
 *
 * Build a small planner with a priority-greedy strategy and pack a few items.
 *
 * Run: `pnpm --filter @example/basic-packing start`
 */

import {
  ContextPlannerBuilder,
  createConversationTurn,
  createMockTokenizer,
  createPriorityGreedyStrategy,
  createSystemPrompt,
  Priority,
} from '@reaatech/context-window-planner';

const tokenizer = createMockTokenizer();

const planner = new ContextPlannerBuilder()
  .withBudget(2000)
  .withReserved(200)
  .withTokenizer(tokenizer)
  .withStrategy(createPriorityGreedyStrategy())
  .build();

planner.addAll([
  createSystemPrompt(
    { content: 'You are a concise assistant.', priority: Priority.Critical },
    tokenizer,
  ),
  createConversationTurn({ role: 'user', content: 'What is the capital of France?' }, tokenizer),
  createConversationTurn({ role: 'assistant', content: 'Paris.' }, tokenizer),
  createConversationTurn(
    { role: 'user', content: 'Great. Tell me a short story about Paris.' },
    tokenizer,
  ),
]);

const result = planner.pack();

console.log(`included:  ${result.included.length}`);
console.log(`summarize: ${result.summarize.length}`);
console.log(`dropped:   ${result.dropped.length}`);
console.log(`tokens:    ${result.usedTokens} / ${planner.getBudget().total}`);
for (const warning of result.warnings) {
  console.log(`- ${warning.code}: ${warning.message}`);
}
