import {
  getDashboardOverview,
  getDemoFunnelReport,
  getProjectOptions,
  getSelectedProject,
  parseDays,
  resolveProjectId,
} from "../lib/dashboard-data";
import { AppShell } from "../components/app/app-shell";
import { ReportControls } from "../components/app/report-controls";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const days = parseDays(params?.days);
  const projectOptions = await getProjectOptions();
  const projectId = resolveProjectId(params?.projectId, projectOptions);
  const selectedProject = getSelectedProject(projectId, projectOptions);
  const [dashboard, funnelReport] = await Promise.all([
    getDashboardOverview({ days, projectId }),
    getDemoFunnelReport({ days, projectId }),
  ]);
  const maxEvents = Math.max(
    ...dashboard.eventsOverTime.map((point) => point.events),
    1,
  );
  const maxTopEventCount = Math.max(
    ...dashboard.topEvents.map((event) => event.count),
    1,
  );

  const metrics = [
    {
      label: "Total events",
      value: dashboard.summary.totalEvents.toLocaleString("en-US"),
      change: dashboard.summary.changes.totalEvents,
    },
    {
      label: "Unique users",
      value: dashboard.summary.uniqueUsers.toLocaleString("en-US"),
      change: dashboard.summary.changes.uniqueUsers,
    },
    {
      label: "Activation rate",
      value: `${dashboard.summary.activationRate}%`,
      change: undefined,
    },
    {
      label: "Paid conversions",
      value: dashboard.summary.paidConversions.toLocaleString("en-US"),
      change: dashboard.summary.changes.paidConversions,
    },
  ];

  return (
    <AppShell active="dashboard" days={days} project={selectedProject}>
      <header className="page-header">
        <div>
          <p className="eyebrow">{selectedProject.name}</p>
          <h2 className="page-title">Product analytics dashboard</h2>
          <p className="page-description">
            Track onboarding, feature adoption, and conversion events from a
            SaaS product through a clean API and multi-tenant dashboard. Current
            report window: last {days} days.
          </p>
        </div>
        <div className="header-actions">
          <a className="button secondary-button" href="/tracking">
            Install tracking
          </a>
          <a className="button" href="/login">
            Sign in
          </a>
        </div>
      </header>

      <ReportControls
        action="/"
        days={days}
        projectId={projectId}
        projectOptions={projectOptions}
      />

      <section className="metrics-grid" aria-label="Dashboard metrics">
        {metrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <p className="metric-label">{metric.label}</p>
            <p className="metric-value">{metric.value}</p>
            {typeof metric.change === "number" ? (
              <p className="metric-change">
                {metric.change >= 0 ? "+" : ""}
                {metric.change}% vs previous period
              </p>
            ) : (
              <p className="metric-change muted-change">Current period</p>
            )}
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel">
          <h3 className="panel-title">Events over time</h3>
          <div className="chart" aria-label="Bar chart placeholder">
            {dashboard.eventsOverTime.map((point) => (
              <div
                className="bar"
                key={point.date}
                style={{
                  height: `${Math.max((point.events / maxEvents) * 240, 18)}px`,
                }}
                title={`${point.date}: ${point.events} events`}
              />
            ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="panel-title">Recent activity</h3>
          <div className="activity-list">
            {dashboard.recentActivity.map((item) => (
              <div className="activity-item" key={item.id}>
                <div>
                  <p className="activity-name">{item.name}</p>
                  <p className="activity-meta">
                    {item.actorId ?? "anonymous user"}
                  </p>
                </div>
                <span className="activity-time">
                  {formatRelativeTime(item.occurredAt)}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="panel top-events-panel">
        <h3 className="panel-title">Top events</h3>
        <div className="top-events-list">
          {dashboard.topEvents.map((event) => (
            <div className="top-event-row" key={event.name}>
              <div className="top-event-meta">
                <span className="top-event-name">{event.name}</span>
                <span className="top-event-count">
                  {event.count.toLocaleString("en-US")}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.max((event.count / maxTopEventCount) * 100, 3)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel funnel-panel">
        <div className="panel-heading-row">
          <div>
            <h3 className="panel-title">{funnelReport.funnel.name}</h3>
            <p className="panel-subtitle">
              {funnelReport.overallConversionRate}% overall conversion across{" "}
              {funnelReport.range.days} days
            </p>
          </div>
          <div className="funnel-completion">
            {funnelReport.completedUsers.toLocaleString("en-US")} completed
          </div>
        </div>

        <div className="funnel-steps">
          {funnelReport.steps.map((step) => (
            <article className="funnel-step" key={step.id}>
              <div className="funnel-step-header">
                <span>Step {step.order}</span>
                <span>{step.users.toLocaleString("en-US")} users</span>
              </div>
              <h4>{step.eventName}</h4>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.max(step.conversionRate, 3)}%` }}
                />
              </div>
              <p className="funnel-step-meta">
                {step.conversionRate}% converted, {step.dropOffRate}% dropped
              </p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function formatRelativeTime(value: string) {
  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(Math.round(diffMs / 60000), 1);

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.round(diffHours / 24)}d ago`;
}
