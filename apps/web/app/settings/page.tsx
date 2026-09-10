import { AppShell } from "../../components/app/app-shell";
import { ApiKeysManager } from "../../components/settings/api-keys-manager";

export default function SettingsPage() {
  return (
    <AppShell active="settings">
      <header className="page-header">
        <div>
          <p className="eyebrow">Project settings</p>
          <h2 className="page-title">API keys</h2>
          <p className="page-description">
            Manage ingestion credentials for the TaskFlow demo project. New raw
            keys are revealed once, while the backend stores only the hashed
            version.
          </p>
        </div>
        <a className="button secondary-button" href="/tracking">
          Tracking docs
        </a>
      </header>

      <ApiKeysManager />
    </AppShell>
  );
}
