import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

type RateLimitBucket = {
  count: number;
  windowStartedAt: number;
};

@Injectable()
export class IngestionRateLimitService {
  private readonly buckets = new Map<string, RateLimitBucket>();
  private readonly windowMs: number;
  private readonly maxEventsPerWindow: number;
  private readonly maxBuckets: number;

  constructor(private readonly configService: ConfigService) {
    this.windowMs = readPositiveInteger(
      this.configService.get<string>("INGESTION_RATE_LIMIT_WINDOW_MS"),
      60_000,
    );
    this.maxEventsPerWindow = readPositiveInteger(
      this.configService.get<string>("INGESTION_RATE_LIMIT_MAX"),
      120,
    );
    this.maxBuckets = readPositiveInteger(
      this.configService.get<string>("INGESTION_RATE_LIMIT_MAX_BUCKETS"),
      5_000,
    );
  }

  assertAllowed(input: { keyHash: string; now?: Date }) {
    const nowMs = input.now?.getTime() ?? Date.now();
    const bucket = this.buckets.get(input.keyHash);

    if (!bucket || nowMs - bucket.windowStartedAt >= this.windowMs) {
      this.buckets.set(input.keyHash, {
        count: 1,
        windowStartedAt: nowMs,
      });
      this.pruneBuckets(nowMs);
      return;
    }

    if (bucket.count >= this.maxEventsPerWindow) {
      const retryAfterSeconds = Math.max(
        Math.ceil((bucket.windowStartedAt + this.windowMs - nowMs) / 1000),
        1,
      );

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Event ingestion rate limit exceeded",
          retryAfterSeconds,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
  }

  private pruneBuckets(nowMs: number) {
    if (this.buckets.size <= this.maxBuckets) {
      return;
    }

    for (const [keyHash, bucket] of this.buckets.entries()) {
      if (nowMs - bucket.windowStartedAt >= this.windowMs) {
        this.buckets.delete(keyHash);
      }
    }

    while (this.buckets.size > this.maxBuckets) {
      const oldestKey = this.buckets.keys().next().value as string | undefined;

      if (!oldestKey) {
        return;
      }

      this.buckets.delete(oldestKey);
    }
  }
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}
