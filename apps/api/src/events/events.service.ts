import { EventListResponse } from "@insighthub/shared";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { ApiKeyService } from "../api-keys/api-key.service";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "../projects/projects.service";
import { TrackEventDto } from "./dto/track-event.dto";
import { IngestionRateLimitService } from "./ingestion-rate-limit.service";

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyService: ApiKeyService,
    private readonly projectsService: ProjectsService,
    private readonly ingestionRateLimitService: IngestionRateLimitService,
  ) {}

  async trackEvent(input: { apiKey: string; payload: TrackEventDto }) {
    const keyHash = this.apiKeyService.hashApiKey(input.apiKey);
    this.ingestionRateLimitService.assertAllowed({ keyHash });

    const projectApiKey = await this.prisma.projectApiKey.findFirst({
      where: {
        keyHash,
        revokedAt: null,
      },
      select: {
        id: true,
        projectId: true,
      },
    });

    if (!projectApiKey) {
      throw new UnauthorizedException("Invalid project API key");
    }

    const occurredAt = input.payload.timestamp
      ? new Date(input.payload.timestamp)
      : new Date();

    const event = await this.prisma.event.create({
      data: {
        projectId: projectApiKey.projectId,
        name: input.payload.event,
        userId: input.payload.userId,
        anonymousId: input.payload.anonymousId,
        properties: serializeEventProperties(input.payload.properties),
        occurredAt,
      },
      select: {
        id: true,
        name: true,
        projectId: true,
        occurredAt: true,
        ingestedAt: true,
      },
    });

    await this.prisma.projectApiKey.update({
      where: {
        id: projectApiKey.id,
      },
      data: {
        lastUsedAt: new Date(),
      },
    });

    return {
      accepted: true,
      event,
    };
  }

  async listProjectEvents(input: {
    projectId: string;
    userId: string;
    limit: number;
    days: number;
    offset: number;
    eventName?: string;
  }): Promise<EventListResponse> {
    await this.projectsService.assertProjectAccess(input);
    const start = new Date();
    start.setDate(start.getDate() - input.days + 1);
    start.setHours(0, 0, 0, 0);

    const where = {
      projectId: input.projectId,
      occurredAt: {
        gte: start,
      },
      ...(input.eventName ? { name: input.eventName.trim() } : {}),
    } satisfies Prisma.EventWhereInput;

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: {
          occurredAt: "desc",
        },
        skip: input.offset,
        take: input.limit,
        select: {
          id: true,
          name: true,
          userId: true,
          anonymousId: true,
          properties: true,
          occurredAt: true,
          ingestedAt: true,
        },
      }),
      this.prisma.event.count({
        where,
      }),
    ]);

    return {
      total,
      events: events.map((event) => ({
        id: event.id,
        name: event.name,
        actorId: event.userId ?? event.anonymousId,
        userId: event.userId,
        anonymousId: event.anonymousId,
        properties: parseEventProperties(event.properties),
        occurredAt: event.occurredAt.toISOString(),
        ingestedAt: event.ingestedAt.toISOString(),
      })),
    };
  }
}

function serializeEventProperties(
  properties: Record<string, unknown> | undefined,
) {
  return JSON.stringify(properties ?? {});
}

function parseEventProperties(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return {};
  }

  return {};
}
