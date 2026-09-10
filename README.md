# InsightHub

InsightHub is a full-stack product analytics demo for B2B SaaS teams. It
tracks custom events, manages project API keys, and turns raw product activity
into dashboards, event exploration and funnel reports.

This is a personal portfolio project built from scratch. It does not contain
proprietary code, data, internal architecture, or business logic from any
employer.

## What I Built

- Multi-tenant organization and project model.
- JWT authentication with register, login and current-user endpoints.
- API key lifecycle with one-time raw key display, hashed storage and revoke.
- Public event ingestion endpoint with API key auth and rate limiting.
- Analytics dashboard with project switching and 7/30/90 day windows.
- Event explorer with actor, timestamp, event name and JSON property details.
- Funnel builder and saved conversion reports.
- Browser tracking SDK with queueing, retry, `identify()` and manual `flush()`.
- Onboarding flow for creating the first organization, project and API key.
- SQLite seed data for fast local review.

## Stack

- Next.js
- React
- NestJS
- TypeScript
- Prisma
- SQLite
- pnpm workspaces

## Project Structure

```txt
apps/web           Next.js analytics dashboard
apps/api           NestJS backend API
packages/browser   Browser tracking SDK
packages/shared    Shared TypeScript contracts
prisma             SQLite schema and seed data
scripts            Local setup, verification and smoke tests
```

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm db:setup
pnpm dev
```

Web app: `http://localhost:3000`

API: `http://localhost:4000/api`

If port `3000` is already in use, run the web app on another port:

```bash
WEB_PORT=3001 WEB_BASE_URL=http://localhost:3001 pnpm dev
```

## Demo Flow

1. Open `http://localhost:3000/login`.
2. Click "Use demo account".
3. Review dashboard metrics and report windows.
4. Open Events and filter by event name.
5. Create or inspect a funnel report.
6. Open Tracking and Settings to review API key management.

Useful API calls:

```bash
curl http://localhost:4000/api/health

curl -X POST http://localhost:4000/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"demo@insighthub.dev","password":"password123"}'
```

## Verification

```bash
pnpm verify
```

The verification script resets the local SQLite database, runs package checks,
typechecks, builds production bundles, starts both local apps, runs smoke
tests, checks key web routes, and restores seeded demo data.

## Notes

- Architecture overview: `docs/architecture.md`
- Database notes: `docs/database-model.md`
- Browser SDK README: `packages/browser/README.md`
