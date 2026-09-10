import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

const demoUser = {
  email: "demo@insighthub.dev",
  name: "Demo User",
  password: "password123",
};

const demoOrganization = {
  name: "Acme SaaS",
  slug: "acme-saas",
};

const demoProject = {
  name: "TaskFlow Production",
  slug: "taskflow-production",
  timezone: "Europe/Prague",
};

const demoApiKey = "ihub_demo_taskflow_development_key";

type DemoEvent = {
  projectId: string;
  name: string;
  userId?: string;
  anonymousId?: string;
  properties: string;
  occurredAt: Date;
  ingestedAt: Date;
};

async function main() {
  const passwordHash = await argon2.hash(demoUser.password);

  const user = await prisma.user.upsert({
    where: {
      email: demoUser.email,
    },
    update: {
      name: demoUser.name,
      passwordHash,
    },
    create: {
      email: demoUser.email,
      name: demoUser.name,
      passwordHash,
    },
  });

  const organization = await prisma.organization.upsert({
    where: {
      slug: demoOrganization.slug,
    },
    update: {
      name: demoOrganization.name,
    },
    create: {
      name: demoOrganization.name,
      slug: demoOrganization.slug,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      role: "owner",
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "owner",
    },
  });

  const project = await prisma.project.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: demoProject.slug,
      },
    },
    update: {
      name: demoProject.name,
      timezone: demoProject.timezone,
    },
    create: {
      organizationId: organization.id,
      name: demoProject.name,
      slug: demoProject.slug,
      timezone: demoProject.timezone,
    },
  });

  await prisma.projectApiKey.upsert({
    where: {
      keyHash: hashApiKey(demoApiKey),
    },
    update: {
      name: "Demo tracking key",
      revokedAt: null,
    },
    create: {
      projectId: project.id,
      name: "Demo tracking key",
      keyHash: hashApiKey(demoApiKey),
      prefix: demoApiKey.slice(0, 12),
    },
  });

  await prisma.event.deleteMany({
    where: {
      projectId: project.id,
    },
  });

  await prisma.funnel.deleteMany({
    where: {
      projectId: project.id,
    },
  });

  const events = createDemoEvents(project.id);

  await prisma.event.createMany({
    data: events,
  });

  await prisma.funnel.create({
    data: {
      projectId: project.id,
      createdById: user.id,
      name: "SaaS activation funnel",
      steps: {
        create: [
          { order: 1, eventName: "user_signed_up" },
          { order: 2, eventName: "workspace_created" },
          { order: 3, eventName: "project_created" },
          { order: 4, eventName: "task_created" },
          { order: 5, eventName: "subscription_started" },
        ],
      },
    },
  });

  console.log("Seed completed");
  console.log(`Demo login: ${demoUser.email} / ${demoUser.password}`);
  console.log(`Demo organization ID: ${organization.id}`);
  console.log(`Demo project ID: ${project.id}`);
  console.log(`Demo project API key: ${demoApiKey}`);
  console.log(`Created ${events.length} events for ${demoProject.name}`);
}

function createDemoEvents(projectId: string) {
  const now = new Date();
  const events: DemoEvent[] = [];

  for (let dayOffset = 29; dayOffset >= 0; dayOffset -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - dayOffset);
    day.setHours(9, 0, 0, 0);

    const signups =
      8 + ((30 - dayOffset) % 7) + Math.floor((30 - dayOffset) / 5);

    for (let index = 0; index < signups; index += 1) {
      const userNumber = dayOffset * 100 + index;
      const userId = `user_${userNumber}`;
      const anonymousId = `anon_${userNumber}`;
      const plan = index % 4 === 0 ? "pro" : "free";
      const source = ["organic", "paid_search", "twitter", "referral"][
        index % 4
      ];

      pushEvent(
        events,
        projectId,
        "page_viewed",
        day,
        index,
        anonymousId,
        undefined,
        {
          page: "/",
          source,
        },
      );
      pushEvent(
        events,
        projectId,
        "pricing_viewed",
        day,
        index + 1,
        anonymousId,
        undefined,
        {
          source,
        },
      );
      pushEvent(
        events,
        projectId,
        "user_signed_up",
        day,
        index + 2,
        undefined,
        userId,
        {
          plan,
          source,
        },
      );

      if (index % 10 !== 0) {
        pushEvent(
          events,
          projectId,
          "workspace_created",
          day,
          index + 3,
          undefined,
          userId,
          {
            template: index % 2 === 0 ? "kanban" : "blank",
          },
        );
      }

      if (index % 4 !== 0) {
        pushEvent(
          events,
          projectId,
          "project_created",
          day,
          index + 4,
          undefined,
          userId,
          {
            projectType: index % 2 === 0 ? "team" : "personal",
          },
        );
        pushEvent(
          events,
          projectId,
          "task_created",
          day,
          index + 5,
          undefined,
          userId,
          {
            priority: ["low", "medium", "high"][index % 3],
          },
        );
      }

      if (index % 3 === 0) {
        pushEvent(
          events,
          projectId,
          "invite_sent",
          day,
          index + 6,
          undefined,
          userId,
          {
            inviteCount: 1 + (index % 3),
          },
        );
      }

      if (index % 6 === 0) {
        pushEvent(
          events,
          projectId,
          "subscription_started",
          day,
          index + 8,
          undefined,
          userId,
          {
            plan: "pro",
            amount: 29,
          },
        );
      }
    }
  }

  return events;
}

function pushEvent(
  events: DemoEvent[],
  projectId: string,
  name: string,
  day: Date,
  minuteOffset: number,
  anonymousId: string | undefined,
  userId: string | undefined,
  properties: Record<string, string | number | boolean>,
) {
  const occurredAt = new Date(day);
  occurredAt.setMinutes(day.getMinutes() + minuteOffset * 7);

  events.push({
    projectId,
    name,
    userId,
    anonymousId,
    properties: JSON.stringify(properties),
    occurredAt,
    ingestedAt: occurredAt,
  });
}

function hashApiKey(rawKey: string) {
  return createHash("sha256").update(rawKey).digest("hex");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
