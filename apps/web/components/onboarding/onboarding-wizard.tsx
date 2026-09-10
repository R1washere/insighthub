"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  clearAuthSession,
  getStoredAccessToken,
  storeAuthSession,
} from "../../lib/demo-auth";
import { type AuthResponse, requestApi } from "../../lib/api-client";

type Organization = {
  id: string;
  name: string;
  slug: string;
};

type CreateProjectResponse = {
  project: {
    id: string;
    name: string;
    slug: string;
    timezone: string;
  };
  apiKey: string;
};

type OnboardingState =
  | { status: "checking-session" }
  | { status: "missing-token" }
  | { status: "ready" }
  | { status: "creating" }
  | { status: "error"; message: string }
  | {
      status: "complete";
      organization: Organization;
      project: CreateProjectResponse["project"];
      apiKey: string;
    };

export function OnboardingWizard() {
  const [state, setState] = useState<OnboardingState>({
    status: "checking-session",
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void validateSession();

    window.addEventListener("insighthub:auth-session-changed", validateSession);
    return () => {
      window.removeEventListener(
        "insighthub:auth-session-changed",
        validateSession,
      );
    };
  }, []);

  async function validateSession() {
    const accessToken = getStoredAccessToken();

    if (!accessToken) {
      setState({ status: "missing-token" });
      return;
    }

    try {
      const user = await requestApi<AuthResponse["user"]>("/auth/me", {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      });

      storeAuthSession(
        {
          accessToken,
          user,
        },
        { notify: false },
      );
      setState({ status: "ready" });
    } catch {
      clearAuthSession({ notify: false });
      setState({ status: "missing-token" });
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const accessToken = localStorage.getItem("insighthub.accessToken");

    if (!accessToken) {
      setState({ status: "missing-token" });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const organizationName = String(
      formData.get("organizationName") ?? "",
    ).trim();
    const projectName = String(formData.get("projectName") ?? "").trim();
    const timezone = String(formData.get("timezone") ?? "UTC").trim();

    if (organizationName.length < 2 || projectName.length < 2) {
      setState({
        status: "error",
        message:
          "Organization and project names must be at least 2 characters.",
      });
      return;
    }

    setState({ status: "creating" });
    setCopied(false);

    try {
      const authHeaders = {
        authorization: `Bearer ${accessToken}`,
      };
      const organization = await requestApi<Organization>("/organizations", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ name: organizationName }),
      });
      const projectResult = await requestApi<CreateProjectResponse>(
        `/organizations/${organization.id}/projects`,
        {
          method: "POST",
          headers: authHeaders,
          body: JSON.stringify({ name: projectName, timezone }),
        },
      );

      localStorage.setItem("insighthub.projectId", projectResult.project.id);
      localStorage.setItem("insighthub.projectApiKey", projectResult.apiKey);

      setState({
        status: "complete",
        organization,
        project: projectResult.project,
        apiKey: projectResult.apiKey,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create workspace";

      if (message.toLowerCase().includes("token")) {
        clearAuthSession();
        setState({ status: "missing-token" });
        return;
      }

      setState({
        status: "error",
        message,
      });
    }
  }

  async function copyApiKey(apiKey: string) {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
  }

  if (state.status === "checking-session") {
    return (
      <section className="panel empty-state">
        <h3>Checking session</h3>
        <p>Looking for the JWT saved by the login or registration flow.</p>
      </section>
    );
  }

  if (state.status === "missing-token") {
    return (
      <section className="panel empty-state">
        <h3>Sign in first</h3>
        <p>
          Onboarding creates organization, project, and API key records through
          protected NestJS endpoints.
        </p>
        <Link className="button" href="/login">
          Open demo login
        </Link>
      </section>
    );
  }

  if (state.status === "complete") {
    return (
      <section className="panel onboarding-complete">
        <div>
          <p className="eyebrow">Workspace ready</p>
          <h3 className="panel-title">{state.project.name}</h3>
          <p className="setup-copy">
            {state.organization.name} / {state.project.slug} /{" "}
            {state.project.timezone}
          </p>
        </div>

        <div className="token-reveal">
          <div>
            <p className="token-reveal-title">Project API key</p>
            <p className="token-reveal-copy">
              This raw token is shown once. The backend keeps only its hash.
            </p>
          </div>
          <code>{state.apiKey}</code>
          <button
            className="button secondary-button"
            onClick={() => void copyApiKey(state.apiKey)}
            type="button"
          >
            {copied ? "Copied" : "Copy API key"}
          </button>
        </div>

        <div className="onboarding-actions">
          <Link className="button" href="/tracking">
            Install tracking
          </Link>
          <Link className="button secondary-button" href="/settings">
            Manage API keys
          </Link>
          <Link className="button secondary-button" href="/funnels">
            Build funnels
          </Link>
        </div>
      </section>
    );
  }

  const errorMessage = state.status === "error" ? state.message : null;

  return (
    <section className="panel onboarding-panel">
      <form className="onboarding-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Organization name</span>
          <input
            name="organizationName"
            type="text"
            minLength={2}
            maxLength={80}
            defaultValue="Acme SaaS"
            required
          />
        </label>

        <label className="field">
          <span>Project name</span>
          <input
            name="projectName"
            type="text"
            minLength={2}
            maxLength={80}
            defaultValue="Production"
            required
          />
        </label>

        <label className="field">
          <span>Timezone</span>
          <select name="timezone" defaultValue="Europe/Prague">
            <option value="Europe/Prague">Europe/Prague</option>
            <option value="UTC">UTC</option>
            <option value="Europe/Berlin">Europe/Berlin</option>
            <option value="America/New_York">America/New_York</option>
          </select>
        </label>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <button
          className="button full-width"
          disabled={state.status === "creating"}
        >
          {state.status === "creating"
            ? "Creating workspace..."
            : "Create workspace"}
        </button>
      </form>
    </section>
  );
}
