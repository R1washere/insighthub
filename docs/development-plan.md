# InsightHub Development Plan

## Phase 1: Foundation

- Create monorepo structure.
- Add Next.js web app.
- Add NestJS API app.
- Add shared TypeScript package.
- Use SQLite for the local portfolio demo to keep setup lightweight. Done.

## Phase 2: Database

- Add Prisma.
- Model users, organizations, organization members, projects, API keys, events, funnels, and funnel steps.
- Generate Prisma Client.
- Add SQLite schema setup script.
- Add seed data for a demo SaaS project. Done.

## Phase 3: Authentication

- Implement registration and login. Done.
- Hash passwords. Done.
- Issue JWT access tokens. Done.
- Protect API routes. Done for `GET /api/auth/me`.
- Add frontend auth screens. Done.

## Phase 4: Event Ingestion

- Authenticate events with project API keys. Done.
- Persist events. Done in the API service layer.
- Add event activity stream. Done.
- Add basic rate limiting. Done.

## Phase 5: Analytics

- Add total events. Done.
- Add unique users. Done.
- Add events over time. Done.
- Add top events. Done.
- Add funnel conversion analytics. Done.

## Phase 6: Portfolio Polish

- Add richer dashboard screens. Done.
- Add Events page. Done.
- Add Funnels page. Done.
- Add funnel builder UI. Done.
- Add one-click demo login. Done.
- Add onboarding flow. Done.
- Add tests for auth, event ingestion, analytics, and funnels. Done through focused smoke tests.
- Add local verification script. Done.
- Initialize Git repository and create portfolio-ready commits. Skipped for local-only delivery.
