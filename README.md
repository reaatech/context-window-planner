# context-window-planner

Optimize token allocation within LLM context windows.

A small, dependency-light TypeScript library that helps you decide **what to
include, what to summarize, and what to drop** when you're packing prompts for
Claude, GPT, and other LLMs.

## Packages

This repository is a pnpm monorepo.

| Package                                             | Description                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------- |
| [`@reaatech/context-window-planner`](packages/core) | Core library: planner, strategies, tokenizer adapters, item primitives. |

## Quick start

```ts
import {
  ContextPlannerBuilder,
  createTokenizer,
  createPriorityGreedyStrategy,
  createSystemPrompt,
  createConversationTurn,
} from '@reaatech/context-window-planner';

const tokenizer = createTokenizer('gpt-4');

const planner = new ContextPlannerBuilder()
  .withBudget(8000)
  .withReserved(1000)
  .withTokenizer(tokenizer)
  .withStrategy(createPriorityGreedyStrategy())
  .build();

planner.addAll([
  createSystemPrompt({ content: 'You are a helpful assistant.' }, tokenizer),
  createConversationTurn({ role: 'user', content: 'Hello!' }, tokenizer),
]);

const result = planner.pack();
console.log(
  result.included.length,
  'items fit;',
  result.dropped.length,
  'dropped',
);
```

See [`packages/core/README.md`](packages/core/README.md) for the full API.

## Examples

Runnable examples live under [`examples/`](examples):

- [`basic-packing`](examples/basic-packing) — minimal end-to-end example
- [`conversation-management`](examples/conversation-management) — sliding-window
  over chat history
- [`custom-strategy`](examples/custom-strategy) — implement your own
  `PackingStrategy`
- [`with-rag`](examples/with-rag) — relevance-scored RAG chunk selection

Each example has its own README with a `node --import tsx/esm index.ts` command.

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
pnpm lint
```

Requires Node >= 18 and pnpm >= 8.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for workflow details and
[ARCHITECTURE.md](ARCHITECTURE.md) for design decisions. AI agents working on
this repository should also read [AGENTS.md](AGENTS.md).

## License

MIT © reaatech and contributors. See [LICENSE](LICENSE).
