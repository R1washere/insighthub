import type {
  DashboardOverview,
  EventListResponse,
  FunnelListItem,
  FunnelReport,
} from "@insighthub/shared";

export type ProjectOption = {
  id: string;
  name: string;
  environment: string;
  timezone: string;
};

export const dateRangeOptions = [7, 30, 90] as const;

type DataRequest = {
  days: number;
  projectId: string;
};

export function parseDays(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  const parsed = Number(rawValue);

  if (dateRangeOptions.includes(parsed as (typeof dateRangeOptions)[number])) {
    return parsed;
  }

  return 30;
}

export function parseEventName(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (!rawValue || rawValue === "all") {
    return undefined;
  }

  return rawValue;
}

export function parseFunnelId(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue || undefined;
}

export async function getProjectOptions(): Promise<ProjectOption[]> {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";
  const accessToken = process.env.DEMO_ACCESS_TOKEN;

  if (!accessToken) {
    return demoProjectOptions;
  }

  try {
    const organizationsResponse = await fetch(`${apiBaseUrl}/organizations`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });

    if (!organizationsResponse.ok) {
      return demoProjectOptions;
    }

    const organizations = (await organizationsResponse.json()) as Array<{
      id: string;
    }>;
    const organizationId = organizations[0]?.id;

    if (!organizationId) {
      return demoProjectOptions;
    }

    const projectsResponse = await fetch(
      `${apiBaseUrl}/organizations/${organizationId}/projects`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!projectsResponse.ok) {
      return demoProjectOptions;
    }

    const projects = (await projectsResponse.json()) as Array<{
      id: string;
      name: string;
      timezone: string;
    }>;

    if (projects.length === 0) {
      return demoProjectOptions;
    }

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      environment: "Production",
      timezone: project.timezone,
    }));
  } catch {
    return demoProjectOptions;
  }
}

export function resolveProjectId(
  value: string | string[] | undefined,
  projectOptions: ProjectOption[],
) {
  const rawValue = Array.isArray(value) ? value[0] : value;

  if (rawValue && projectOptions.some((project) => project.id === rawValue)) {
    return rawValue;
  }

  return (
    process.env.DEMO_PROJECT_ID || projectOptions[0]?.id || "taskflow-prod"
  );
}

export function getSelectedProject(
  projectId: string,
  projectOptions: ProjectOption[],
) {
  return (
    projectOptions.find((project) => project.id === projectId) ??
    projectOptions[0] ??
    demoProjectOptions[0]
  );
}

export async function getDashboardOverview(
  input: DataRequest,
): Promise<DashboardOverview> {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";
  const accessToken = process.env.DEMO_ACCESS_TOKEN;

  if (!accessToken || isDemoProject(input.projectId)) {
    return createDemoDashboardOverview(input);
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/projects/${input.projectId}/analytics/overview?days=${input.days}&limit=8`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return createDemoDashboardOverview(input);
    }

    return response.json();
  } catch {
    return createDemoDashboardOverview(input);
  }
}

export async function getDemoFunnelReport(
  input: DataRequest,
): Promise<FunnelReport> {
  return createDemoFunnelReport(input);
}

export async function getEventsPageData(
  input: DataRequest & { eventName?: string },
): Promise<EventListResponse> {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";
  const accessToken = process.env.DEMO_ACCESS_TOKEN;

  if (!accessToken || isDemoProject(input.projectId)) {
    return createDemoEventsResponse(input);
  }

  try {
    const searchParams = new URLSearchParams({
      limit: "40",
      days: String(input.days),
    });

    if (input.eventName) {
      searchParams.set("eventName", input.eventName);
    }

    const response = await fetch(
      `${apiBaseUrl}/projects/${input.projectId}/events?${searchParams.toString()}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return createDemoEventsResponse(input);
    }

    return response.json();
  } catch {
    return createDemoEventsResponse(input);
  }
}

export async function getEventFilterOptions(
  input: DataRequest,
): Promise<string[]> {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";
  const accessToken = process.env.DEMO_ACCESS_TOKEN;

  if (!accessToken || isDemoProject(input.projectId)) {
    return [...getProjectProfile(input.projectId).topEvents];
  }

  try {
    const response = await fetch(
      `${apiBaseUrl}/projects/${input.projectId}/analytics/top-events?days=${input.days}&limit=8`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return [...getProjectProfile(input.projectId).topEvents];
    }

    const events = (await response.json()) as Array<{ name: string }>;
    return events.map((event) => event.name);
  } catch {
    return [...getProjectProfile(input.projectId).topEvents];
  }
}

