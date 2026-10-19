import { AppShell } from "../../components/app/app-shell";
import { ApiKeysManager } from "../../components/settings/api-keys-manager";
import { firstParam, type ReportParams } from "../../lib/dashboard-data";
import { buildHref } from "../../components/app/report-controls";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<ReportParams>;
}) {
  const projectId = firstParam((await searchParams)?.projectId);
  return (
    <AppShell active="settings" requestedProjectId={projectId}>
      <header className="page-header">
        <div>
          <p className="eyebrow">Project settings</p>
          <h2 className="page-title">API keys</h2>
          <p className="page-description">
            Manage ingestion credentials for your selected project. New raw keys
            are revealed once, while the backend stores only the hashed version.
          </p>
        </div>
        <a
          className="button secondary-button"
          href={buildHref("/tracking", { projectId })}
        >
          Tracking docs
        </a>
      </header>

      <ApiKeysManager requestedProjectId={projectId} />
    </AppShell>
  );
}
