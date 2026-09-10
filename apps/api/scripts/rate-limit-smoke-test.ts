import { HttpException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IngestionRateLimitService } from "../src/events/ingestion-rate-limit.service";

const config = {
  get(key: string) {
    return {
      INGESTION_RATE_LIMIT_WINDOW_MS: "1000",
      INGESTION_RATE_LIMIT_MAX: "2",
      INGESTION_RATE_LIMIT_MAX_BUCKETS: "10",
    }[key];
  },
} as ConfigService;

const rateLimiter = new IngestionRateLimitService(config);

rateLimiter.assertAllowed({
  keyHash: "key_a",
  now: new Date(0),
});
rateLimiter.assertAllowed({
  keyHash: "key_a",
  now: new Date(100),
});

assertThrows429(() =>
  rateLimiter.assertAllowed({
    keyHash: "key_a",
    now: new Date(200),
  }),
);

rateLimiter.assertAllowed({
  keyHash: "key_b",
  now: new Date(200),
});
rateLimiter.assertAllowed({
  keyHash: "key_a",
  now: new Date(1200),
});

console.log("Ingestion rate limiter smoke test passed");

function assertThrows429(callback: () => void) {
  try {
    callback();
  } catch (error) {
    if (error instanceof HttpException && error.getStatus() === 429) {
      return;
    }

    throw error;
  }

  throw new Error("Expected rate limiter to throw HTTP 429");
}
