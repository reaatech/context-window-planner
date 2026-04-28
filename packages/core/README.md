# context-window-planner

Optimize token allocation within LLM context windows. A small, dependency-light
library for deciding **what to include, what to summarize, and what to drop**
when you're packing prompts for Claude, GPT, and other LLMs.

- Pluggable **tokenizer adapters** (OpenAI tiktoken, Anthropic estimate, mock)
- Pluggable **packing strategies** (priority-greedy, sliding-window,
  summarize-and-replace, RAG relevance)
- Typed **context item** primitives (system prompt, conversation turn, RAG
  chunk, tool schema, tool result, generation buffer)
- Safe by default: **budget + reserved tokens + safety margin** applied exactly
  once
- Deterministic, framework-agnostic, zero runtime dependencies beyond
  `js-tiktoken`

## Install

```bash
npm install context-window-planner
# or
pnpm add context-window-planner
```

Node >= 18 is required.

## Quick start

```ts
import {
  ContextPlannerBuilder,
  createTokenizer,
  createPriorityGreedyStrategy,
  createSystemPrompt,
  createConversationTurn,
  createGenerationBuffer,
  Priority,
} from 'context-window-planner';

const tokenizer = createTokenizer('gpt-4');

const planner = new ContextPlannerBuilder()
  .withBudget(8000)
  .withReserved(1000) // room for the model to generate
  .withTokenizer(tokenizer)
  .withStrategy(createPriorityGreedyStrategy())
  .build();

planner.addAll([
  createSystemPrompt({ content: 'You are a helpful assistant.' }, tokenizer),
  createConversationTurn({ role: 'user', content: 'Hello!' }, tokenizer),
  createGenerationBuffer({ reservedTokens: 500 }),
]);

const result = planner.pack();
console.log(result.included.length, 'items fit');
console.log(result.dropped.length, 'items dropped');
console.log(result.warnings); // machine-readable warnings
```

## Concepts

### Token budget

A planner owns a `TokenBudget`:

```
total:     total tokens available in the model's window
reserved:  tokens you don't want packed with content
available: total − reserved − (total × safetyMargin)
```

`safetyMargin` defaults to `0.05` (5%) and is applied **once**, inside the
planner. Strategies always work against `budget.available` directly.

### Context items

Each item implements the `ContextItem` interface:

```ts
interface ContextItem {
  readonly id: string;
  readonly type: ContextItemType;
  readonly priority: Priority; // Critical | High | Medium | Low | Disposable
  readonly tokenCount: number;
  readonly metadata: Record<string, unknown> | undefined;
  canSummarize(): boolean;
  summarize?(): ContextItem;
}
```

Built-in item types:

| Type               | Default priority | Can summarize |
| ------------------ | ---------------: | :-----------: |
| `SystemPrompt`     |         Critical |      no       |
| `ConversationTurn` |             High |      yes      |
| `ToolSchema`       |             High |      no       |
| `ToolResult`       |           Medium |      yes      |
| `RAGChunk`         |           Medium |      yes      |
| `GenerationBuffer` |         Critical |      no       |

Each type has a `createX(props, tokenizer)` factory that computes `tokenCount`
for you. You can also build your own items by implementing the interface.

### Strategies

| Strategy            | Purpose                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| `priority-greedy`   | Fill highest-priority items first, then fall through to lower ones.                |
| `sliding-window`    | Keep the most recent N conversation turns; consider older turns for summarization. |
| `summarize-replace` | Actively summarize items that don't fit, up to `maxSummaries`.                     |
| `rag-selection`     | Allocate a fraction of the budget to RAG chunks, sorted by relevance score.        |

Create them via the factory functions or `createStrategy('name', options)`.

### Packing result

```ts
interface PackingResult {
  readonly included: ReadonlyArray<ContextItem>;
  readonly summarize: ReadonlyArray<ContextItem>;
  readonly dropped: ReadonlyArray<ContextItem>;
  readonly usedTokens: number;
  readonly remainingTokens: number;
  readonly warnings: ReadonlyArray<PackWarning>;
}
```

Every decision (summarize / drop / low-remaining / budget-exceeded) comes with a
machine-readable `PackWarning` so you can log, alert, or surface it in a UI.

## Examples

Runnable examples live in the repository under
[`examples/`](https://github.com/reaatech/context-window-planner/tree/main/examples):

- `basic-packing` — minimal end-to-end example
- `conversation-management` — sliding-window over chat history
- `custom-strategy` — implement your own `PackingStrategy`
- `with-rag` — relevance-scored RAG chunk selection

## Custom strategies

Implement the `PackingStrategy` interface:

```ts
import type {
  PackingStrategy,
  PackingContext,
  PackingResult,
} from 'context-window-planner';

export class MyStrategy implements PackingStrategy {
  readonly name = 'my-strategy';

  execute(context: PackingContext): PackingResult {
    // decide which items go into `included`, `summarize`, or `dropped`
    // and return usedTokens / remainingTokens / warnings.
  }
}
```

Pass an instance to `new ContextPlanner({ strategy: new MyStrategy() })`.

## Tokenizers

| Adapter                     | Use for                                       |
| --------------------------- | --------------------------------------------- |
| `TiktokenTokenizerAdapter`  | OpenAI GPT-3.5 / GPT-4 models (accurate).     |
| `AnthropicTokenizerAdapter` | Claude models (approximate ~3.5 chars/token). |
| `MockTokenizerAdapter`      | Deterministic word-based counter for tests.   |

`createTokenizer(model)` picks the right adapter based on the model name.

## Errors

All errors extend `ContextPlannerError` and carry a stable `code`:

- `BUDGET_EXCEEDED`
- `TOKEN_COUNT_ERROR`
- `INVALID_ITEM`
- `TOKENIZER_ERROR`
- `STRATEGY_ERROR`
- `VALIDATION_ERROR`

Catch the base class if you just want a yes/no signal:

```ts
import { ContextPlannerError } from 'context-window-planner';

try {
  planner.pack();
} catch (err) {
  if (err instanceof ContextPlannerError) {
    console.error(err.code, err.message, err.details);
  }
}
```

## License

MIT © reaatech and contributors. See
[LICENSE](https://github.com/reaatech/context-window-planner/blob/main/LICENSE).
