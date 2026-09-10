import Link from "next/link";

import { AppShell } from "../../components/app/app-shell";
import {
  ReportControls,
  buildHref,
} from "../../components/app/report-controls";
import { CreateFunnelForm } from "../../components/funnels/create-funnel-form";
import {
  getEventFilterOptions,
  getFunnelsPageData,
  getProjectOptions,
  getSelectedProject,
  parseDays,
  parseFunnelId,
  resolveProjectId,
} from "../../lib/dashboard-data";

type FunnelsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function FunnelsPage({ searchParams }: FunnelsPageProps) {
  const params = await searchParams;
  const days = parseDays(params?.days);
  const funnelId = parseFunnelId(params?.funnelId);
  const projectOptions = await getProjectOptions();
  const projectId = resolveProjectId(params?.projectId, projectOptions);
  const selectedProject = getSelectedProject(projectId, projectOptions);
  const [{ funnels, report }, eventNames] = await Promise.all([
    getFunnelsPageData({ days, funnelId, projectId }),
    getEventFilterOptions({ days, projectId }),
  ]);

  return (
    <AppShell active="funnels" days={days} project={selectedProject}>
      <header className="page-header">
        <div>
          <p className="eyebrow">{selectedProject.name}</p>
          <h2 className="page-title">Funnels</h2>
          <p className="page-description">
            Build ordered event funnels and understand where users drop during
            activation, onboarding, and conversion over the last {days} days.
          </p>
        </div>
        <div className="header-actions">
          <a className="button secondary-button" href="/tracking">
            Install tracking
          </a>
          <a
            className="button"
            href={buildHref("/events", { days, projectId })}
          >
            View events
          </a>
        </div>
      </header>

      <ReportControls
        action="/funnels"
        days={days}
        projectId={projectId}
        projectOptions={projectOptions}
      />

      <section className="content-grid">
        <article className="panel">
          <h3 className="panel-title">Saved funnels</h3>
          {funnels.length > 0 ? (
            <div className="saved-funnels">
              {funnels.map((funnel) => (
                <Link
                  className={`saved-funnel ${funnel.id === report.funnel.id ? "active" : ""}`}
                  href={buildHref("/funnels", {
                    days,
                    funnelId: funnel.id,
                    projectId,
                  })}
                  key={funnel.id}
                >
                  <div>
                    <p className="saved-funnel-name">{funnel.name}</p>
                    <p className="activity-meta">
                      {funnel.steps.length} steps · updated{" "}
                      {formatShortDate(funnel.updatedAt)}
                    </p>
                  </div>
                  <span className="funnel-completion">Report</span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state compact-empty-state">
              <h3>No funnels yet</h3>
              <p>Create an ordered funnel after events start arriving.</p>
            </div>
          )}
        </article>

        <article className="panel">
          <h3 className="panel-title">Report summary</h3>
          <div className="report-summary-grid">
            <div>
              <p className="metric-label">Started</p>
              <p className="metric-value">
                {report.totalUsers.toLocaleString("en-US")}
              </p>
            </div>
            <div>
              <p className="metric-label">Completed</p>
              <p className="metric-value">
                {report.completedUsers.toLocaleString("en-US")}
              </p>
            </div>
            <div>
              <p className="metric-label">Conversion</p>
              <p className="metric-value">{report.overallConversionRate}%</p>
            </div>
          </div>
        </article>
      </section>

      <section className="panel funnel-builder-panel">
        <div className="panel-heading-row">
          <div>
            <h3 className="panel-title">Create funnel</h3>
            <p className="panel-subtitle">
              Turn raw event names into an ordered conversion report.
            </p>
          </div>
        </div>
        <CreateFunnelForm
          days={days}
          eventNames={eventNames}
          projectId={projectId}
        />
      </section>

      <section className="panel funnel-panel">
        <div className="panel-heading-row">
          <div>
            <h3 className="panel-title">{report.funnel.name}</h3>
            <p className="panel-subtitle">
              Ordered progression over the last {report.range.days} days
            </p>
          </div>
          <div className="funnel-completion">
            {report.overallConversionRate}% conversion
          </div>
        </div>

        <div className="funnel-report-list">
          {report.steps.map((step) => (
            <article className="funnel-report-row" key={step.id}>
              <div className="funnel-step-badge">{step.order}</div>
              <div className="funnel-report-main">
                <div className="top-event-meta">
                  <span className="top-event-name">{step.eventName}</span>
                  <span className="top-event-count">
                    {step.users.toLocaleString("en-US")} users
                  </span>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.max(step.conversionRate, 3)}%` }}
                  />
                </div>
                <p className="funnel-step-meta">
                  {step.conversionRate}% converted from previous step ·{" "}
                  {step.dropOffRate}% drop-off
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}
