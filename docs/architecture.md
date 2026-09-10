# InsightHub Architecture

## High-Level Architecture

InsightHub is built as a TypeScript monorepo.

```txt
apps/web        Next.js dashboard application
apps/api        NestJS API application
packages/shared Shared TypeScript types and utilities
packages/browser Browser tracking SDK package
```

## Runtime Services

```txt
Browser
  -> Next.js Web App
    -> NestJS API
      -> SQLite demo database
```

## Backend Modules

- `AuthModule`: registration, login, password hashing, JWT issuing.
- `OrganizationsModule`: organizations, memberships, organization permissions.
- `ProjectsModule`: analytics projects, project API keys, settings.
- `EventsModule`: event ingestion, validation, and event storage.
- `IngestionRateLimitService`: in-memory fixed-window protection for the public event ingestion endpoint.
- `AnalyticsModule`: dashboard metrics, top events, time series, funnels.
- `FunnelsModule`: funnel definitions and ordered conversion reporting.
- `PrismaModule`: database client lifecycle and shared persistence access.
- `UsersModule`: user persistence and safe public user selection.
- `ApiKeyModule`: raw API key generation and one-way hashing.

## Authentication Flow

```txt
POST /api/auth/register
  -> validate DTO
  -> hash password with argon2
  -> create user in SQLite through Prisma
  -> return public user + JWT access token

POST /api/auth/login
  -> find user by normalized email
  -> verify password with argon2
  -> return public user + JWT access token

GET /api/auth/me
  -> read Bearer token
  -> verify JWT
  -> load public user by token subject
```

## SaaS Tenant Flow

```txt
Authenticated user
  -> creates Organization
    -> becomes owner OrganizationMember
      -> creates Project
        -> receives one-time raw Project API key
          -> sends events with x-insighthub-key
          -> API hashes incoming key
            -> rate limiter checks the hashed key bucket
            -> finds active ProjectApiKey
            -> stores Event under the matched Project
```

The raw project API key is never stored in the database. InsightHub stores only the SHA-256 hash and a short prefix for display/debugging.

The demo rate limiter is intentionally in-memory to keep local setup simple. In a multi-instance production deployment, the same bucket model should move to Redis or another shared low-latency store.

## Analytics Flow

```txt
GET /api/projects/:projectId/analytics/overview
  -> verify user has access to project
  -> count events in current period
  -> count unique actors
  -> calculate activation rate
  -> count paid conversions
  -> return time series, top events, and recent activity
```

The overview endpoint is optimized for the dashboard, while `summary`, `events-over-time`, `top-events`, and `recent-activity` remain available as smaller focused endpoints.

## Funnel Report Flow

```txt
GET /api/projects/:projectId/funnels/:funnelId/report
  -> verify user has access to project
  -> load funnel steps ordered by step number
  -> load matching events inside date range
  -> group activity by actor, using userId or anonymousId
  -> count how many actors reached each step in order
  -> return per-step conversion and drop-off rates
```

The first version calculates funnel progression in application code. This keeps the algorithm easy to review and test. A later optimization can move the same logic into SQL CTEs for larger event volumes.

## Frontend Product Screens

```txt
/          Dashboard with summary metrics, events over time, top events, recent activity, and funnel preview
/events    Event explorer for incoming analytics events with report and event-name filters
/funnels   Funnel list, funnel builder, and conversion report screen
/onboarding New workspace setup for organization, project, and first API key
/tracking  Developer setup guide for browser SDK, server-side fetch, and curl
/settings  Project API key management
/login     Login flow against NestJS auth API
/register  Registration flow against NestJS auth API
```

The frontend uses API-backed server-side fetches when demo environment variables are present. Without a running backend/database, it falls back to deterministic demo data so the portfolio UI still renders cleanly.

## Verification Flow

`pnpm verify` is the local confidence check for the portfolio version. It resets
SQLite, runs focused package tests, typechecks, builds production bundles, starts
the local API/web apps, runs API smoke tests, checks important web routes, and
then restores a clean seeded database.
