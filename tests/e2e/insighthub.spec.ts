import { expect, request, test, type Page } from "@playwright/test";

const apiBaseUrl = process.env.API_BASE_URL ?? "http://localhost:4000/api";

const routes = [
  { path: "/", heading: "Product analytics dashboard" },
  {
    path: "/events?projectId=taskflow-prod&days=30",
    heading: "Tracked product events",
  },
  { path: "/funnels?projectId=taskflow-prod&days=30", heading: "Funnels" },
  {
    path: "/tracking?projectId=taskflow-prod",
    heading: "Install product tracking",
  },
  { path: "/settings?projectId=taskflow-prod", heading: "API keys" },
];

test.beforeAll(async () => {
  await waitForApi();
});

test("demo user can open core pages without layout overflow", async ({
  page,
}) => {
  await loginAsDemoUser(page);

  for (const route of routes) {
    await page.goto(route.path);
    await expect(
      page.getByRole("heading", { exact: true, name: route.heading }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Main navigation" }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page, route.path);
  }
});

async function waitForApi() {
  const context = await request.newContext();
  const deadline = Date.now() + 30_000;

  try {
    while (Date.now() < deadline) {
      try {
        const response = await context.get(`${apiBaseUrl}/health`);

        if (response.ok()) {
          return;
        }
      } catch {
        // The NestJS server can need a short warm-up when Playwright starts dev.
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  } finally {
    await context.dispose();
  }

  throw new Error(`API did not become ready at ${apiBaseUrl}/health`);
}

async function loginAsDemoUser(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: "Use demo account" }).click();
  await expect(
    page.getByRole("heading", { name: "Product analytics dashboard" }),
  ).toBeVisible();
}

async function assertNoHorizontalOverflow(page: Page, route: string) {
  const audit = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body?.scrollWidth ?? 0,
    );

    const offenders = Array.from(document.querySelectorAll("body *"))
      .filter((element) => {
        const rect = element.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) {
          return false;
        }

        if (rect.left >= -1 && rect.right <= viewportWidth + 1) {
          return false;
        }

        return !hasScrollableAncestor(element);
      })
      .slice(0, 10)
      .map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          tag: element.tagName.toLowerCase(),
          className: String((element as HTMLElement).className || ""),
          text: (element.textContent ?? "")
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        };
      });

    return {
      documentWidth,
      offenders,
      viewportWidth,
    };

    function hasScrollableAncestor(element: Element) {
      let parent = element.parentElement;

      while (parent && parent !== document.body) {
        const styles = getComputedStyle(parent);
        const canScrollX =
          ["auto", "scroll"].includes(styles.overflowX) &&
          parent.scrollWidth > parent.clientWidth + 1;

        if (canScrollX) {
          return true;
        }

        parent = parent.parentElement;
      }

      return false;
    }
  });

  expect(audit, `${route} should not overflow horizontally`).toEqual({
    documentWidth: audit.viewportWidth,
    offenders: [],
    viewportWidth: audit.viewportWidth,
  });
}
