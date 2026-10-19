# Free deployment guide

This project is prepared for a personal portfolio deployment with:

- Vercel Hobby: Next.js frontend.
- Render Free: NestJS API.
- Neon Free: PostgreSQL.

Use this setup for a personal, non-commercial portfolio demo. Vercel Hobby is
restricted to that use; Render Free sleeps and has no production availability
guarantee. Confirm the free plan at each provider before creating resources.
Do not enable a trial, paid plan, or add a payment method for this deployment.
If a provider requires billing details, stop and review its terms first.

Do not commit connection strings, JWT secrets, access tokens, or API keys. Keep
them in each provider's encrypted environment-variable settings. The frontend
must never receive DATABASE_URL or JWT_ACCESS_SECRET.

## PostgreSQL migration and existing data

The PostgreSQL migration creates a **new, empty database**. It replaces the
SQLite migration history because Prisma migration SQL is provider-specific;
it does not copy any rows from an existing SQLite database. The original
migration remains in Git history. Existing SQLite files remain ignored.

If you have real SQLite data, back up that file and stop before changing its
application connection. Export/import the data into a separate PostgreSQL
database and validate it before switching. Never run `db:setup`, `migrate
reset`, `db push --accept-data-loss`, or the demo seed on hosted data. Both
local setup and the demo seed reject hosted databases.

## 1. Create PostgreSQL on Neon

1. Create a Free project in an EU region close to Render Frankfurt.
2. Copy its direct PostgreSQL connection string into a password manager. This
   becomes `DATABASE_URL` on Render. Keep `sslmode=require` and add
   `connection_limit=3` to bound connections on the small API instance. Only
   Render needs this secret. Keep compute autosuspend enabled on Neon.
3. Never paste the connection string into GitHub, an issue, a pull request, or
   a chat message.

## 2. Create the frontend on Vercel

1. Import `R1washere/insighthub` on the Hobby plan.
2. Set Node.js to 22.x and the Root Directory to `apps/web`. Include files
   outside the root directory so `packages/shared` is available. Use the
   detected Next.js build and `pnpm install --frozen-lockfile --prod=false`
   installation so the compiler remains available during builds.
3. Add these environment variables:
   - `NEXT_PUBLIC_API_BASE_URL=https://YOUR-API.onrender.com/api`
   - `API_BASE_URL=https://YOUR-API.onrender.com/api`
   - `NEXT_PUBLIC_DEMO_LOGIN_ENABLED=false`
     Do not set `DEMO_ACCESS_TOKEN`: it is a shared server-side demo credential,
     not a per-user authentication session.
4. Deploy and copy the exact `https://...vercel.app` production URL.

The API URL can be entered after Render has created the service; redeploy the
frontend after updating it.

## 3. Create the API on Render

1. Choose New > Blueprint, connect `R1washere/insighthub`, and select the
   repository's `render.yaml` from the reviewed deployment branch. While the
   pull request is open, use `codex/deployment-readiness`. Also configure
   Vercel to build that branch. `main` is changed only through a separately
   reviewed and approved merge.
2. Confirm the `free` compute plan. Do not upgrade the instance.
3. Enter the prompted secrets:
   - `DATABASE_URL`: the Neon PostgreSQL connection string.
   - `API_CORS_ORIGIN`: the exact Vercel production origin, without a trailing
     slash (for example, `https://insighthub.vercel.app`).
4. Let Render generate `JWT_ACCESS_SECRET`; never copy it into the repository.
5. Wait for `/api/health` to return a successful response.

The free Render plan does not support a separate pre-deploy command, so the
start command applies Prisma migrations before starting the single API
instance. The migration is idempotent.

## 4. Finish and verify

1. Put the final Render API URL into both Vercel API variables and redeploy.
2. Register a new account from the deployed frontend. Production does not show
   the seeded demo-login button.
3. Verify registration, onboarding, API-key creation, event ingestion,
   dashboard loading, and logout.

## Current product and security limits

- Signed-in dashboard, events, and funnels load authenticated API data in the
  browser using that user's session. Projects are collected from all of the
  user's organizations. Reports never substitute sample numbers on API failure,
  expired sessions, empty workspaces, or unknown project/funnel identifiers.
  Guests see explicitly labeled sample portfolio reports. No shared
  `DEMO_ACCESS_TOKEN` is used. Private reports are not embedded in HTML or cached.
  Report requests are canceled when the user, project, or filters change.
- Bearer tokens are currently kept in localStorage. Use this deployment with
  demo data; move to HttpOnly cookies and per-user server-side authorization
  before collecting sensitive customer data.
- Authentication attempts are limited to 20 POST requests per IP per minute.
  `TRUST_PROXY_HOPS=1` is set for Render's edge proxy; leave it at zero when
  running a directly reachable local server. Authentication and ingestion
  limits are in memory and designed for one free API instance.
- The browser tracking endpoint accepts cross-origin writes with a project
  ingestion key. Read and management endpoints only allow the configured
  frontend origins and still require bearer authentication.
- The public health check is a liveness check, not a database readiness query.
  Migrations and Prisma's initial connection must succeed before the API
  starts listening.
- Dependency audit on 2026-10-19: Next.js and NestJS were updated, along with
  vulnerable transitive packages. One high-severity advisory remains in
  `deepmerge-ts@7.1.5`, pinned by Prisma 6's optional configuration tooling
  ([GHSA-ggr8-5vv4-36mx](https://github.com/advisories/GHSA-ggr8-5vv4-36mx)).
  The advisory requires cyclic JavaScript objects; this project does not pass
  user input to that configuration merger or use a custom Prisma config.
  This is a scoped exposure assessment, not a clean audit. A forced major
  dependency override or a Prisma major migration is deferred.

## Free-tier caveats

- Render Free services sleep after inactivity, so the first request can be slow.
- Render's local filesystem is ephemeral; PostgreSQL must remain the source of
  truth.
- Provider limits can change. Check the selected plan still says Free/Hobby
  before confirming any deployment.

Provider references: [Render Free](https://render.com/docs/free),
[Render deploy commands](https://render.com/docs/deploys),
[Neon pricing](https://neon.com/pricing), and
[Vercel Hobby](https://vercel.com/docs/plans/hobby).
