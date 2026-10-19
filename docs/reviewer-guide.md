# Reviewer Guide

InsightHub is a portfolio demo meant to show end-to-end ownership of a
full-stack SaaS analytics product: authentication, API key handling, ingestion,
reporting, dashboards, and a browser SDK.

## Fast Path

For a quick product review, open the [live preview](https://project-2dut5.vercel.app/)
without signing in: dashboard → event filter → funnel report. The guest workspace
is explicitly labeled as sample data. For the problem, implementation choices,
and scope, read the [portfolio case study](portfolio-case-study.md).

To evaluate persistence, use a new account and synthetic events; never put real
customer or confidential data into this portfolio deployment. The free API may
need time to wake. An empty new workspace is expected, not missing sample data.

1. Start with `README.md` for the product overview and local setup.
2. Review `docs/architecture.md` and `docs/database-model.md` for system shape.
3. Use `docs/api-examples.md` to exercise ingestion and analytics with `curl`.
4. Open `apps/web/app` and `apps/web/components` for the Next.js UI.
5. Open `apps/api/src/events`, `apps/api/src/analytics`, and
   `apps/api/src/funnels` for the main backend flows.
6. Open `packages/browser` to review the tracking SDK.
7. Open `prisma/schema.prisma` to review tenancy, projects, events, and reports.

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
docker compose up -d
pnpm db:setup
pnpm verify
```

The verification script prepares the local PostgreSQL database, runs checks, builds
the workspaces, starts the apps, checks key routes, and runs smoke tests.

`pnpm verify` resets the local database; do not point it at valuable local data.
It does not run the separate Playwright E2E suite. For focused report isolation
and failure-state tests without a database, run `pnpm test:reports`.

## Deliberate Scope

This is a working portfolio MVP rather than an audited production service.
Known limits include localStorage bearer sessions, single-instance in-memory
rate limiting, free-tier cold starts, and a documented dependency advisory.
See [deployment and security notes](deployment.md#current-product-and-security-limits).
Sample conversion figures are not evidence of real customer outcomes.
