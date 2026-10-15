import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  assess,
  evidence,
  finishReport,
  startInspection,
  saveSetup,
  saveGuided,
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
  await expect(
    page.getByLabel("Mouse & trackpad", { exact: true }),
  ).toBeChecked();
  await expect(page.getByLabel("Touchscreen", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Phone", exact: true }).click();
  await assertNoHorizontalOverflow(page);
  await saveSetup(page);
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
  const cell = area.locator(":scope > span").nth(30);
  await cell.scrollIntoViewIfNeeded();
  const box = await cell.boundingBox();
  expect(box).toBeTruthy();
  await page.touchscreen.tap(box!.x + box!.width / 2, box!.y + box!.height / 2);
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
  await assess(page, "Not sure");
  await saveGuided(page);
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
  await page
    .locator(".test-card")
    .filter({
      has: page.getByRole("heading", { name: "Touchscreen", exact: true }),
    })
    .getByRole("button", { name: "Check touch" })
    .click();
  await expect(page.locator(".td-touch-grid")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.getByRole("link", { name: "All checks", exact: true }).click();
  await page.getByRole("link", { name: /Device & setup/ }).click();
  await assertNoHorizontalOverflow(page);
  expect(errors).toEqual([]);
});

for (const mode of ["native", "fallback"] as const) {
  test(`fullscreen touch ${mode} records touch coverage, excludes mouse, and exits with retained results`, async ({
    page,
  }) => {
    if (mode === "fallback") {
      await page.addInitScript(() => {
        Element.prototype.requestFullscreen = () =>
          Promise.reject(new DOMException("Test denied", "NotAllowedError"));
      });
    }
    await page.goto("/tests");
    await page
      .getByRole("button", { name: "Check touch", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Start fullscreen touch test" })
      .click();
    const stage = page.getByRole("dialog", {
      name: "Fullscreen touchscreen test",
    });
    await expect(stage).toBeVisible();
    await expect(stage).toContainText(
      mode === "native"
        ? "Fullscreen · Esc exits"
        : "Full viewport · browser controls stay visible",
    );
    const grid = page.locator(".td-touch-grid");
    await expect(
      page.getByRole("progressbar", { name: "Touch coverage" }),
    ).toHaveAttribute("aria-valuenow", "0");
    const box = await grid.boundingBox();
    expect(box).toBeTruthy();
    await page.mouse.click(
      box!.x + box!.width / 12,
      box!.y + box!.height * 0.55,
    );
    await expect(
      page.getByRole("progressbar", { name: "Touch coverage" }),
    ).toHaveAttribute("aria-valuenow", "0");
    await page.touchscreen.tap(
      box!.x + box!.width / 12,
      box!.y + box!.height * 0.55,
    );
    await page.touchscreen.tap(
      box!.x + (box!.width * 3) / 12,
      box!.y + box!.height * 0.55,
    );
    await expect(
      page.getByRole("progressbar", { name: "Touch coverage" }),
    ).toHaveAttribute("aria-valuenow", "2");
    await evidence(
      page,
      `touch-${mode}-active-mobile.png`,
      "SOFTWARE TEST · 390px phone viewport emulation · 2 received touch cells, no physical panel validation",
    );
    await assertNoHorizontalOverflow(page);
    await page.getByRole("button", { name: "Move controls" }).click();
    await expect(stage).toBeVisible();
    if (mode === "native")
      await page.getByRole("button", { name: "Exit touch test" }).click();
    else await page.keyboard.press("Escape");
    await expect(stage).toHaveCount(0);
    await expect(
      page.getByText("2 / 60 areas touched", { exact: true }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden",
    );
    await expect(
      page.getByRole("button", { name: "Start fullscreen touch test" }),
    ).toBeFocused();
    await evidence(
      page,
      `touch-${mode}-retained-mobile.png`,
      "390px phone viewport EMULATION · browser touch events · fullscreen exit retained 2 cells; no physical panel proof",
    );
    await assess(page, "Not sure");
    await saveGuided(page);
  });
}

test("mobile microphone brings the requested phrase above the save bar when capture starts", async ({
  page,
}) => {
  await page.goto("/tests");
  await page
    .getByRole("button", { name: "Check microphone", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start microphone sample", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: undefined,
    });
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const destination = context.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    void context.resume();
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => destination.stream,
    });
  });
  await page
    .getByRole("button", { name: "Start microphone sample", exact: true })
    .click();
  const phrase = page.locator(".td-sample-phrase");
  await expect(phrase).toBeVisible();
  await expect
    .poll(async () => {
      const box = await phrase.boundingBox();
      const footer = await page.locator(".td-workbench-footer").boundingBox();
      return Boolean(
        box && footer && box.y >= 0 && box.y + box.height <= footer.y,
      );
    })
    .toBe(true);
  await expect(
    page.getByText("Sound received automatically", { exact: true }),
  ).toBeVisible();
  await evidence(
    page,
    "ux-mobile-microphone-synthetic-complete.png",
    "SOFTWARE TEST · synthetic oscillator audio · no physical microphone or voice-quality validation",
  );
});
