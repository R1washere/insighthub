import { spawn } from "node:child_process";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env first.");
}

const databaseHost = new URL(databaseUrl).hostname;
const localHosts = new Set(["localhost", "127.0.0.1", "[::1]"]);

if (process.env.NODE_ENV === "production" || !localHosts.has(databaseHost)) {
  throw new Error(
    `Refusing to reset non-local database host ${databaseHost}. Use pnpm db:deploy for hosted databases.`,
  );
}

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

await run("node", ["node_modules/prisma/build/index.js", "generate"]);
await run("node", [
  "node_modules/prisma/build/index.js",
  "migrate",
  "reset",
  "--force",
]);
await run("node", ["node_modules/tsx/dist/cli.mjs", "prisma/seed.ts"]);
