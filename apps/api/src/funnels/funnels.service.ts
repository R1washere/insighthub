import {
  FunnelListItem,
  FunnelReport,
  FunnelReportStep,
} from "@insighthub/shared";
import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { ProjectsService } from "../projects/projects.service";
import { CreateFunnelStepDto } from "./dto/create-funnel.dto";

@Injectable()
export class FunnelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: ProjectsService,
  ) {}

  async createFunnel(input: {
    projectId: string;
    userId: string;
    name: string;
    steps: CreateFunnelStepDto[];
  }): Promise<FunnelListItem> {
    await this.projectsService.assertProjectAccess(input);

    const funnel = await this.prisma.funnel.create({
      data: {
        projectId: input.projectId,
        createdById: input.userId,
        name: input.name.trim(),
        steps: {
          create: input.steps.map((step, index) => ({
            order: index + 1,
            eventName: normalizeEventName(step.eventName),
          })),
        },
      },
      include: funnelInclude,
    });

    return toFunnelListItem(funnel);
  }

  async listFunnels(input: {
    projectId: string;
    userId: string;
  }): Promise<FunnelListItem[]> {
    await this.projectsService.assertProjectAccess(input);

    const funnels = await this.prisma.funnel.findMany({
      where: {
        projectId: input.projectId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: funnelInclude,
    });

    return funnels.map(toFunnelListItem);
  }

  async getFunnelReport(input: {
    projectId: string;
    funnelId: string;
    userId: string;
    days: number;
  }): Promise<FunnelReport> {
    await this.projectsService.assertProjectAccess(input);

    const funnel = await this.prisma.funnel.findFirst({
      where: {
        id: input.funnelId,
        projectId: input.projectId,
      },
      include: funnelInclude,
    });

    if (!funnel) {
      throw new NotFoundException("Funnel not found");
    }

    const range = getDateRange(input.days);
    const stepEventNames = funnel.steps.map((step) => step.eventName);
    const events = await this.prisma.event.findMany({
      where: {
        projectId: input.projectId,
        name: {
          in: stepEventNames,
        },
        occurredAt: {
          gte: range.start,
          lte: range.end,
        },
        OR: [{ userId: { not: null } }, { anonymousId: { not: null } }],
      },
      orderBy: {
        occurredAt: "asc",
      },
      select: {
        name: true,
        userId: true,
        anonymousId: true,
        occurredAt: true,
      },
    });

    const progressionByActor = calculateProgressionByActor(
      events.map((event) => ({
        name: event.name,
        actorId: event.userId ?? event.anonymousId,
        occurredAt: event.occurredAt,
      })),
      stepEventNames,
    );

    const stepCounts = stepEventNames.map(
      (_, stepIndex) =>
        progressionByActor.filter((progress) => progress > stepIndex).length,
    );

    const firstStepUsers = stepCounts[0] ?? 0;
    const completedUsers = stepCounts[stepCounts.length - 1] ?? 0;

    const steps: FunnelReportStep[] = funnel.steps.map((step, index) => {
      const users = stepCounts[index] ?? 0;
      const previousUsers = index === 0 ? users : (stepCounts[index - 1] ?? 0);

      return {
        id: step.id,
        order: step.order,
        eventName: step.eventName,
        users,
        conversionRate: index === 0 ? 100 : calculateRate(users, previousUsers),
        dropOffRate:
          index === 0 ? 0 : 100 - calculateRate(users, previousUsers),
      };
    });

    return {
      funnel: toFunnelListItem(funnel),
      range: {
        days: input.days,
        start: range.start.toISOString(),
        end: range.end.toISOString(),
      },
      totalUsers: firstStepUsers,
      completedUsers,
      overallConversionRate: calculateRate(completedUsers, firstStepUsers),
      steps,
    };
  }
}

type FunnelWithSteps = Prisma.FunnelGetPayload<{
  include: typeof funnelInclude;
}>;

const funnelInclude = {
  steps: {
    orderBy: {
      order: "asc",
    },
  },
} satisfies Prisma.FunnelInclude;

function toFunnelListItem(funnel: FunnelWithSteps): FunnelListItem {
  return {
    id: funnel.id,
    name: funnel.name,
    projectId: funnel.projectId,
    createdAt: funnel.createdAt.toISOString(),
    updatedAt: funnel.updatedAt.toISOString(),
    steps: funnel.steps.map((step) => ({
      id: step.id,
      order: step.order,
      eventName: step.eventName,
    })),
  };
}

function calculateProgressionByActor(
  events: Array<{
    name: string;
    actorId: string | null;
    occurredAt: Date;
  }>,
  stepEventNames: string[],
) {
  const progressByActor = new Map<string, number>();
  const lastStepTimeByActor = new Map<string, Date>();

  for (const event of events) {
    if (!event.actorId) {
      continue;
    }

    const currentProgress = progressByActor.get(event.actorId) ?? 0;
    const expectedEventName = stepEventNames[currentProgress];

    if (event.name !== expectedEventName) {
      continue;
    }

    const lastStepTime = lastStepTimeByActor.get(event.actorId);

    if (lastStepTime && event.occurredAt < lastStepTime) {
      continue;
    }

    progressByActor.set(event.actorId, currentProgress + 1);
    lastStepTimeByActor.set(event.actorId, event.occurredAt);
  }

  return [...progressByActor.values()];
}

function getDateRange(days: number) {
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date();

  return {
    start,
    end,
  };
}

function normalizeEventName(value: string) {
  return value.trim();
}

function calculateRate(value: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((value / total) * 100);
}
