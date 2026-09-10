import { AppShell } from "../../components/app/app-shell";
import {
  ReportControls,
  buildHref,
} from "../../components/app/report-controls";
import {
  getEventFilterOptions,
  getEventsPageData,
  getProjectOptions,
  getSelectedProject,
  parseDays,
  parseEventName,
  resolveProjectId,
} from "../../lib/dashboard-data";

type EventsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function EventsPage({ searchParams }: EventsPageProps) {
  const params = await searchParams;
  const days = parseDays(params?.days);
  const eventName = parseEventName(params?.eventName);
  const projectOptions = await getProjectOptions();
  const projectId = resolveProjectId(params?.projectId, projectOptions);
  const selectedProject = getSelectedProject(projectId, projectOptions);
  const [data, eventNames] = await Promise.all([
    getEventsPageData({ days, eventName, projectId }),
    getEventFilterOptions({ days, projectId }),
  ]);

  return (
    <AppShell active="events" days={days} project={selectedProject}>
      <header className="page-header">
        <div>
          <p className="eyebrow">{selectedProject.name}</p>
          <h2 className="page-title">Tracked product events</h2>
          <p className="page-description">
            Inspect incoming product analytics events, actors, timestamps, and
            JSON properties for the last {days} days.
          </p>
        </div>
        <div className="header-actions">
          <a className="button secondary-button" href="/tracking">
            Tracking setup
          </a>
          <div className="header-stat">
            {data.total.toLocaleString("en-US")}
            <span>events stored</span>
          </div>
        </div>
      </header>

      <ReportControls
        action="/events"
        days={days}
        eventName={eventName}
        projectId={projectId}
        projectOptions={projectOptions}
      />

      <section className="panel toolbar-panel">
        <div className="chip-row">
          <a
            className={`chip ${eventName ? "" : "active"}`}
            href={buildHref("/events", { days, projectId })}
          >
            All events
          </a>
          {eventNames.slice(0, 5).map((optionName) => (
            <a
              className={`chip ${eventName === optionName ? "active" : ""}`}
              href={buildHref("/events", {
                days,
                eventName: optionName,
                projectId,
              })}
              key={optionName}
            >
              {optionName}
            </a>
          ))}
        </div>
      </section>

      <section className="panel table-panel">
        <div className="table-header">
          <span>Event</span>
          <span>Actor</span>
          <span>Properties</span>
          <span>Occurred</span>
        </div>

        {data.events.length > 0 ? (
          <div className="event-list">
            {data.events.map((event) => (
              <article className="event-row" key={event.id}>
                <div>
                  <p className="event-name">{event.name}</p>
                  <p className="event-id">{event.id}</p>
                </div>
                <div className="event-actor">
                  {event.actorId ?? "anonymous"}
                </div>
                <code className="event-properties">
                  {JSON.stringify(event.properties)}
                </code>
                <time className="event-time" dateTime={event.occurredAt}>
                  {formatDateTime(event.occurredAt)}
                </time>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <h3>No events yet</h3>
            <p>
              Install the tracking snippet and send the first product event to
              start filling this explorer.
            </p>
            <a className="button" href="/tracking">
              Open tracking guide
            </a>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
