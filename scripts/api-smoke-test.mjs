const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";

const request = async (path, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return {
    ok: response.ok,
    status: response.status,
    headers: response.headers,
    body,
  };
};

const assertStatus = (result, expectedStatus, label) => {
  if (result.status !== expectedStatus) {
    throw new Error(
      `${label} expected ${expectedStatus}, received ${result.status}: ${JSON.stringify(result.body)}`,
    );
  }
};

const health = await request("/health");
assertStatus(health, 200, "health");
if (
  health.headers.get("x-content-type-options") !== "nosniff" ||
  health.headers.has("x-powered-by")
) {
  throw new Error("Expected hardened API response headers");
}

const foreignOrigin = "https://external-tracking.example";
const sdkPreflight = await request("/events", {
  method: "OPTIONS",
  headers: {
    origin: foreignOrigin,
    "access-control-request-method": "POST",
    "access-control-request-headers": "content-type,x-insighthub-key",
  },
});
assertStatus(sdkPreflight, 204, "browser SDK CORS preflight");
if (sdkPreflight.headers.get("access-control-allow-origin") !== "*") {
  throw new Error("Browser SDK must be able to send events from other sites");
}

const foreignRead = await request("/auth/me", {
  headers: { origin: foreignOrigin },
});
assertStatus(foreignRead, 401, "unauthenticated read");
if (foreignRead.headers.has("access-control-allow-origin")) {
  throw new Error("Dashboard endpoints must not allow unknown CORS origins");
}

const login = await request("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "demo@insighthub.dev",
    password: "password123",
  }),
});
assertStatus(login, 201, "login");
if ("passwordHash" in login.body.user) {
  throw new Error("Login must never return the password hash");
}

const authHeaders = {
  authorization: `Bearer ${login.body.accessToken}`,
};

const onboardingRegister = await request("/auth/register", {
  method: "POST",
  body: JSON.stringify({
    email: `onboarding-${Date.now()}@insighthub.dev`,
    name: "Onboarding Smoke User",
    password: "password123",
  }),
});
assertStatus(onboardingRegister, 201, "register onboarding user");

const onboardingHeaders = {
  authorization: `Bearer ${onboardingRegister.body.accessToken}`,
};
const onboardingOrganization = await request("/organizations", {
  method: "POST",
  headers: onboardingHeaders,
  body: JSON.stringify({
    name: "Onboarding Smoke Org",
  }),
});
assertStatus(onboardingOrganization, 201, "create onboarding organization");

const onboardingProject = await request(
  `/organizations/${onboardingOrganization.body.id}/projects`,
  {
    method: "POST",
    headers: onboardingHeaders,
    body: JSON.stringify({
      name: "Onboarding Smoke Project",
      timezone: "Europe/Prague",
    }),
  },
);
assertStatus(onboardingProject, 201, "create onboarding project");

if (!onboardingProject.body.project?.id || !onboardingProject.body.apiKey) {
  throw new Error(
    "Expected onboarding project response with project and API key",
  );
}

const organizations = await request("/organizations", {
  headers: authHeaders,
});
assertStatus(organizations, 200, "list organizations");

const organization = organizations.body[0];

if (!organization) {
  throw new Error("Expected seeded organization");
}

const projects = await request(`/organizations/${organization.id}/projects`, {
  headers: authHeaders,
});
assertStatus(projects, 200, "list projects");

const project = projects.body[0];

if (!project) {
  throw new Error("Expected seeded project");
}

const crossTenantRead = await request(`/projects/${project.id}`, {
  headers: onboardingHeaders,
});
assertStatus(crossTenantRead, 404, "cross-tenant project access");

const utcEventTime = new Date();
utcEventTime.setUTCDate(utcEventTime.getUTCDate() - 1);
utcEventTime.setUTCHours(23, 30, 0, 0);
const utcEvent = await request("/events", {
  method: "POST",
  headers: { "x-insighthub-key": onboardingProject.body.apiKey },
  body: JSON.stringify({
    event: "utc_boundary_check",
    userId: "utc_smoke_actor",
    timestamp: utcEventTime.toISOString(),
  }),
});
assertStatus(utcEvent, 201, "track UTC boundary event");

const utcReport = await request(
  `/projects/${onboardingProject.body.project.id}/analytics/events-over-time?days=7`,
  { headers: onboardingHeaders },
);
assertStatus(utcReport, 200, "UTC time series");
const utcPoint = utcReport.body.find(
  (point) => point.date === utcEventTime.toISOString().slice(0, 10),
);
if (utcPoint?.events !== 1 || utcPoint.uniqueUsers !== 1) {
  throw new Error(
    "PostgreSQL time series must bucket events by UTC calendar date",
  );
}

const projectDetails = await request(`/projects/${project.id}`, {
  headers: authHeaders,
});
assertStatus(projectDetails, 200, "get project details");

if (
  projectDetails.body.id !== project.id ||
  !projectDetails.body.apiKeys?.length
) {
  throw new Error("Expected project details with API key metadata");
}

