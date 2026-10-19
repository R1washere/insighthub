import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { ApiError } from "../apps/web/lib/api-client";
import {
  getDashboardOverview,
  getEventsPageData,
  getEventFilterOptions,
  getFunnelsPageData,
  getProjectOptions,
  parseDays,
  resolveProjectId,
} from "../apps/web/lib/dashboard-data";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
const input = {
  days: 30,
  projectId: "private-project",
  preview: false,
  accessToken: "synthetic-user-a",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

test("projects include every organization with the caller's token and no caching", async () => {
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    const path = String(url).replace(/^.*\/api/, "");
    calls.push(path);
    assert.equal(
      new Headers(options?.headers).get("authorization"),
      "Bearer synthetic-user-a",
    );
    assert.equal(options?.cache, "no-store");
    if (path === "/organizations")
      return json([
        { id: "org-a", name: "Alpha" },
        { id: "org-b", name: "Beta" },
      ]);
    return json([
      {
        id: path.includes("org-a") ? "a" : "b",
        name: "Project",
        timezone: "UTC",
      },
    ]);
  };
  const projects = await getProjectOptions("synthetic-user-a");
  assert.deepEqual(
    projects.map((project) => project.organizationName),
    ["Alpha", "Beta"],
  );
  assert.equal(calls.length, 3);
});

test("API errors and expired sessions never become demo reports", async () => {
  for (const status of [401, 403, 404, 500]) {
    globalThis.fetch = async () => json({ message: "Unavailable" }, status);
    for (const load of [
      getDashboardOverview,
      getEventsPageData,
      getEventFilterOptions,
      getFunnelsPageData,
    ]) {
      await assert.rejects(
        () => load(input),
        (error) => error instanceof ApiError && error.status === status,
      );
    }
    await assert.rejects(() => getProjectOptions("synthetic-user-a"));
  }
  globalThis.fetch = async () => {
    throw new Error("Offline");
  };
  await assert.rejects(() => getDashboardOverview(input), /Offline/);
  await assert.rejects(
    () => getDashboardOverview({ ...input, accessToken: null }),
    /Sign in/,
  );
});

test("only explicit preview requests use sample data without contacting API", async () => {
  globalThis.fetch = async () => {
    throw new Error("Must not contact API");
  };
  const overview = await getDashboardOverview({
    ...input,
    projectId: "taskflow-prod",
    preview: true,
    accessToken: null,
  });
  assert.equal(overview.summary.totalEvents, 18420);
});

test("empty live workspaces and funnels stay empty; foreign funnel IDs are rejected", async () => {
  globalThis.fetch = async () => json([]);
  assert.deepEqual(await getProjectOptions("synthetic-user-a"), []);
  assert.deepEqual(await getFunnelsPageData(input), {
    funnels: [],
    report: null,
  });
  await assert.rejects(
    () => getFunnelsPageData({ ...input, funnelId: "someone-elses-funnel" }),
    /not available/,
  );
});

test("event names and project identifiers are encoded, filters propagate", async () => {
  globalThis.fetch = async (url, options) => {
    const parsed = new URL(String(url));
    assert.equal(parsed.pathname, "/api/projects/project%2Fid/events");
    assert.equal(parsed.searchParams.get("eventName"), "signed up & paid");
    assert.equal(parsed.searchParams.get("days"), "7");
    assert.equal(
      new Headers(options?.headers).get("authorization"),
      "Bearer synthetic-user-a",
    );
    return json({ events: [], total: 0 });
  };
  assert.deepEqual(
    await getEventsPageData({
      ...input,
      days: 7,
      projectId: "project/id",
      eventName: "signed up & paid",
    }),
    { events: [], total: 0 },
  );
});

test("different sessions never reuse another user's response", async () => {
  globalThis.fetch = async (_url, options) =>
    json({ owner: new Headers(options?.headers).get("authorization") });
  assert.deepEqual(await getDashboardOverview(input), {
    owner: "Bearer synthetic-user-a",
  });
  assert.deepEqual(
    await getDashboardOverview({ ...input, accessToken: "synthetic-user-b" }),
    { owner: "Bearer synthetic-user-b" },
  );
});

test("project selection cannot restore a project absent from the current user's list", () => {
  const projects = [
    { id: "mine", name: "Mine", environment: "Production", timezone: "UTC" },
  ];
  assert.equal(resolveProjectId("foreign", projects, "also-foreign"), "mine");
  assert.equal(resolveProjectId(undefined, [], "old-project"), "");
  assert.equal(parseDays("999"), 30);
  assert.equal(parseDays("7"), 7);
});
