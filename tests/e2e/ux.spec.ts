import { expect, test } from "@playwright/test";
import { assertNoHorizontalOverflow, evidence } from "./helpers";

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`UX ${viewport.name} keeps clear navigation, library, device overview and guided media at ${viewport.width}px`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "getBattery", {
        configurable: true,
        value: async () => ({ level: 0.72, charging: true }),
      });
      Object.defineProperty(navigator.storage, "estimate", {
        configurable: true,
        value: async () => ({ quota: 512 * 1024 ** 2, usage: 8 * 1024 ** 2 }),
      });
    });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Check this device before you buy it.",
    );
    await expect(
      page.getByRole("button", { name: "Start inspection", exact: true }),
    ).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await evidence(
      page,
      `ux-${viewport.name}-home.png`,
      `${viewport.width}px browser viewport · software UX review`,
    );
    await page.goto("/tests");
    await expect(page.locator(".test-card")).toHaveCount(8);
    await expect(page.locator(".library-automatic-grid > *")).toHaveCount(3);
    await assertNoHorizontalOverflow(page);
    await evidence(
      page,
      `ux-${viewport.name}-library.png`,
      `${viewport.width}px browser viewport · functional guided library`,
    );
    await page.goto("/");
    await page
      .getByRole("button", { name: "Start inspection", exact: true })
      .click();
    await expect(
      page.getByText("Your device overview is ready.", { exact: true }),
    ).toBeVisible();
    const summary = page.getByRole("region", { name: "Device overview" });
    await expect(summary).toContainText("72% · Charging");
    await expect(summary).toContainText("0.5 GiB allowance");
    await expect(summary).toContainText("not disk capacity or free disk space");
    await assertNoHorizontalOverflow(page);
    await evidence(
      page,
      `ux-${viewport.name}-device-overview.png`,
      `${viewport.width}px browser viewport · SYNTHETIC battery and website quota values`,
    );
    const id = page.url().match(/\/inspect\/([^/]+)\//)![1];
    for (const item of [
      { id: "CAM-01", name: "camera" },
      { id: "MIC-01", name: "microphone" },
    ]) {
      await page.goto(`/inspect/${id}/test/${item.id}`);
      await expect(page.locator(".td-workbench")).toBeVisible();
      await assertNoHorizontalOverflow(page);
      await evidence(
        page,
        `ux-${viewport.name}-${item.name}.png`,
        `${viewport.width}px browser viewport · media instructions only; no camera or microphone access`,
      );
    }
    expect(errors).toEqual([]);
  });
}

test("device overview leaves unavailable battery and storage readings unknown", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "getBattery", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(navigator.storage, "estimate", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start inspection", exact: true })
    .click();
  await expect(
    page.getByText("Your device overview is ready.", { exact: true }),
  ).toBeVisible();
  const summary = page.getByRole("region", { name: "Device overview" });
  await expect(
    summary.getByText("Not shared by this browser", { exact: true }),
  ).toHaveCount(2);
  await expect(summary).toContainText("not disk capacity or free disk space");
  await expect(summary).not.toContainText("0% ·");
});

test("stopped automatic scan reports unfinished progress, retries, and navigation cancels late updates", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "getBattery", {
      configurable: true,
      value: () => new Promise(() => {}),
    });
  });
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start inspection", exact: true })
    .click();
  await page.getByRole("button", { name: "Stop scan", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Scan stopped. Your progress is saved.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Your device overview is ready." }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Retry automatic scan", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your device overview is ready." }),
  ).toBeVisible();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start inspection", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Stop scan", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Change device or checks" }).click();
  await page
    .getByLabel("Give it a name")
    .fill("Navigation cancellation example");
  // Let the bounded pending browser read settle after route cleanup.
  await page.waitForTimeout(1500);
  await expect(page).toHaveURL(/\/setup$/);
  await expect(page.getByLabel("Give it a name")).toHaveValue(
    "Navigation cancellation example",
  );
  await expect(
    page.getByRole("heading", { name: "Your device overview is ready." }),
  ).toHaveCount(0);
});
