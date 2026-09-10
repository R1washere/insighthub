import {
  AnalyticsSummary,
  DashboardOverview,
  EventsOverTimePoint,
  RecentActivityItem,
  TopEvent,
} from "@insighthub/shared";
import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "../projects/projects.service";

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async getOverview(input: {
    projectId: string;
    userId: string;
    days: number;
    limit: number;
  }): Promise<DashboardOverview> {
    const [summary, eventsOverTime, topEvents, recentActivity] =
      await Promise.all([
        this.getSummary(input),
        this.getEventsOverTime(input),
        this.getTopEvents(input),
        this.getRecentActivity(input),
      ]);

    return {
      summary,
      eventsOverTime,
      topEvents,
      recentActivity,
    };
  }

  async getSummary(input: {
    projectId: string;
    userId: string;
    days: number;
  }): Promise<AnalyticsSummary> {
    await this.projectsService.assertProjectAccess(input);

    const range = getDateRange(input.days);

    const [
      totalEvents,
      previousTotalEvents,
      uniqueUsers,
      previousUniqueUsers,
      paidConversions,
      previousPaidConversions,
      activation,
    ] = await Promise.all([
      this.prisma.event.count({
        where: {
          projectId: input.projectId,
          occurredAt: {
            gte: range.currentStart,
          },
        },
      }),
      this.prisma.event.count({
        where: {
          projectId: input.projectId,
          occurredAt: {
            gte: range.previousStart,
            lt: range.currentStart,
          },
        },
      }),
      this.countUniqueActors({
        projectId: input.projectId,
        start: range.currentStart,
      }),
      this.countUniqueActors({
        projectId: input.projectId,
        start: range.previousStart,
        end: range.currentStart,
      }),
      this.prisma.event.count({
        where: {
          projectId: input.projectId,
          name: "subscription_started",
          occurredAt: {
            gte: range.currentStart,
          },
        },
      }),
      this.prisma.event.count({
        where: {
          projectId: input.projectId,
          name: "subscription_started",
          occurredAt: {
            gte: range.previousStart,
            lt: range.currentStart,
          },
        },
      }),
      this.getActivationStats({
        projectId: input.projectId,
        start: range.currentStart,
      }),
    ]);

    return {
      totalEvents,
      uniqueUsers,
      activationRate: activation.signups
        ? Math.round((activation.activated / activation.signups) * 100)
        : 0,
      paidConversions,
      changes: {
        totalEvents: calculateChangePercent(totalEvents, previousTotalEvents),
        uniqueUsers: calculateChangePercent(uniqueUsers, previousUniqueUsers),
        paidConversions: calculateChangePercent(
          paidConversions,
          previousPaidConversions,
        ),
      },
    };
  }

  async getEventsOverTime(input: {
    projectId: string;
    userId: string;
    days: number;
  }): Promise<EventsOverTimePoint[]> {
    await this.projectsService.assertProjectAccess(input);

    const range = getDateRange(input.days);
    const rows = await this.prisma.$queryRaw<
      Array<{
        day: string;
        events: number | bigint;
        uniqueUsers: number | bigint;
      }>
    >(Prisma.sql`
      SELECT
        date("occurredAt") AS day,
        COUNT(*) AS events,
        COUNT(DISTINCT COALESCE("userId", "anonymousId")) AS "uniqueUsers"
      FROM "Event"
      WHERE "projectId" = ${input.projectId}
        AND "occurredAt" >= ${range.currentStart}
      GROUP BY day
      ORDER BY day ASC
    `);

    const byDate = new Map(
      rows.map((row) => [
        row.day,
        {
          events: Number(row.events),
          uniqueUsers: Number(row.uniqueUsers),
        },
      ]),
    );

    return createDateKeys(input.days).map((date) => ({
      date,
      events: byDate.get(date)?.events ?? 0,
      uniqueUsers: byDate.get(date)?.uniqueUsers ?? 0,
    }));
  }

  async getTopEvents(input: {
    projectId: string;
    userId: string;
    days: number;
    limit: number;
  }): Promise<TopEvent[]> {
    await this.projectsService.assertProjectAccess(input);

    const range = getDateRange(input.days);
    const rows = await this.prisma.event.groupBy({
      by: ["name"],
      where: {
        projectId: input.projectId,
        occurredAt: {
          gte: range.currentStart,
        },
      },
      _count: {
        name: true,
      },
      orderBy: {
        _count: {
          name: "desc",
        },
      },
      take: input.limit,
    });

    return rows.map((row) => ({
      name: row.name,
      count: row._count.name,
    }));
  }

  async getRecentActivity(input: {
    projectId: string;
    userId: string;
    limit: number;
  }): Promise<RecentActivityItem[]> {
    await this.projectsService.assertProjectAccess(input);

    const rows = await this.prisma.event.findMany({
      where: {
        projectId: input.projectId,
      },
      orderBy: {
        occurredAt: "desc",
      },
      take: input.limit,
      select: {
        id: true,
        name: true,
        userId: true,
        anonymousId: true,
        properties: true,
        occurredAt: true,
      },
    });

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      actorId: row.userId ?? row.anonymousId,
      properties: parseEventProperties(row.properties),
      occurredAt: row.occurredAt.toISOString(),
    }));
  }

  private async countUniqueActors(input: {
    projectId: string;
    start: Date;
    end?: Date;
  }) {
    const rows = await this.prisma.$queryRaw<
      Array<{ count: number | bigint }>
    >(
      Prisma.sql`
        SELECT COUNT(DISTINCT COALESCE("userId", "anonymousId")) AS count
        FROM "Event"
        WHERE "projectId" = ${input.projectId}
          AND "occurredAt" >= ${input.start}
          ${input.end ? Prisma.sql`AND "occurredAt" < ${input.end}` : Prisma.empty}
          AND COALESCE("userId", "anonymousId") IS NOT NULL
      `,
    );

    return Number(rows[0]?.count ?? 0);
  }

  private async getActivationStats(input: { projectId: string; start: Date }) {
    const rows = await this.prisma.$queryRaw<
      Array<{
        signups: number | bigint;
        activated: number | bigint;
      }>
    >(Prisma.sql`
      WITH signed_up AS (
        SELECT DISTINCT COALESCE("userId", "anonymousId") AS actor
        FROM "Event"
        WHERE "projectId" = ${input.projectId}
          AND "name" = 'user_signed_up'
          AND "occurredAt" >= ${input.start}
          AND COALESCE("userId", "anonymousId") IS NOT NULL
      ),
      activated AS (
        SELECT DISTINCT COALESCE("userId", "anonymousId") AS actor
        FROM "Event"
        WHERE "projectId" = ${input.projectId}
          AND "name" = 'workspace_created'
          AND "occurredAt" >= ${input.start}
          AND COALESCE("userId", "anonymousId") IS NOT NULL
      )
      SELECT
        (SELECT COUNT(*) FROM signed_up) AS signups,
        (SELECT COUNT(*) FROM activated WHERE actor IN (SELECT actor FROM signed_up)) AS activated
    `);

    return {
      signups: Number(rows[0]?.signups ?? 0),
      activated: Number(rows[0]?.activated ?? 0),
    };
  }
}

function getDateRange(days: number) {
  const currentStart = new Date();
  currentStart.setDate(currentStart.getDate() - days + 1);
  currentStart.setHours(0, 0, 0, 0);

  const previousStart = new Date(currentStart);
  previousStart.setDate(currentStart.getDate() - days);

  return {
    currentStart,
    previousStart,
  };
}

function createDateKeys(days: number) {
  const dates: string[] = [];
  const current = new Date();
  current.setDate(current.getDate() - days + 1);
  current.setHours(0, 0, 0, 0);

  for (let index = 0; index < days; index += 1) {
    dates.push(toDateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function calculateChangePercent(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Math.round(((current - previous) / previous) * 100);
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
