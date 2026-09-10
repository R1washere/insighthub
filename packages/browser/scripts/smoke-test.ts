import { InsightHub } from "../src";

type CapturedRequest = {
  url: string;
  headers: HeadersInit | undefined;
  payload: unknown;
};

const requests: CapturedRequest[] = [];
let shouldFailNextRequest = false;

const originalFetch = globalThis.fetch;

globalThis.fetch = (async (url, init) => {
  if (shouldFailNextRequest) {
    shouldFailNextRequest = false;
    return new Response("temporary failure", { status: 503 });
  }

  requests.push({
    url: String(url),
    headers: init?.headers,
    payload: JSON.parse(String(init?.body)),
  });

  return new Response(JSON.stringify({ accepted: true }), { status: 202 });
}) as typeof fetch;

const analytics = new InsightHub({
  apiKey: "ihub_test_key",
  endpoint: "https://example.test/api/events",
  anonymousId: "anon_test",
  autoFlush: false,
  maxRetries: 2,
});

await analytics.track("workspace_created", {
  userId: "user_123",
  properties: {
    template: "kanban",
  },
});

assertEqual(analytics.getQueueSize(), 1, "track should queue events");

const firstFlush = await analytics.flush();
assertEqual(firstFlush.sent, 1, "flush should send queued events");
assertEqual(firstFlush.failed, 0, "successful flush should not fail events");
assertEqual(requests.length, 1, "one request should be captured");
assertEqual(
  requests[0]?.url,
  "https://example.test/api/events",
  "SDK should send to configured endpoint",
);
assertEqual(
  (requests[0]?.headers as Record<string, string>)["x-insighthub-key"],
  "ihub_test_key",
  "SDK should attach project API key",
);

const payload = requests[0]?.payload as {
  event?: string;
  userId?: string;
  anonymousId?: string;
  properties?: Record<string, unknown>;
};

assertEqual(payload.event, "workspace_created", "payload event mismatch");
assertEqual(payload.userId, "user_123", "payload user id mismatch");
assertEqual(payload.anonymousId, "anon_test", "payload anonymous id mismatch");
assertEqual(
  payload.properties?.template,
  "kanban",
  "payload properties mismatch",
);

shouldFailNextRequest = true;
await analytics.track("subscription_started", {
  userId: "user_123",
  properties: {
    plan: "pro",
  },
});

const retryFlush = await analytics.flush();
assertEqual(retryFlush.sent, 0, "failed request should not count as sent");
assertEqual(retryFlush.failed, 1, "failed request should be reported");
assertEqual(retryFlush.queued, 1, "failed request should stay queued");

const successfulRetry = await analytics.flush();
assertEqual(successfulRetry.sent, 1, "retry should send queued event");
assertEqual(successfulRetry.queued, 0, "retry queue should be empty");

analytics.destroy();
globalThis.fetch = originalFetch;

console.log("Browser SDK smoke test passed");

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Expected ${expected}, received ${actual}`);
  }
}
