# InsightHub Database Model

## Core Design

InsightHub is multi-tenant. Most product data belongs to a project, and every project belongs to an organization.
For the portfolio demo, the database runs on SQLite through Prisma so the project can be started without Docker or external services. The same model can later be moved to PostgreSQL for production-scale analytics.

The tenant chain is:

```txt
Organization -> Project -> Events/Funnels/API Keys
```

This is important because analytics data must never leak between organizations.

## Main Entities

### User

An account that can log in to InsightHub.

### Organization

A SaaS company or team using InsightHub.

### OrganizationMember

Join table between users and organizations. Stores the user's role in that organization.

### Project

An analytics project inside an organization. A company can have multiple projects, for example production and staging.

### ProjectApiKey

API key metadata for event ingestion. The schema stores a key hash, not the raw key.

### Event

A tracked product event, such as `user_signed_up`, `workspace_created`, or `subscription_started`.
Event `properties` are stored as serialized JSON text in SQLite and parsed back into objects by the API response layer.

### Funnel

A saved conversion report definition.

### FunnelStep

An ordered step inside a funnel.
