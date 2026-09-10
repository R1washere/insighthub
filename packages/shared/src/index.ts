export type OrganizationRole = "owner" | "member";

export type TrackedEventPayload = {
  event: string;
  userId?: string;
  anonymousId?: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
};

export type DashboardMetric = {
  label: string;
  value: number;
  changePercent?: number;
};

export type AnalyticsSummary = {
  totalEvents: number;
  uniqueUsers: number;
  activationRate: number;
  paidConversions: number;
  changes: {
    totalEvents: number;
    uniqueUsers: number;
    paidConversions: number;
  };
};

export type EventsOverTimePoint = {
  date: string;
  events: number;
  uniqueUsers: number;
};

export type TopEvent = {
  name: string;
  count: number;
};

export type RecentActivityItem = {
  id: string;
  name: string;
  actorId: string | null;
  properties: Record<string, unknown>;
  occurredAt: string;
};

export type EventListItem = {
  id: string;
  name: string;
  actorId: string | null;
  userId: string | null;
  anonymousId: string | null;
  properties: Record<string, unknown>;
  occurredAt: string;
  ingestedAt: string;
};

export type EventListResponse = {
  events: EventListItem[];
  total: number;
};

export type DashboardOverview = {
  summary: AnalyticsSummary;
  eventsOverTime: EventsOverTimePoint[];
  topEvents: TopEvent[];
  recentActivity: RecentActivityItem[];
};

export type FunnelStepDefinition = {
  id: string;
  order: number;
  eventName: string;
};

export type FunnelListItem = {
  id: string;
  name: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  steps: FunnelStepDefinition[];
};

export type FunnelReportStep = FunnelStepDefinition & {
  users: number;
  conversionRate: number;
  dropOffRate: number;
};

export type FunnelReport = {
  funnel: FunnelListItem;
  range: {
    days: number;
    start: string;
    end: string;
  };
  totalUsers: number;
  completedUsers: number;
  overallConversionRate: number;
  steps: FunnelReportStep[];
};

export type ProjectApiKeyListItem = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string | Date;
  lastUsedAt: string | Date | null;
  revokedAt: string | Date | null;
};
