# with-rag

Relevance-scored RAG chunk selection: eight candidate chunks are packed into a
budget with a dedicated RAG sub-budget. Low-scoring chunks are filtered out; the
highest-scoring ones that fit are included.

## Run

```bash
pnpm install
pnpm --filter context-window-planner build
pnpm --filter @example/with-rag start
```
