import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";

process.loadEnvFile(".env");

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";
const webBaseUrl = process.env.WEB_BASE_URL ?? "http://localhost:3000";

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });

async function waitForUrl(url, label) {
  const startedAt = Date.now();
  const timeoutMs = 30_000;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        return;
      }
    } catch {
      // The dev servers need a moment to boot.
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`${label} did not become ready at ${url}`);
}

async function assertPage(path, expectedText) {
  const response = await fetch(`${webBaseUrl}${path}`);
  const html = await response.text();

  if (!response.ok) {
    throw new Error(`${path} returned HTTP ${response.status}`);
  }

  if (!html.includes(expectedText)) {
    throw new Error(`${path} did not include "${expectedText}"`);
  }
}

async function stopServer(child) {
  if (child.exitCode !== null) {
    return;
  }

  child.kill("SIGINT");

  await new Promise((resolve) => {
    const timeout = setTimeout(resolve, 2_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

console.log("Resetting local PostgreSQL demo database...");
await run("pnpm", ["db:setup"]);

console.log("Running focused package checks...");
await run("pnpm", ["--filter", "@insighthub/api", "test:rate-limit"]);
await run("pnpm", ["--filter", "@insighthub/browser", "test"]);

console.log("Running workspace typecheck and production build...");
await run("pnpm", ["typecheck"]);
await run("pnpm", ["build"]);

console.log("Starting production bundles for smoke tests...");
const apiServer = spawn(
  process.execPath,
  ["apps/api/dist/apps/api/src/main.js"],
  {
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: new URL(apiBaseUrl).port || "4000",
      API_CORS_ORIGIN: "https://verify.insighthub.example",
      JWT_ACCESS_SECRET: randomBytes(32).toString("hex"),
      TRUST_PROXY_HOPS: "0",
    },
  },
);
const webServer = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    new URL(webBaseUrl).port || "3000",
  ],
  { cwd: "apps/web", env: process.env, stdio: ["ignore", "pipe", "pipe"] },
);
for (const child of [apiServer, webServer]) {
  child.stdout.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr.on("data", (chunk) => process.stderr.write(chunk));
}

try {
  await waitForUrl(`${apiBaseUrl}/health`, "API");
  await waitForUrl(webBaseUrl, "Web app");

  console.log("Running API smoke test...");
  await run("pnpm", ["test:api"]);

  console.log("Checking portfolio web routes...");
  await assertPage("/", "Product analytics dashboard");
  await assertPage(
    "/events?projectId=taskflow-marketing&days=7",
    "Tracked product events",
  );
  await assertPage(
    "/funnels?projectId=taskflow-mobile&days=90",
    "Create funnel",
  );
  await assertPage("/tracking", "Install product tracking");
  await assertPage("/settings", "API keys");
  await assertPage("/onboarding", "Create your analytics workspace");
  await assertPage("/login", "Use demo account");

  console.log("Local verification passed.");
} finally {
  await Promise.all([stopServer(apiServer), stopServer(webServer)]);
  console.log("Restoring clean PostgreSQL demo seed...");
  await run("pnpm", ["db:setup"]);
}
