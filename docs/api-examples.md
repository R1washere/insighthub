# API Examples

These examples assume the API is running locally on `http://localhost:4000/api`
after `pnpm dev`. Protected endpoints require a bearer token from the login
flow. Event ingestion uses the project API key in `x-insighthub-key`.

## Check Health

```bash
curl http://localhost:4000/api/health
```

## Login And Store A Token

Use a seeded user from the local demo data.

```bash
TOKEN=$(
  curl -s -X POST http://localhost:4000/api/auth/login \
    -H "content-type: application/json" \
    -d '{
      "email": "demo@insighthub.dev",
      "password": "password123"
    }' | jq -r '.accessToken'
)
```

## List Organizations And Projects

```bash
curl http://localhost:4000/api/organizations \
  -H "authorization: Bearer $TOKEN"

curl http://localhost:4000/api/organizations/YOUR_ORGANIZATION_ID/projects \
  -H "authorization: Bearer $TOKEN"
```

## Track An Event

Use the seeded demo project API key, or replace it with a newly created key.

```bash
curl -X POST http://localhost:4000/api/events \
  -H "content-type: application/json" \
  -H "x-insighthub-key: ihub_demo_taskflow_development_key" \
  -d '{
    "event": "checkout_completed",
    "userId": "user_123",
    "timestamp": "2026-09-16T12:00:00.000Z",
    "properties": {
      "plan": "growth",
      "amount": 129
    }
  }'
```

## Query Analytics

Replace `YOUR_PROJECT_ID` with a seeded project id from the projects response.

```bash
curl "http://localhost:4000/api/projects/YOUR_PROJECT_ID/analytics/overview?days=30" \
  -H "authorization: Bearer $TOKEN"

curl "http://localhost:4000/api/projects/YOUR_PROJECT_ID/analytics/top-events?days=30&limit=10" \
  -H "authorization: Bearer $TOKEN"

curl "http://localhost:4000/api/projects/YOUR_PROJECT_ID/events?days=7&limit=20" \
  -H "authorization: Bearer $TOKEN"
```

## Review Funnel Reports

```bash
curl "http://localhost:4000/api/funnels?projectId=YOUR_PROJECT_ID" \
  -H "authorization: Bearer $TOKEN"

curl "http://localhost:4000/api/funnels/YOUR_FUNNEL_ID/report?days=30" \
  -H "authorization: Bearer $TOKEN"
```
