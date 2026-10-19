"use client";
import {
  getDashboardOverview,
  getFunnelsPageData,
  type DataRequest,
  type ReportParams,
} from "../../lib/dashboard-data";
import { AppShell } from "../app/app-shell";
import { ReportControls, buildHref } from "../app/report-controls";
import { useReport } from "./use-report";
import { ReportStatus } from "./report-state";
async function loadDashboard(input: DataRequest) {
  const [dashboard, { report: funnelReport }] = await Promise.all([
    getDashboardOverview(input),
    getFunnelsPageData(input),
  ]);
  return { dashboard, funnelReport };
}
export function DashboardReport({ params }: { params: ReportParams }) {
  const state = useReport(params, loadDashboard);
  if (state.status !== "ready")
    return (
      <ReportStatus
        state={state}
        active="dashboard"
        title="Product analytics dashboard"
      />
    );
  const {
    days,
    projectId,
    projectOptions,
    selectedProject,
    preview,
    data: { dashboard, funnelReport },
  } = state;
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
    <AppShell
      active="dashboard"
      days={days}
      project={selectedProject}
      preview={preview}
    >
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
          <a
            className="button secondary-button"
            href={buildHref("/tracking", { projectId })}
          >
            Install tracking
          </a>
          <a
            className="button"
            href={
              preview ? "/login" : buildHref("/events", { projectId, days })
            }
          >
            {preview ? "Sign in" : "View events"}
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
          {dashboard.summary.totalEvents === 0 ? (
            <p className="panel-subtitle">
              No events yet. Send your first event to populate this report.
            </p>
          ) : null}
          <div className="chart" aria-label="Events over time">
            {dashboard.eventsOverTime.map((point) => (
              <div
                className="bar"
                key={point.date}
                style={{
                  height: `${point.events === 0 ? 0 : Math.max((point.events / maxEvents) * 240, 2)}px`,
                }}
                title={`${point.date}: ${point.events} events`}
              />
            ))}
          </div>
        </article>

        <article className="panel">
          <h3 className="panel-title">Recent activity</h3>
          <div className="activity-list">
            {dashboard.recentActivity.length === 0 ? (
              <p>No recent activity.</p>
            ) : null}
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
          {dashboard.topEvents.length === 0 ? (
            <p>No tracked events in this period.</p>
          ) : null}
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

      {funnelReport ? (
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
                    style={{ width: `${step.conversionRate}%` }}
                  />
                </div>
                <p className="funnel-step-meta">
                  {step.conversionRate}% converted, {step.dropOffRate}% dropped
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="panel empty-state">
          <h3>No funnels yet</h3>
          <p>Create a funnel to measure conversion using your own events.</p>
          <a
            className="button"
            href={buildHref("/funnels", { projectId, days })}
          >
            Create funnel
          </a>
        </section>
      )}
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
