"use client";

import Link from "next/link";
import { AppShell } from "../app/app-shell";
import type { ReportState } from "./use-report";

export function ReportStatus({
  state,
  active,
  title,
}: {
  state: Exclude<ReportState<unknown>, { status: "ready" }>;
  active: "dashboard" | "events" | "funnels";
  title: string;
}) {
  return (
    <AppShell active={active}>
      <header className="page-header">
        <h2 className="page-title">{title}</h2>
      </header>
      <section
        className="panel empty-state"
        role={state.status === "error" ? "alert" : "status"}
      >
        <h3>
          {state.status === "loading"
            ? "Loading your reports"
            : state.status === "empty"
              ? "Create your first project"
              : state.expired
                ? "Session expired"
                : "Report unavailable"}
        </h3>
        <p>
          {state.status === "loading"
            ? "Connecting to your workspace. A sleeping free server can take about a minute to respond."
            : state.status === "empty"
              ? "Your account has no projects yet. Create a workspace to start collecting events."
              : state.expired
                ? "Sign in again to continue. No sample data has been substituted."
                : state.message}
        </p>
        {state.status === "empty" ? (
          <Link className="button" href="/onboarding">
            Create workspace
          </Link>
        ) : state.status === "error" ? (
          <>
            <Link className="button" href={state.expired ? "/login" : "/"}>
              {state.expired ? "Sign in" : "Open dashboard"}
            </Link>
            <button
              className="button secondary-button"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </>
        ) : null}
      </section>
    </AppShell>
  );
}
