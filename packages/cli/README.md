# @reaatech/context-window-planner-cli

[![npm version](https://img.shields.io/npm/v/@reaatech/context-window-planner-cli.svg)](https://www.npmjs.com/package/@reaatech/context-window-planner-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/reaatech/context-window-planner/blob/main/LICENSE)
[![CI](https://img.shields.io/github/actions/workflow/status/reaatech/context-window-planner/ci.yml?branch=main&label=CI)](https://github.com/reaatech/context-window-planner/actions/workflows/ci.yml)

> **Status:** Pre-1.0 — APIs may change in minor versions. Pin to a specific version in production.

Command-line interface for [`@reaatech/context-window-planner`](https://www.npmjs.com/package/@reaatech/context-window-planner). Reads context items from JSON on `stdin`, runs the packing engine, and outputs a complete packing plan to `stdout`.

## Installation

```bash
npm install -g @reaatech/context-window-planner-cli
# or
pnpm add -g @reaatech/context-window-planner-cli
```

The `cwp` binary will be available on your `PATH`.

## Feature Overview

- **Pipe JSON in, get a packing plan out** — single command, single responsibility
- **All strategies supported** — priority-greedy, sliding-window, summarize-replace, rag-selection
- **All tokenizer adapters** — OpenAI (tiktoken), Anthropic (approximate), or mock for testing
- **Structured JSON output** — packing results with `included`, `summarize`, `dropped` counts, token usage, and warnings
- **Multi-turn planning** — the `plan()` output is included when available

## Quick Start

```bash
echo '{
  "budget": 8000,
  "reserved": 1000,
  "model": "gpt-4",
  "strategy": "priority-greedy",
  "items": [
    { "id": "sys", "type": "system_prompt", "content": "You are a helpful assistant.", "priority": 100 },
    { "id": "turn-1", "type": "conversation_turn", "content": "Hello!", "priority": 75 }
  ]
}' | cwp
```

Output:

```json
{
  "packing": {
    "included": 2,
    "summarize": 0,
    "dropped": 0,
    "usedTokens": 12,
    "remainingTokens": 6588,
    "warnings": []
  },
  "turnPlan": null
}
```

## Input Format

The CLI accepts a single JSON object on `stdin`:

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `budget` | `number` | yes | Total token budget |
| `reserved` | `number` | no | Reserved tokens (default: `0`) |
| `model` | `string` | no | Model name for tokenizer selection (default: `"mock"`) |
| `strategy` | `string` | no | Strategy name (default: `"priority-greedy"`) |
| `strategyOptions` | `object` | no | Strategy-specific options (e.g. `{ "windowSize": 10 }`) |
| `items` | `array` | yes | Array of context items to pack |

Each item in `items`:

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `id` | `string` | yes | Unique item identifier |
| `type` | `string` | yes | One of: `system_prompt`, `conversation_turn`, `rag_chunk`, `tool_schema`, `tool_result`, `generation_buffer`, `custom` |
| `content` | `string` | yes | Text content of the item |
| `priority` | `number` | yes | Priority value: `100` (Critical), `75` (High), `50` (Medium), `25` (Low), `0` (Disposable) |
| `tokenCount` | `number` | no | Pre-computed token count (if omitted, the tokenizer computes it) |
| `metadata` | `object` | no | Optional key-value metadata for debugging |

## Output Format

A JSON object written to `stdout`:

| Field | Type | Description |
|-------|------|-------------|
| `packing.included` | `number` | Count of items included as-is |
| `packing.summarize` | `number` | Count of items marked for summarization |
| `packing.dropped` | `number` | Count of items dropped |
| `packing.usedTokens` | `number` | Total tokens consumed by included items |
| `packing.remainingTokens` | `number` | Tokens still available |
| `packing.warnings` | `array` | Array of `{ code, message }` warning objects |
| `turnPlan` | `object \| null` | Multi-turn plan if `plan()` was available |

## Examples

### Sliding Window Strategy

```bash
echo '{
  "budget": 4000,
  "model": "mock",
  "strategy": "sliding-window",
  "strategyOptions": { "windowSize": 3 },
  "items": [
    { "id": "sys", "type": "system_prompt", "content": "You are a helpful assistant.", "priority": 100 },
    { "id": "msg-1", "type": "conversation_turn", "content": "Turn 1 message text.", "priority": 75 },
    { "id": "msg-2", "type": "conversation_turn", "content": "Turn 2 message text.", "priority": 75 },
    { "id": "msg-3", "type": "conversation_turn", "content": "Turn 3 message text.", "priority": 75 },
    { "id": "msg-4", "type": "conversation_turn", "content": "Turn 4 message text.", "priority": 75 },
    { "id": "msg-5", "type": "conversation_turn", "content": "Turn 5 message text.", "priority": 75 }
  ]
}' | cwp
```

### RAG Selection

```bash
echo '{
  "budget": 3000,
  "model": "mock",
  "strategy": "rag-selection",
  "strategyOptions": { "ragBudgetRatio": 0.4, "minRelevanceScore": 0.5 },
  "items": [
    { "id": "sys", "type": "system_prompt", "content": "Answer using provided sources.", "priority": 100 },
    { "id": "user", "type": "conversation_turn", "content": "Tell me about Paris.", "priority": 75 },
    { "id": "chunk-1", "type": "rag_chunk", "content": "Paris is the capital of France.", "priority": 50, "metadata": { "relevanceScore": 0.95 } },
    { "id": "chunk-2", "type": "rag_chunk", "content": "The Seine runs through Paris.", "priority": 50, "metadata": { "relevanceScore": 0.55 } },
    { "id": "chunk-3", "type": "rag_chunk", "content": "Cheese is diverse in France.", "priority": 50, "metadata": { "relevanceScore": 0.3 } }
  ]
}' | cwp
```

### Scripting: Pack and Inspect

```bash
result=$(cat input.json | cwp)
included=$(echo "$result" | jq '.packing.included')
echo "Packed $included items"
```

## Related Packages

- [`@reaatech/context-window-planner`](https://www.npmjs.com/package/@reaatech/context-window-planner) — Core library with all strategies, tokenizers, and item primitives

## License

[MIT](https://github.com/reaatech/context-window-planner/blob/main/LICENSE)
