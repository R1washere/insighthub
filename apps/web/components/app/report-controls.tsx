import Link from "next/link";

import { dateRangeOptions, type ProjectOption } from "../../lib/dashboard-data";

type ReportControlsProps = {
  action: string;
  days: number;
  eventName?: string;
  projectId: string;
  projectOptions: ProjectOption[];
};

export function ReportControls({
  action,
  days,
  eventName,
  projectId,
  projectOptions,
}: ReportControlsProps) {
  return (
    <section className="panel report-controls" aria-label="Report controls">
      <form className="report-project-form" action={action} method="get">
        <label className="control-label" htmlFor="projectId">
          Project
        </label>
        <select
          className="control-select"
          defaultValue={projectId}
          id="projectId"
          name="projectId"
        >
          {projectOptions.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <input name="days" type="hidden" value={days} />
        {eventName ? (
          <input name="eventName" type="hidden" value={eventName} />
        ) : null}
        <button
          className="button secondary-button compact-button"
          type="submit"
        >
          Apply
        </button>
      </form>

      <div className="range-tabs" aria-label="Date range">
        {dateRangeOptions.map((option) => (
          <Link
            className={`range-tab ${option === days ? "active" : ""}`}
            href={buildHref(action, { days: option, eventName, projectId })}
            key={option}
          >
            {option}d
          </Link>
        ))}
      </div>
    </section>
  );
}

export function buildHref(
  pathname: string,
  params: {
    days?: number;
    eventName?: string;
    funnelId?: string;
    projectId?: string;
  },
) {
  const searchParams = new URLSearchParams();

  if (params.projectId) {
    searchParams.set("projectId", params.projectId);
  }

  if (params.days) {
    searchParams.set("days", String(params.days));
  }

  if (params.eventName) {
    searchParams.set("eventName", params.eventName);
  }

  if (params.funnelId) {
    searchParams.set("funnelId", params.funnelId);
  }

  const queryString = searchParams.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}
