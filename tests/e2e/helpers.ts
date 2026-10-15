import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { ReportSnapshot } from "../../src/types";

export async function startInspection(
  page: Page,
  nickname: string,
): Promise<string> {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start inspection", exact: true })
    .click();
  await expect(page).toHaveURL(/\/inspect\/[^/]+\/scan/);
  await expect(
    page.getByText("Your device overview is ready.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Change device or checks" }).click();
  await page.getByLabel("Give it a name").fill(nickname);
  return page.url().match(/\/inspect\/([^/]+)\//)![1];
}

export async function saveSetup(page: Page): Promise<void> {
  await page
    .getByRole("button", { name: "Save & continue", exact: true })
    .click();
  await expect(page).toHaveURL(/\/inspect\/[^/]+\/tests$/);
}

export async function assess(
  page: Page,
  answer: "Looks / sounds right" | "Not sure" | "I noticed a problem",
): Promise<void> {
  const assessment = page.locator("details.td-assessment");
  if (
    (await assessment.count()) &&
    !(await assessment.evaluate(
      (element) => (element as HTMLDetailsElement).open,
    ))
  ) {
    await assessment.locator(":scope > summary").click();
  }
  await page.getByRole("button", { name: answer }).click();
}

export async function saveGuided(page: Page): Promise<void> {
  const before = new URL(page.url()).pathname;
  await page
    .getByRole("button", { name: /^Save & (?:next check|review)/ })
    .click();
  await page.waitForURL((url) => url.pathname !== before);
}

export async function finishReport(
  page: Page,
  inspectionId: string,
): Promise<ReportSnapshot> {
  const review = page.getByRole("link", { name: /Review & report/ });
  if (await review.count()) await review.click();
  else await page.goto(`/inspect/${inspectionId}/review`);
  await page.getByRole("button", { name: "Finish & create report" }).click();
  await expect(page).toHaveURL(/\/reports\/[^/]+$/);
  return downloadReport(page);
}

export async function downloadReport(page: Page): Promise<ReportSnapshot> {
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export JSON", exact: true }).click();
  const download = await downloaded;
  const file = await download.path();
  expect(file).toBeTruthy();
  return JSON.parse(await readFile(file!, "utf8")) as ReportSnapshot;
}

export async function importReport(
  page: Page,
  contents: string,
): Promise<void> {
  await page.locator("input[type=file]").setInputFiles({
    name: "testdrive-synthetic.json",
    mimeType: "application/json",
    buffer: Buffer.from(contents),
  });
}

export async function evidence(
  page: Page,
  name: string,
  text: string,
): Promise<void> {
  const production = page.url().startsWith("https://");
  const target = path.resolve("docs/evidence", production ? "production" : ".");
  await mkdir(target, { recursive: true });
  await page.evaluate(
    (label) => {
      const banner = document.createElement("div");
      banner.id = "software-test-evidence-label";
      banner.textContent = label;
      banner.style.cssText =
        "position:relative;padding:7px 12px;background:#132b29;color:white;font:11px/1.4 system-ui;text-align:center;pointer-events:none";
      const touchStage = document.querySelector(".td-touch-stage.is-expanded");
      if (touchStage)
        banner.style.cssText +=
          ";position:absolute;bottom:0;left:0;right:0;z-index:100";
      (
        touchStage ??
        document.querySelector(".td-keyboard-capture.is-capturing") ??
        document.body
      ).prepend(banner);
      window.scrollTo(0, 0);
    },
    production ? `Production HTTPS · ${text}` : text,
  );
  const touchStage = page.locator(".td-touch-stage.is-expanded");
  if (await touchStage.count())
    await touchStage.screenshot({
      path: path.join(target, name),
      animations: "disabled",
    });
  else
    await page.screenshot({
      path: path.join(target, name),
      fullPage: true,
      animations: "disabled",
    });
  await page
    .locator("#software-test-evidence-label")
    .evaluate((element) => element.remove());
}

export async function assertNoHorizontalOverflow(page: Page): Promise<void> {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth - innerWidth,
    ),
  ).toBeLessThanOrEqual(1);
}

export function syntheticReport(): ReportSnapshot {
  const now = "2026-10-15T01:00:00.000Z";
  return {
    schemaVersion: 1,
    reportId: "synthetic-report",
    revision: 1,
    finalizedAt: now,
    limitations: ["SYNTHETIC SOFTWARE TEST — describes no physical device."],
    inspection: {
      schemaVersion: 1,
      id: "synthetic-inspection",
      appVersion: "1.0.0-beta.1",
      deviceClass: "computer",
      purpose: "checking_device",
      nickname: "Synthetic security example",
      createdAt: now,
      updatedAt: now,
      profileFacts: [],
      sellerClaims: [],
      attempts: [],
      selectedTestIds: ["DISP-01"],
      state: "complete",
    },
  };
}
