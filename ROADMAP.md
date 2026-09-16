# InsightHub Roadmap

InsightHub is a portfolio-grade product analytics demo. The current version shows the core SaaS loop: create an organization and project, ingest events with API keys, explore analytics, and review funnels from a clean dashboard.

## Done

- Event ingestion API with project API keys and rate limiting.
- Product analytics dashboard with event volume, conversion and funnel views.
- Browser tracking SDK with queueing, retry support, `identify()` and `flush()`.
- Project and organization flows for a realistic multi-tenant shape.
- Local SQLite demo setup, seed data, smoke checks and reviewer documentation.
- CI checks for linting, type checking and production builds.

## Next

- Add more demo events to show realistic weekly product usage trends.
- Add end-to-end coverage for SDK ingestion and funnel creation.
- Improve empty and loading states across analytics screens.
- Add concise API examples for tracking custom events from a frontend app.

## Later

- Add cohort filters and saved report views.
- Add export support for funnel and event tables.
- Add dashboard annotations for releases or marketing campaigns.
- Add OpenAPI documentation for the backend API.

