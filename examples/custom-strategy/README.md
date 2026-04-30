# custom-strategy

Shows how to implement your own `PackingStrategy`. This one weighs item types
(system > tool > rag > conversation) in addition to priority.

## Run

```bash
pnpm install
pnpm --filter @reaatech/context-window-planner build
pnpm --filter @example/custom-strategy start
```
