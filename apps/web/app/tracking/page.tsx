import { AppShell } from "../../components/app/app-shell";

const apiKey = "ihub_demo_taskflow_development_key";

const browserSnippet = `import { InsightHub } from "@insighthub/browser";

const analytics = new InsightHub({
  apiKey: "${apiKey}",
  endpoint: "http://localhost:4000/api/events",
});

analytics.track("workspace_created", {
  userId: "user_4821",
  properties: {
    template: "kanban",
    source: "onboarding",
  },
});`;

const serverSnippet = `await fetch("http://localhost:4000/api/events", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-insighthub-key": process.env.INSIGHTHUB_API_KEY,
  },
  body: JSON.stringify({
    event: "subscription_started",
    userId: "user_7721",
    properties: {
      plan: "pro",
      amount: 29,
    },
  }),
});`;

const curlSnippet = `curl -X POST http://localhost:4000/api/events \\
  -H "content-type: application/json" \\
  -H "x-insighthub-key: ${apiKey}" \\
  -d '{"event":"task_created","userId":"user_123","properties":{"page":"/dashboard"}}'`;

export default function TrackingPage() {
  return (
    <AppShell active="tracking">
      <header className="page-header">
        <div>
          <p className="eyebrow">Developer setup</p>
          <h2 className="page-title">Install product tracking</h2>
          <p className="page-description">
            Connect a SaaS app to InsightHub with a project API key, send
            custom events, and see them appear in the dashboard, event explorer,
            and funnel reports.
          </p>
        </div>
        <div className="header-stat">
          3
          <span>integration paths</span>
        </div>
      </header>

      <section className="setup-grid">
        <article className="panel setup-card">
          <div className="setup-step">1</div>
          <h3 className="panel-title">Create a project API key</h3>
          <p className="setup-copy">
            API keys are scoped to one analytics project. The raw key is shown
            once, then only a SHA-256 hash is stored by the backend.
          </p>
          <code className="key-preview">{apiKey}</code>
        </article>

        <article className="panel setup-card">
          <div className="setup-step">2</div>
          <h3 className="panel-title">Send events from the product</h3>
          <p className="setup-copy">
            Track user actions with a stable event name, a user or anonymous
            actor id, and optional JSON properties.
          </p>
          <div className="event-contract">
            <span>event</span>
            <span>userId or anonymousId</span>
            <span>properties</span>
          </div>
        </article>

        <article className="panel setup-card">
          <div className="setup-step">3</div>
          <h3 className="panel-title">Analyze behavior</h3>
          <p className="setup-copy">
            InsightHub turns raw events into time series, top events, recent
            activity, and ordered conversion funnels.
          </p>
          <a className="button full-width" href="/events">
            Open event explorer
          </a>
        </article>
      </section>

      <section className="panel callout-panel">
        <div>
          <h3 className="panel-title">Manage keys like a production SaaS</h3>
          <p className="panel-subtitle">
            Create scoped project keys, show the raw token once, and keep only
            hashed values in persistence.
          </p>
        </div>
        <a className="button" href="/settings">
          Open API keys
        </a>
      </section>

      <section className="content-grid">
        <article className="panel code-panel">
          <div className="panel-heading-row">
            <div>
              <h3 className="panel-title">Browser SDK example</h3>
              <p className="panel-subtitle">
                The public key can be used from client-side analytics code.
              </p>
            </div>
            <span className="funnel-completion">React</span>
          </div>
          <pre className="code-block">
            <code>{browserSnippet}</code>
          </pre>
        </article>

        <article className="panel code-panel">
          <div className="panel-heading-row">
            <div>
              <h3 className="panel-title">Server-side event</h3>
              <p className="panel-subtitle">
                Server events keep the key in environment variables.
              </p>
            </div>
            <span className="funnel-completion">Node.js</span>
          </div>
          <pre className="code-block">
            <code>{serverSnippet}</code>
          </pre>
        </article>
      </section>

      <section className="panel code-panel tracking-test-panel">
        <div className="panel-heading-row">
          <div>
            <h3 className="panel-title">Smoke-test with curl</h3>
            <p className="panel-subtitle">
              Run this after `pnpm db:setup` and `pnpm dev` to verify ingestion.
            </p>
          </div>
          <a className="button secondary-button" href="/funnels">
            View funnel
          </a>
        </div>
        <pre className="code-block">
          <code>{curlSnippet}</code>
        </pre>
      </section>
    </AppShell>
  );
}
