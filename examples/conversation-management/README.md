# conversation-management

Sliding-window strategy over a 10-turn conversation: keep the most recent turns
and let older ones be summarized or dropped.

## Run

```bash
pnpm install
pnpm --filter context-window-planner build
pnpm --filter @example/conversation-management start
```