const analyticsOverview = await request(
  `/projects/${project.id}/analytics/overview?days=30&limit=5`,
  {
    headers: authHeaders,
  },
);
assertStatus(analyticsOverview, 200, "analytics overview");

if (
  !analyticsOverview.body.summary ||
  !Array.isArray(analyticsOverview.body.eventsOverTime) ||
  !Array.isArray(analyticsOverview.body.topEvents) ||
  !Array.isArray(analyticsOverview.body.recentActivity)
) {
  throw new Error("Expected analytics overview sections");
}

const analyticsSummary = await request(
  `/projects/${project.id}/analytics/summary?days=30`,
  {
    headers: authHeaders,
  },
);
assertStatus(analyticsSummary, 200, "analytics summary");

const eventsOverTime = await request(
  `/projects/${project.id}/analytics/events-over-time?days=7`,
  {
    headers: authHeaders,
  },
);
assertStatus(eventsOverTime, 200, "events over time");

if (!Array.isArray(eventsOverTime.body) || eventsOverTime.body.length !== 7) {
  throw new Error("Expected seven events-over-time points");
}

const topEvents = await request(
  `/projects/${project.id}/analytics/top-events?days=30&limit=5`,
  {
    headers: authHeaders,
  },
);
assertStatus(topEvents, 200, "top events");

if (!Array.isArray(topEvents.body) || topEvents.body.length === 0) {
  throw new Error("Expected top events");
}

const recentActivity = await request(
  `/projects/${project.id}/analytics/recent-activity?limit=5`,
  {
    headers: authHeaders,
  },
);
assertStatus(recentActivity, 200, "recent activity");

if (!Array.isArray(recentActivity.body) || recentActivity.body.length === 0) {
  throw new Error("Expected recent activity");
}

const createdKey = await request(`/projects/${project.id}/api-keys`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    name: "API smoke test key",
  }),
});
assertStatus(createdKey, 201, "create API key");

const acceptedEvent = await request("/events", {
  method: "POST",
  headers: {
    "x-insighthub-key": createdKey.body.token,
  },
  body: JSON.stringify({
    event: "api_smoke_test_before_revoke",
    userId: "user_api_smoke_test",
    properties: {
      source: "api-smoke-test",
    },
  }),
});
assertStatus(acceptedEvent, 201, "track event before revoke");

const listedEvents = await request(
  `/projects/${project.id}/events?days=1&eventName=api_smoke_test_before_revoke&limit=5`,
  {
    headers: authHeaders,
  },
);
assertStatus(listedEvents, 200, "list filtered project events");

if (listedEvents.body.total < 1 || listedEvents.body.events.length < 1) {
  throw new Error("Expected filtered events list to include the smoke event");
}

const createdFunnel = await request(`/projects/${project.id}/funnels`, {
  method: "POST",
  headers: authHeaders,
  body: JSON.stringify({
    name: "API smoke test funnel",
    steps: [
      { eventName: "api_smoke_test_before_revoke" },
      { eventName: "subscription_started" },
    ],
  }),
});
assertStatus(createdFunnel, 201, "create funnel");

const listedFunnels = await request(`/projects/${project.id}/funnels`, {
  headers: authHeaders,
});
assertStatus(listedFunnels, 200, "list funnels");

if (
  !Array.isArray(listedFunnels.body) ||
  !listedFunnels.body.some((funnel) => funnel.id === createdFunnel.body.id)
) {
  throw new Error("Expected created funnel in funnel list");
}

const funnelReport = await request(
  `/projects/${project.id}/funnels/${createdFunnel.body.id}/report?days=30`,
  {
    headers: authHeaders,
  },
);
assertStatus(funnelReport, 200, "get funnel report");

if (funnelReport.body.funnel.id !== createdFunnel.body.id) {
  throw new Error("Expected funnel report to match the created funnel");
}

const revokedKey = await request(
  `/projects/${project.id}/api-keys/${createdKey.body.apiKey.id}`,
  {
    method: "DELETE",
    headers: authHeaders,
  },
);
assertStatus(revokedKey, 200, "revoke API key");

if (!revokedKey.body.revokedAt) {
  throw new Error("Expected revokedAt after key revocation");
}

const rejectedEvent = await request("/events", {
  method: "POST",
  headers: {
    "x-insighthub-key": createdKey.body.token,
  },
  body: JSON.stringify({
    event: "api_smoke_test_after_revoke",
    userId: "user_api_smoke_test",
  }),
});
assertStatus(rejectedEvent, 401, "track event after revoke");

let authLimited = false;
for (let index = 0; index < 21; index += 1) {
  const attempt = await request("/auth/login", {
    method: "POST",
    body: "{}",
  });
  if (attempt.status === 429) {
    if (!attempt.headers.has("retry-after")) {
      throw new Error("Auth limiter must return Retry-After");
    }
    authLimited = true;
    break;
  }
  assertStatus(attempt, 400, "invalid login validation");
}
if (!authLimited) {
  throw new Error("Repeated authentication attempts must be rate limited");
}
assertStatus(
  await request("/health"),
  200,
  "health remains available after rate limit",
);

console.log("API smoke test passed");
