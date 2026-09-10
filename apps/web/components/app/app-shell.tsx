import Link from "next/link";
import type { ReactNode } from "react";

import { SessionStatus } from "../auth/session-status";
import { buildHref } from "./report-controls";
import type { ProjectOption } from "../../lib/dashboard-data";

type AppShellProps = {
  active:
    "dashboard" | "events" | "funnels" | "onboarding" | "tracking" | "settings";
  children: ReactNode;
  days?: number;
  project?: ProjectOption;
};

const navItems = [
  { label: "Dashboard", href: "/", value: "dashboard" },
  { label: "Events", href: "/events", value: "events" },
  { label: "Funnels", href: "/funnels", value: "funnels" },
  { label: "Onboarding", href: "/onboarding", value: "onboarding" },
  { label: "Tracking", href: "/tracking", value: "tracking" },
  { label: "Settings", href: "/settings", value: "settings" },
] as const;

const defaultProject: ProjectOption = {
  id: "taskflow-prod",
  name: "TaskFlow Production",
  environment: "Production",
  timezone: "Europe/Prague",
};

export function AppShell({ active, children, days, project }: AppShellProps) {
  const currentProject = project ?? defaultProject;

  return (
    <div className="shell">
      <aside className="sidebar">
        <Link
          className="brand-link"
          href={buildHref("/", { days, projectId: currentProject.id })}
        >
          <h1 className="brand-title">InsightHub</h1>
          <p className="brand-subtitle">Product analytics for SaaS teams</p>
        </Link>

        <section className="project-context" aria-label="Current project">
          <p className="project-context-label">Current project</p>
          <div className="project-context-card">
            <div>
              <p className="project-context-name">{currentProject.name}</p>
              <p className="project-context-meta">
                {currentProject.environment} / {currentProject.timezone}
              </p>
            </div>
            <span className="status-pill">Live</span>
          </div>
        </section>

        <nav className="nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <Link
              className={`nav-item ${item.value === active ? "active" : ""}`}
              href={buildHref(item.href, {
                days: ["dashboard", "events", "funnels"].includes(item.value)
                  ? days
                  : undefined,
                projectId: currentProject.id,
              })}
              key={item.value}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <p>Demo workspace</p>
          <span>SQLite · seeded analytics data</span>
        </div>

        <SessionStatus />
      </aside>

      <main className="main">{children}</main>
    </div>
  );
}
