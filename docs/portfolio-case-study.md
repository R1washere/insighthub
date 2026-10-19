# InsightHub — Full-Stack Product Analytics

[Live demo](https://project-2dut5.vercel.app/) ·
[Source code](https://github.com/R1washere/insighthub) ·
[Reviewer guide](reviewer-guide.md)

## Problem

A SaaS team needs to understand what users do after signup: which features they
use, where onboarding stalls, and how many reach a conversion event. InsightHub
demonstrates that workflow, from collecting an event to inspecting its report.
This is a personal portfolio project, not a paid client engagement.

## Implementation

- **Frontend:** Next.js, React and TypeScript dashboard with project switching,
  date windows, event filters and saved funnel reports.
- **Backend:** NestJS REST API for authentication, organizations, projects,
  ingestion keys, event collection and analytics.
- **Data:** PostgreSQL and Prisma migrations, with organization membership and
  project-scoped authorization for private reports.
- **Integration:** a browser SDK with identification, event queueing, retries
  and explicit flushing, plus copyable tracking examples.
- **Delivery:** pnpm monorepo, CI verification, and a deployed frontend/API/database
  on Vercel, Render and Neon.

## Decisions That Matter

**Preview without a shared private account.** Guests can explore clearly labeled
synthetic reports immediately. Registered users see only their own workspace;
an empty account or a failed API request never silently becomes sample analytics.

**One workflow across UI, API and database.** Onboarding creates an organization
and project. An ingestion key connects test events to that project. The same
events feed its dashboard, event explorer and ordered funnel reports.

**Scoped credential handling.** Project ingestion keys are displayed once and
stored as hashes. Database credentials and the session signing secret stay on
the API host. Public browser configuration contains only the API address and
the demo-login flag. Ingestion keys grant event-write access, not private report
or account access.

**Explicit loading and failure states.** Reports cancel obsolete requests when
the user, project or filters change. An expired session, inaccessible project,
empty workspace or unavailable API has its own state instead of invented data.

## Result and Review

The result is a deployed, end-to-end analytics MVP with an immediate guest
preview and separate authenticated workspaces. It demonstrates dashboard UI,
API integration, relational modeling, authorization, SDK design and deployment.
There are no claimed customer counts, revenue gains or measured business results;
all numbers in the guest preview and screenshots are synthetic.

![Public sample dashboard](screenshots/live-dashboard.jpg)

![Public sample funnel report](screenshots/live-funnels.jpg)

For a quick review: dashboard → Events → filter an event → Funnels. For a deeper
review, register an account, create a project, send synthetic events from Tracking,
then inspect the real reports. The free API may need time to wake after inactivity.

Verification includes report data/isolation tests, SDK and rate-limit tests,
TypeScript checks, production builds and API smoke tests through `pnpm verify`.
The separate Playwright suite is not part of that command. See the reviewer
guide for local setup and the reset warning.

## Scope and Trade-offs

This portfolio MVP is not intended for sensitive customer data. Sessions currently
use localStorage bearer tokens; HttpOnly-cookie sessions remain future work.
Rate limits are in memory for one API instance. Free hosting has availability
limits, and a remaining dependency advisory is documented in the
[security notes](deployment.md#current-product-and-security-limits).

## Short Portfolio Description

Built InsightHub, a full-stack product analytics portfolio app with Next.js,
NestJS, TypeScript and PostgreSQL. It includes authenticated workspaces, a browser
tracking SDK, event ingestion, dashboards and conversion funnels. The public demo
offers a no-login sample preview, while registered users work with their own
projects and real persisted test events.
