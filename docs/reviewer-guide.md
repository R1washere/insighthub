# Reviewer Guide

InsightHub is a portfolio demo meant to show end-to-end ownership of a
full-stack SaaS analytics product: authentication, API key handling, ingestion,
reporting, dashboards, and a browser SDK.

## Fast Path

1. Start with `README.md` for the product overview and local setup.
2. Review `docs/architecture.md` and `docs/database-model.md` for system shape.
3. Open `apps/web/app` and `apps/web/components` for the Next.js UI.
4. Open `apps/api/src/events`, `apps/api/src/analytics`, and
   `apps/api/src/funnels` for the main backend flows.
5. Open `packages/browser` to review the tracking SDK.
6. Open `prisma/schema.prisma` to review tenancy, projects, events, and reports.

## What To Look For

- Full-stack feature slices instead of isolated UI mockups.
- Clear separation between controllers, services, DTOs, and shared contracts.
- API key lifecycle with hashed storage and one-time raw key display.
- Event ingestion with rate limiting and project-scoped analytics.
- Demo data and verification scripts that make the project easy to review.

## Local Verification

```bash
pnpm install
cp .env.example .env
pnpm db:setup
pnpm verify
```

The verification script prepares the local SQLite database, runs checks, builds
the workspaces, starts the apps, checks key routes, and runs smoke tests.
