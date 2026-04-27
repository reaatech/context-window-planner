/**
 * Conversation management example.
 *
 * Use the sliding-window strategy to keep the most recent turns and let older
 * turns be summarized or dropped to fit the budget.
 *
 * Run: `pnpm --filter @example/conversation-management start`
 */

import {
  ContextPlannerBuilder,
  createConversationTurn,
  createMockTokenizer,
  createSlidingWindowStrategy,
  createSystemPrompt,
} from '@reaatech/context-window-planner';

const tokenizer = createMockTokenizer();
const now = Date.now();

// Simulate a 10-turn conversation, newest last.
const turns = Array.from({ length: 10 }, (_, i) =>
  createConversationTurn(
    {
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i + 1} — ${'context '.repeat(20)}`,
      timestamp: now - (10 - i) * 60_000,
    },
    tokenizer,
  ),
);

const planner = new ContextPlannerBuilder()
  .withBudget(400)
  .withTokenizer(tokenizer)
  .withStrategy(createSlidingWindowStrategy({ windowSize: 4 }))
  .addItem(createSystemPrompt({ content: 'You are a helpful assistant.' }, tokenizer))
  .addItems(turns)
  .build();

const result = planner.pack();

console.log(`included:  ${result.included.length}`);
console.log(`summarize: ${result.summarize.length}`);
console.log(`dropped:   ${result.dropped.length}`);
console.log(`tokens:    ${result.usedTokens} / ${planner.getBudget().total}`);
