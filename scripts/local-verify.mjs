import { spawn } from "node:child_process";

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

async function stopDevServer(child) {
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

console.log("Resetting SQLite demo database...");
await run("pnpm", ["db:setup"]);

console.log("Running focused package checks...");
await run("pnpm", ["--filter", "@insighthub/api", "test:rate-limit"]);
await run("pnpm", ["--filter", "@insighthub/browser", "test"]);

console.log("Running workspace typecheck and production build...");
await run("pnpm", ["typecheck"]);
await run("pnpm", ["build"]);

console.log("Starting local dev servers for smoke tests...");
const devServer = spawn("pnpm", ["dev"], {
  stdio: ["ignore", "pipe", "pipe"],
  shell: process.platform === "win32",
});

devServer.stdout.on("data", (chunk) => process.stdout.write(chunk));
devServer.stderr.on("data", (chunk) => process.stderr.write(chunk));

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
  await stopDevServer(devServer);
  console.log("Restoring clean SQLite demo seed...");
  await run("pnpm", ["db:setup"]);
}
