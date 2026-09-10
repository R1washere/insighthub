import { AppShell } from "../../components/app/app-shell";
import { OnboardingWizard } from "../../components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <AppShell active="onboarding">
      <header className="page-header">
        <div>
          <p className="eyebrow">Workspace onboarding</p>
          <h2 className="page-title">Create your analytics workspace</h2>
          <p className="page-description">
            Set up an organization, a project, and the first ingestion API key
            in one guided flow.
          </p>
        </div>
      </header>

      <section className="setup-grid">
        <article className="panel setup-card">
          <span className="setup-step">1</span>
          <h3 className="panel-title">Organization</h3>
          <p className="setup-copy">
            Creates the tenant boundary and owner membership for the signed-in
            user.
          </p>
        </article>
        <article className="panel setup-card">
          <span className="setup-step">2</span>
          <h3 className="panel-title">Project</h3>
          <p className="setup-copy">
            Adds an analytics project with its own timezone, events, funnels,
            and credentials.
          </p>
        </article>
        <article className="panel setup-card">
          <span className="setup-step">3</span>
          <h3 className="panel-title">API key</h3>
          <p className="setup-copy">
            Generates the first tracking token and shows it once for secure SDK
            installation.
          </p>
        </article>
      </section>

      <OnboardingWizard />
    </AppShell>
  );
}
