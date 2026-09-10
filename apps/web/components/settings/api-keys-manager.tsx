"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ProjectApiKeyListItem } from "@insighthub/shared";
import { requestApi } from "../../lib/api-client";

type Organization = {
  id: string;
  name: string;
};

type ProjectSummary = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  _count?: {
    apiKeys: number;
    events: number;
    funnels: number;
  };
};

type ProjectDetails = ProjectSummary & {
  apiKeys: ProjectApiKeyListItem[];
};

type CreateApiKeyResponse = {
  apiKey: ProjectApiKeyListItem;
  token: string;
};

type LoadState =
  | { status: "loading" }
  | { status: "missing-token" }
  | { status: "empty" }
  | {
      status: "ready";
      organization: Organization;
      project: ProjectDetails;
    }
  | { status: "error"; message: string };

export function ApiKeysManager() {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [revokingKeyId, setRevokingKeyId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void loadProject();
  }, []);

  const activeKeys = useMemo(() => {
    if (state.status !== "ready") {
      return [];
    }

    return state.project.apiKeys.filter((key) => !key.revokedAt);
  }, [state]);

  const projectCounts =
    state.status === "ready"
      ? {
          apiKeys: state.project._count?.apiKeys ?? state.project.apiKeys.length,
          events: state.project._count?.events ?? 0,
          funnels: state.project._count?.funnels ?? 0,
        }
      : null;

  async function loadProject() {
    const accessToken = localStorage.getItem("insighthub.accessToken");

    if (!accessToken) {
      setState({ status: "missing-token" });
      return;
    }

    try {
      setState({ status: "loading" });

      const authHeaders = {
        authorization: `Bearer ${accessToken}`,
      };
      const organizations = await requestApi<Organization[]>("/organizations", {
        headers: authHeaders,
      });
      const organization = organizations[0];

      if (!organization) {
        setState({ status: "empty" });
        return;
      }

      const projects = await requestApi<ProjectSummary[]>(
        `/organizations/${organization.id}/projects`,
        {
          headers: authHeaders,
        },
      );
      const project = projects[0];

      if (!project) {
        setState({ status: "empty" });
        return;
      }

      const projectDetails = await requestApi<ProjectDetails>(
        `/projects/${project.id}`,
        {
          headers: authHeaders,
        },
      );

      setState({
        status: "ready",
        organization,
        project: projectDetails,
      });
    } catch (error) {
      setState({
        status: "error",
        message:
          error instanceof Error ? error.message : "Unable to load settings",
      });
    }
  }

  async function handleCreateKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;

    if (state.status !== "ready") {
      return;
    }

    const accessToken = localStorage.getItem("insighthub.accessToken");

    if (!accessToken) {
      setState({ status: "missing-token" });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const keyName = String(formData.get("name") ?? "").trim();

    if (!keyName) {
      setCreateError("Key name is required");
      return;
    }

    setCreateError(null);
    setCopied(false);
    setIsCreating(true);

    try {
      const result = await requestApi<CreateApiKeyResponse>(
        `/projects/${state.project.id}/api-keys`,
        {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ name: keyName }),
        },
      );

      form.reset();
      setCreatedToken(result.token);
      setState({
        status: "ready",
        organization: state.organization,
        project: {
          ...state.project,
          apiKeys: [...state.project.apiKeys, result.apiKey],
          _count: {
            events: state.project._count?.events ?? 0,
            funnels: state.project._count?.funnels ?? 0,
            apiKeys:
              (state.project._count?.apiKeys ?? state.project.apiKeys.length) +
              1,
          },
        },
      });
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Unable to create API key",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function copyCreatedToken() {
    if (!createdToken) {
      return;
    }

    await navigator.clipboard.writeText(createdToken);
    setCopied(true);
  }

  async function revokeKey(apiKeyId: string) {
    if (state.status !== "ready") {
      return;
    }

    const accessToken = localStorage.getItem("insighthub.accessToken");

    if (!accessToken) {
      setState({ status: "missing-token" });
      return;
    }

    setCreateError(null);
    setRevokingKeyId(apiKeyId);

    try {
      const revokedKey = await requestApi<ProjectApiKeyListItem>(
        `/projects/${state.project.id}/api-keys/${apiKeyId}`,
        {
          method: "DELETE",
          headers: {
            authorization: `Bearer ${accessToken}`,
          },
        },
      );

      setState({
        status: "ready",
        organization: state.organization,
        project: {
          ...state.project,
          apiKeys: state.project.apiKeys.map((key) =>
            key.id === apiKeyId ? revokedKey : key,
          ),
        },
      });
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Unable to revoke API key",
      );
    } finally {
      setRevokingKeyId(null);
    }
  }

  if (state.status === "loading") {
    return (
      <section className="panel empty-state">
        <h3>Loading project settings</h3>
        <p>Fetching organizations, projects, and API key metadata.</p>
      </section>
    );
  }

  if (state.status === "missing-token") {
    return (
      <section className="panel empty-state">
        <h3>Sign in to manage API keys</h3>
        <p>
          The settings screen uses the JWT access token saved by the demo login
          flow.
        </p>
        <a className="button" href="/login">
          Sign in
        </a>
      </section>
    );
  }

  if (state.status === "empty") {
    return (
      <section className="panel empty-state">
        <h3>No project found</h3>
        <p>Create an organization and analytics project before issuing keys.</p>
      </section>
    );
  }

  if (state.status === "error") {
    return (
      <section className="panel empty-state">
        <h3>Unable to load settings</h3>
        <p>{state.message}</p>
        <button className="button" onClick={() => void loadProject()}>
          Retry
        </button>
      </section>
    );
  }

  const counts = projectCounts ?? {
    apiKeys: state.project.apiKeys.length,
    events: 0,
    funnels: 0,
  };

  return (
    <div className="settings-layout">
      <section className="panel">
        <div className="panel-heading-row">
          <div>
            <h3 className="panel-title">{state.project.name}</h3>
            <p className="panel-subtitle">
              {state.organization.name} / {state.project.slug} /{" "}
              {state.project.timezone}
            </p>
          </div>
          <span className="funnel-completion">{activeKeys.length} active</span>
        </div>

        <div className="settings-stats">
          <div>
            <p className="metric-label">Events</p>
            <p className="metric-value">
              {counts.events.toLocaleString("en-US")}
            </p>
          </div>
          <div>
            <p className="metric-label">Funnels</p>
            <p className="metric-value">{counts.funnels}</p>
          </div>
          <div>
            <p className="metric-label">API keys</p>
            <p className="metric-value">{counts.apiKeys}</p>
          </div>
        </div>

        <form className="api-key-form" onSubmit={handleCreateKey}>
          <label className="field">
            <span>New key name</span>
            <input
              name="name"
              type="text"
              minLength={2}
              maxLength={80}
              placeholder="Frontend tracking key"
              required
            />
          </label>
          {createError ? <p className="form-error">{createError}</p> : null}
          <button className="button" disabled={isCreating} type="submit">
            {isCreating ? "Creating..." : "Create API key"}
          </button>
        </form>

        {createdToken ? (
          <div className="token-reveal">
            <div>
              <p className="token-reveal-title">New raw key</p>
              <p className="token-reveal-copy">
                Save it now. InsightHub will not show this token again.
              </p>
            </div>
            <code>{createdToken}</code>
            <button
              className="button secondary-button"
              onClick={() => void copyCreatedToken()}
              type="button"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        ) : null}
      </section>

      <section className="panel table-panel api-keys-panel">
        <div className="table-header api-keys-header">
          <span>Name</span>
          <span>Prefix</span>
          <span>Created</span>
          <span>Last used</span>
          <span>Status</span>
          <span>Action</span>
        </div>
        <div className="event-list">
          {state.project.apiKeys.map((key) => {
            const isLastActiveKey = !key.revokedAt && activeKeys.length <= 1;
            const isRevoking = revokingKeyId === key.id;

            return (
              <article className="event-row api-key-row" key={key.id}>
                <div>
                  <p className="event-name">{key.name}</p>
                  <p className="event-id">{key.id}</p>
                </div>
                <code className="event-properties">{key.prefix}</code>
                <time className="event-time" dateTime={String(key.createdAt)}>
                  {formatDateTime(key.createdAt)}
                </time>
                <span className="event-time">
                  {key.lastUsedAt ? formatDateTime(key.lastUsedAt) : "Never"}
                </span>
                <span
                  className={`status-pill ${key.revokedAt ? "revoked-pill" : ""}`}
                >
                  {key.revokedAt ? "Revoked" : "Active"}
                </span>
                <button
                  className="table-action danger-action"
                  disabled={Boolean(key.revokedAt) || isLastActiveKey || isRevoking}
                  onClick={() => void revokeKey(key.id)}
                  title={
                    isLastActiveKey
                      ? "Create another active key before revoking this one"
                      : undefined
                  }
                  type="button"
                >
                  {isRevoking ? "Revoking..." : "Revoke"}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function formatDateTime(value: string | Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
