export type InsightHubConfig = {
  apiKey: string;
  endpoint?: string;
  userId?: string;
  anonymousId?: string;
  autoFlush?: boolean;
  flushIntervalMs?: number;
  maxRetries?: number;
  maxQueueSize?: number;
  enablePageUnloadFlush?: boolean;
};

export type TrackedEventPayload = {
  event: string;
  userId?: string;
  anonymousId?: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
};

export type TrackOptions = Omit<TrackedEventPayload, "event">;

export type FlushResult = {
  sent: number;
  failed: number;
  queued: number;
};

type QueuedEvent = {
  payload: TrackedEventPayload;
  attempts: number;
};

const defaultEndpoint = "http://localhost:4000/api/events";
const anonymousIdStorageKey = "insighthub.anonymousId";

export class InsightHub {
  private readonly apiKey: string;
  private readonly endpoint: string;
  private readonly autoFlush: boolean;
  private readonly maxRetries: number;
  private readonly maxQueueSize: number;
  private readonly enablePageUnloadFlush: boolean;
  private queue: QueuedEvent[] = [];
  private userId: string | undefined;
  private anonymousId: string;
  private flushTimer: ReturnType<typeof setInterval> | undefined;
  private flushInProgress: Promise<FlushResult> | undefined;

  constructor(config: InsightHubConfig) {
    if (!config.apiKey.trim()) {
      throw new Error("InsightHub apiKey is required");
    }

    this.apiKey = config.apiKey;
    this.endpoint = config.endpoint ?? defaultEndpoint;
    this.userId = config.userId;
    this.anonymousId = config.anonymousId ?? getOrCreateAnonymousId();
    this.autoFlush = config.autoFlush ?? true;
    this.maxRetries = config.maxRetries ?? 3;
    this.maxQueueSize = config.maxQueueSize ?? 100;
    this.enablePageUnloadFlush = config.enablePageUnloadFlush ?? true;

    if (config.flushIntervalMs && config.flushIntervalMs > 0) {
      this.flushTimer = setInterval(() => void this.flush(), config.flushIntervalMs);
    }

    if (this.enablePageUnloadFlush && typeof window !== "undefined") {
      window.addEventListener("pagehide", () => void this.flush());
    }
  }

  identify(userId: string) {
    this.userId = userId;
  }

  reset() {
    this.userId = undefined;
    this.anonymousId = createAnonymousId();
    writeAnonymousId(this.anonymousId);
  }

  getAnonymousId() {
    return this.anonymousId;
  }

  getQueueSize() {
    return this.queue.length;
  }

  async track(
    event: string | TrackedEventPayload,
    options: TrackOptions = {},
  ): Promise<FlushResult | undefined> {
    const payload =
      typeof event === "string"
        ? this.createPayload(event, options)
        : this.createPayload(event.event, event);

    this.enqueue(payload);

    if (this.autoFlush) {
      return this.flush();
    }

    return undefined;
  }

  async flush(): Promise<FlushResult> {
    if (this.flushInProgress) {
      return this.flushInProgress;
    }

    this.flushInProgress = this.flushQueue();

    try {
      return await this.flushInProgress;
    } finally {
      this.flushInProgress = undefined;
    }
  }

  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  private createPayload(
    event: string,
    options: TrackOptions,
  ): TrackedEventPayload {
    const eventName = event.trim();

    if (!eventName) {
      throw new Error("InsightHub event name is required");
    }

    return {
      event: eventName,
      userId: options.userId ?? this.userId,
      anonymousId: options.anonymousId ?? this.anonymousId,
      timestamp: options.timestamp ?? new Date().toISOString(),
      properties: options.properties ?? {},
    };
  }

  private enqueue(payload: TrackedEventPayload) {
    this.queue.push({ payload, attempts: 0 });

    if (this.queue.length > this.maxQueueSize) {
      this.queue.shift();
    }
  }

  private async flushQueue(): Promise<FlushResult> {
    let sent = 0;
    let failed = 0;
    const retryQueue: QueuedEvent[] = [];
    const eventsToSend = this.queue;
    this.queue = [];

    for (const queuedEvent of eventsToSend) {
      try {
        await this.send(queuedEvent.payload);
        sent += 1;
      } catch {
        const attempts = queuedEvent.attempts + 1;

        if (attempts <= this.maxRetries) {
          retryQueue.push({
            ...queuedEvent,
            attempts,
          });
        }

        failed += 1;
      }
    }

    this.queue = [...retryQueue, ...this.queue].slice(-this.maxQueueSize);

    return {
      sent,
      failed,
      queued: this.queue.length,
    };
  }

  private async send(payload: TrackedEventPayload) {
    if (typeof fetch === "undefined") {
      throw new Error("InsightHub requires fetch to send events");
    }

    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-insighthub-key": this.apiKey,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!response.ok) {
      throw new Error(`InsightHub event rejected with ${response.status}`);
    }
  }

}

function getOrCreateAnonymousId() {
  const storedAnonymousId = readAnonymousId();

  if (storedAnonymousId) {
    return storedAnonymousId;
  }

  const anonymousId = createAnonymousId();
  writeAnonymousId(anonymousId);

  return anonymousId;
}

function readAnonymousId() {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage.getItem(anonymousIdStorageKey) ?? undefined;
  } catch {
    return undefined;
  }
}

function writeAnonymousId(anonymousId: string) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(anonymousIdStorageKey, anonymousId);
  } catch {
    return;
  }
}

function createAnonymousId() {
  const randomValue =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

  return `anon_${randomValue}`;
}
