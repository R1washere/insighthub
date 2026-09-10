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

const login = await request("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "demo@insighthub.dev",
    password: "password123",
  }),
});
assertStatus(login, 201, "login");

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

console.log("API smoke test passed");
