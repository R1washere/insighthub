# @insighthub/browser

Browser tracking SDK for InsightHub.

## Usage

```ts
import { InsightHub } from "@insighthub/browser";

const analytics = new InsightHub({
  apiKey: "ihub_demo_taskflow_development_key",
  endpoint: "http://localhost:4000/api/events",
});

await analytics.track("workspace_created", {
  userId: "user_4821",
  properties: {
    template: "kanban",
    source: "onboarding",
  },
});
```

## Features

- Typed `track()` API.
- Automatic `timestamp`.
- Automatic anonymous id persisted in browser local storage.
- Optional `identify(userId)` for known users.
- Retry queue for temporary network failures.
- `flush()` for manual delivery.
- Page unload flush using `fetch` with `keepalive`.

## Local Checks

```bash
pnpm --filter @insighthub/browser test
pnpm --filter @insighthub/browser typecheck
pnpm --filter @insighthub/browser build
```
