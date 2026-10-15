import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  evidence,
  finishReport,
  startInspection,
} from "./helpers";

test("iPhone viewport emulation adapts navigation, touch plan and mobile report without layout overflow", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await assertNoHorizontalOverflow(page);
  await evidence(
    page,
    "iphone-home-viewport-emulation.png",
    "iPhone viewport EMULATION · automated Chromium · not physical iPhone testing",
  );
  const id = await startInspection(page, "Synthetic mobile emulation");
  await expect(
    page.getByRole("button", { name: "Phone", exact: true }),
  ).toHaveClass(/selected/);
  await expect(page.getByLabel("Touchscreen", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Keyboard", { exact: true })).not.toBeChecked();
  await expect(
    page.getByLabel("Mouse & trackpad", { exact: true }),
  ).not.toBeChecked();
  await page.getByRole("button", { name: "Computer", exact: true }).click();
  await expect(page.getByLabel("Keyboard", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Mouse & trackpad", { exact: true })).toBeChecked();
  await expect(page.getByLabel("Touchscreen", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Phone", exact: true }).click();
  await assertNoHorizontalOverflow(page);
  await page
    .getByRole("button", { name: "Run quick scan", exact: true })
    .click();
  await page.getByRole("link", { name: /Run your checks/ }).click();
  await page
    .locator(".inspection-check")
    .filter({
      has: page.getByRole("heading", { name: "Touchscreen", exact: true }),
    })
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await assertNoHorizontalOverflow(page);
  const area = page.locator(".td-touch-grid");
  await area.scrollIntoViewIfNeeded();
  const box = await area.boundingBox();
  expect(box).toBeTruthy();
  await page.touchscreen.tap(
    box!.x + box!.width / 12,
    box!.y + box!.height / 20,
  );
  await expect(
    page.getByText("1 / 60 areas touched", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Looks / sounds right" }),
  ).toBeEnabled();
  await evidence(
    page,
    "iphone-touch-viewport-emulation.png",
    "iPhone viewport EMULATION · synthetic touch event · no physical panel validation",
  );
  await page.getByRole("button", { name: "Not sure" }).click();
  await page.getByRole("button", { name: "Save result" }).click();
  const report = await finishReport(page, id);
  expect(report.inspection.deviceClass).toBe("phone");
  expect(
    report.inspection.attempts.find((a) => a.testId === "TOUCH-01"),
  ).toMatchObject({ finding: "not_assessed", humanAnswer: "not_sure" });
  await assertNoHorizontalOverflow(page);
  await evidence(
    page,
    "iphone-report-viewport-emulation.png",
    "iPhone viewport EMULATION · synthetic inspection · not physical iPhone testing",
  );
  await page
    .getByRole("link", { name: "Saved reports", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "View report" }).click();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Synthetic mobile emulation",
  );
  await assertNoHorizontalOverflow(page);
  await page.setViewportSize({ width: 320, height: 750 });
  await assertNoHorizontalOverflow(page);
  await evidence(
    page,
    "phone-320px-report-viewport-emulation.png",
    "320px phone viewport EMULATION · synthetic report · no physical testing",
  );
  await page.goto("/");
  await assertNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "Test library", exact: true }).click();
  await assertNoHorizontalOverflow(page);
  await page.locator(".test-card").filter({ has: page.getByRole("heading", { name: "Touchscreen", exact: true }) }).getByRole("button", { name: "Run check" }).click();
  await expect(page.locator(".td-touch-grid")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.getByRole("link", { name: /Device & setup/ }).click();
  await assertNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});