export async function getFunnelsPageData(
  input: DataRequest & { funnelId?: string },
): Promise<{
  funnels: FunnelListItem[];
  report: FunnelReport;
}> {
  const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";
  const accessToken = process.env.DEMO_ACCESS_TOKEN;
  const configuredFunnelId = input.funnelId ?? process.env.DEMO_FUNNEL_ID;

  if (!accessToken || isDemoProject(input.projectId)) {
    return {
      funnels: [createDemoFunnelReport(input).funnel],
      report: createDemoFunnelReport(input),
    };
  }

  try {
    const funnelsResponse = await fetch(
      `${apiBaseUrl}/projects/${input.projectId}/funnels`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!funnelsResponse.ok) {
      return {
        funnels: [createDemoFunnelReport(input).funnel],
        report: createDemoFunnelReport(input),
      };
    }

    const funnels = (await funnelsResponse.json()) as FunnelListItem[];
    const funnelId = configuredFunnelId ?? funnels[0]?.id;

    if (!funnelId) {
      return {
        funnels,
        report: createDemoFunnelReport(input),
      };
    }

    const reportResponse = await fetch(
      `${apiBaseUrl}/projects/${input.projectId}/funnels/${funnelId}/report?days=${input.days}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
        cache: "no-store",
      },
    );

    if (!reportResponse.ok) {
      return {
        funnels,
        report: createDemoFunnelReport(input),
      };
    }

    return {
      funnels,
      report: await reportResponse.json(),
    };
  } catch {
    return {
      funnels: [createDemoFunnelReport(input).funnel],
      report: createDemoFunnelReport(input),
    };
  }
}

const demoProjectOptions: ProjectOption[] = [
  {
    id: "taskflow-prod",
    name: "TaskFlow Production",
    environment: "Production",
    timezone: "Europe/Prague",
  },
  {
    id: "taskflow-marketing",
    name: "TaskFlow Marketing",
    environment: "Website",
    timezone: "Europe/Prague",
  },
  {
    id: "taskflow-mobile",
    name: "TaskFlow Mobile",
    environment: "Mobile",
    timezone: "UTC",
  },
];

const projectProfiles = {
  "taskflow-prod": {
    multiplier: 1,
    activationRate: 42,
    paidConversions: 318,
    topEvents: [
      "page_viewed",
      "user_signed_up",
      "workspace_created",
      "task_created",
      "subscription_started",
    ],
  },
  "taskflow-marketing": {
    multiplier: 0.64,
    activationRate: 28,
    paidConversions: 86,
    topEvents: [
      "landing_viewed",
      "pricing_viewed",
      "demo_requested",
      "lead_created",
      "trial_started",
    ],
  },
  "taskflow-mobile": {
    multiplier: 0.48,
    activationRate: 35,
    paidConversions: 112,
    topEvents: [
      "app_opened",
      "push_enabled",
      "workspace_joined",
      "task_completed",
      "subscription_started",
    ],
  },
} as const;

function createDemoDashboardOverview(input: DataRequest): DashboardOverview {
  const profile = getProjectProfile(input.projectId);
  const rangeFactor = input.days / 30;
  const totalEvents = Math.round(18420 * profile.multiplier * rangeFactor);
  const uniqueUsers = Math.round(
    3264 * profile.multiplier * Math.sqrt(rangeFactor),
  );

  return {
    summary: {
      totalEvents,
      uniqueUsers,
      activationRate: profile.activationRate,
      paidConversions: Math.round(profile.paidConversions * rangeFactor),
      changes: {
        totalEvents: Math.round(18 * profile.multiplier),
        uniqueUsers: Math.round(11 * profile.multiplier),
        paidConversions: Math.round(9 * profile.multiplier),
      },
    },
    eventsOverTime: createDemoTimeSeries(input, profile.multiplier),
    topEvents: profile.topEvents.map((name, index) => ({
      name,
      count: Math.max(
        Math.round((4880 - index * 640) * profile.multiplier * rangeFactor),
        32,
      ),
    })),
    recentActivity: createDemoRecentActivity(input.projectId),
  };
}

function createDemoEventsResponse(
  input: DataRequest & { eventName?: string },
): EventListResponse {
  const profile = getProjectProfile(input.projectId);
  const events = baseDemoEvents.map((event, index) => ({
    ...event,
    id: `${input.projectId}_${event.id}`,
    name: profile.topEvents[index % profile.topEvents.length],
  }));
  const filteredEvents = input.eventName
    ? events.filter((event) => event.name === input.eventName)
    : events;
  const totalEvents = Math.round(
    18420 * profile.multiplier * (input.days / 30),
  );

  return {
    total: input.eventName
      ? Math.max(
          Math.round(totalEvents * (filteredEvents.length / events.length)),
          1,
        )
      : totalEvents,
    events: filteredEvents,
  };
}

function createDemoFunnelReport(input: DataRequest): FunnelReport {
  const profile = getProjectProfile(input.projectId);
  const totalUsers = Math.round(3240 * profile.multiplier * (input.days / 30));
  const stepMultipliers = [1, 0.9, 0.75, 0.75, profile.paidConversions / 3240];
  const steps = profile.topEvents.slice(0, 5).map((eventName, index) => {
    const users = Math.max(Math.round(totalUsers * stepMultipliers[index]), 1);
    const previousUsers =
      index === 0
        ? users
        : Math.max(Math.round(totalUsers * stepMultipliers[index - 1]), 1);
    const conversionRate =
      index === 0 ? 100 : Math.round((users / previousUsers) * 100);

    return {
      id: `${input.projectId}_step_${index + 1}`,
      order: index + 1,
      eventName,
      users,
      conversionRate,
      dropOffRate: 100 - conversionRate,
    };
  });
  const completedUsers = steps[steps.length - 1]?.users ?? 0;

  return {
    funnel: {
      id: `${input.projectId}_activation_funnel`,
      name: "SaaS activation funnel",
      projectId: input.projectId,
      createdAt: "2026-08-01T09:00:00.000Z",
      updatedAt: new Date().toISOString(),
      steps: steps.map(({ id, order, eventName }) => ({
        id,
        order,
        eventName,
      })),
    },
    range: {
      days: input.days,
      start: createRangeStart(input.days),
      end: new Date().toISOString(),
    },
    totalUsers,
    completedUsers,
    overallConversionRate: totalUsers
      ? Math.round((completedUsers / totalUsers) * 100)
      : 0,
    steps,
  };
}

function createDemoTimeSeries(input: DataRequest, multiplier: number) {
  const dates = createDateKeys(input.days);

  return dates.map((date, index) => {
    const wave = 0.72 + (index % 7) * 0.08;
    const events = Math.round((110 + index * 4) * multiplier * wave);

    return {
      date,
      events,
      uniqueUsers: Math.max(Math.round(events * 0.46), 1),
    };
  });
}

function createDemoRecentActivity(projectId: string) {
  const profile = getProjectProfile(projectId);

  return demoRecentActivity.map((item, index) => ({
    ...item,
    id: `${projectId}_${item.id}`,
    name: profile.topEvents[index % profile.topEvents.length],
  }));
}

function createDateKeys(days: number) {
  const dates: string[] = [];
  const current = new Date();
  current.setDate(current.getDate() - days + 1);
  current.setHours(0, 0, 0, 0);

  for (let index = 0; index < days; index += 1) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function createRangeStart(days: number) {
  const start = new Date();
  start.setDate(start.getDate() - days + 1);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

function getProjectProfile(projectId: string) {
  return (
    projectProfiles[projectId as keyof typeof projectProfiles] ??
    projectProfiles["taskflow-prod"]
  );
}

function isDemoProject(projectId: string) {
  return demoProjectOptions.some((project) => project.id === projectId);
}

const demoRecentActivity: DashboardOverview["recentActivity"] = [
  {
    id: "evt_demo_1",
    name: "workspace_created",
    actorId: "user_4821",
    properties: { template: "kanban" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
  },
  {
    id: "evt_demo_2",
    name: "invite_sent",
    actorId: "user_1934",
    properties: { inviteCount: 2 },
    occurredAt: new Date(Date.now() - 1000 * 60 * 6).toISOString(),
  },
  {
    id: "evt_demo_3",
    name: "subscription_started",
    actorId: "user_7721",
    properties: { plan: "pro", amount: 29 },
    occurredAt: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
  },
  {
    id: "evt_demo_4",
    name: "task_created",
    actorId: "user_2840",
    properties: { priority: "high" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 21).toISOString(),
  },
];

const baseDemoEvents: EventListResponse["events"] = [
  {
    id: "evt_1001",
    name: "subscription_started",
    actorId: "user_7721",
    userId: "user_7721",
    anonymousId: null,
    properties: { plan: "pro", amount: 29, source: "organic" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
    ingestedAt: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
  },
  {
    id: "evt_1002",
    name: "task_created",
    actorId: "user_2840",
    userId: "user_2840",
    anonymousId: null,
    properties: { priority: "high", page: "/projects/acme" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
    ingestedAt: new Date(Date.now() - 1000 * 60 * 11).toISOString(),
  },
  {
    id: "evt_1003",
    name: "invite_sent",
    actorId: "user_1934",
    userId: "user_1934",
    anonymousId: null,
    properties: { inviteCount: 2 },
    occurredAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    ingestedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: "evt_1004",
    name: "workspace_created",
    actorId: "user_4821",
    userId: "user_4821",
    anonymousId: null,
    properties: { template: "kanban" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
    ingestedAt: new Date(Date.now() - 1000 * 60 * 26).toISOString(),
  },
  {
    id: "evt_1005",
    name: "user_signed_up",
    actorId: "user_4821",
    userId: "user_4821",
    anonymousId: null,
    properties: { plan: "free", source: "paid_search" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
    ingestedAt: new Date(Date.now() - 1000 * 60 * 34).toISOString(),
  },
  {
    id: "evt_1006",
    name: "pricing_viewed",
    actorId: "anon_9981",
    userId: null,
    anonymousId: "anon_9981",
    properties: { page: "/pricing", source: "twitter" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
    ingestedAt: new Date(Date.now() - 1000 * 60 * 47).toISOString(),
  },
  {
    id: "evt_1007",
    name: "page_viewed",
    actorId: "anon_9920",
    userId: null,
    anonymousId: "anon_9920",
    properties: { page: "/", source: "referral" },
    occurredAt: new Date(Date.now() - 1000 * 60 * 61).toISOString(),
    ingestedAt: new Date(Date.now() - 1000 * 60 * 61).toISOString(),
  },
];
