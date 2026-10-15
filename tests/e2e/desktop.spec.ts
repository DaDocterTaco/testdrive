import { expect, test } from "@playwright/test";
import path from "node:path";
import {
  assertNoHorizontalOverflow,
  downloadReport,
  evidence,
  finishReport,
  importReport,
  startInspection,
  syntheticReport,
} from "./helpers";

test("buyer lifecycle preserves evidence, RAM difference, revisions, export, refresh, import and deletion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await evidence(
    page,
    "desktop-home-software-test.png",
    "Automated Chromium desktop · software test · no physical hardware validation",
  );
  const id = await startInspection(
    page,
    "Synthetic buyer example — no physical device",
  );
  await page.getByRole("button", { name: "Computer", exact: true }).click();
  await page
    .getByRole("button", { name: "Run quick scan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run quick scan", exact: true })
    .click();
  await expect(
    page.getByText("Your quick scan is saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue to hands-on checks" })
    .click();
  await expect(page).toHaveURL(new RegExp(`/inspect/${id}/tests$`));

  await page.goto(`/inspect/${id}/test/KEY-01`);
  const keyboard = page.getByRole("group", { name: /^Keyboard test area/ });
  await keyboard.click();
  await page.keyboard.press("a");
  await page.keyboard.press("b");
  await page.keyboard.press("Escape");
  await expect(keyboard).not.toBeFocused();
  await expect(
    page.getByText("3 keys received", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/keys remain untested/)).toBeVisible();
  await page.getByRole("button", { name: "Looks / sounds right" }).click();
  await evidence(
    page,
    "desktop-keyboard-software-test.png",
    "Automated key events · synthetic buyer example · remaining keys untested",
  );
  await page.getByRole("button", { name: "Save result" }).click();

  // Rendering a display pattern without an answer must not assess its physical condition.
  await page.goto(`/inspect/${id}/test/DISP-01`);
  await expect(
    page.getByRole("button", { name: "Looks / sounds right" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Show first pattern" }).click();
  await page.getByRole("button", { name: "Skip this check" }).click();
  await page.reload();
  await expect(
    page.getByText(
      "You skipped this check. Any observations already received are retained.",
    ),
  ).toBeVisible();
  await page.goto(`/inspect/${id}/test/DISP-01`);
  await page.getByRole("button", { name: "Show first pattern" }).click();
  await page.getByRole("button", { name: "Blue", exact: true }).click();
  await page.getByRole("button", { name: "Looks / sounds right" }).click();
  await page.getByRole("button", { name: "Save result" }).click();

  await page.goto(`/inspect/${id}/specs`);
  await page.getByLabel("Claimed installed memory").fill("16 GB");
  await page.getByRole("button", { name: "Save seller claims" }).click();
  await expect(
    page.getByText("Insufficient information", { exact: true }),
  ).toBeVisible();
  await page
    .locator("input[type=file]")
    .setInputFiles(
      path.resolve("tests/fixtures/windows-system-information-synthetic.txt"),
    );
  await expect(
    page.getByRole("heading", { name: "Review extracted fields" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Use these specifications" }),
  ).toBeDisabled();
  await page
    .getByLabel("I confirm this report describes the device I’m inspecting.")
    .check();
  await page.getByRole("button", { name: "Use these specifications" }).click();
  await expect(
    page.getByText("Difference to check", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".comparison")).toContainText("16 GB");
  await expect(page.locator(".comparison")).toContainText("8.00 GB");
  await evidence(
    page,
    "desktop-specs-synthetic-example.png",
    "SYNTHETIC Windows report + seller claim · describes no physical device",
  );

  const report = await finishReport(page, id);
  expect(new Set(report.inspection.attempts.map((a) => a.id)).size).toBe(
    report.inspection.attempts.length,
  );
  expect(
    report.inspection.attempts.filter((a) => a.testId === "SYS-01"),
  ).toHaveLength(1);
  expect(
    report.inspection.attempts.filter((a) => a.testId === "PERF-01"),
  ).toHaveLength(1);
  const keyboardAttempt = report.inspection.attempts.find(
    (a) => a.testId === "KEY-01",
  )!;
  expect(
    keyboardAttempt.facts.find((f) => f.key === "keyboard.distinct")?.value,
  ).toBe(3);
  expect(
    Number(
      keyboardAttempt.facts.find((f) => f.key === "keyboard.untested")?.value,
    ),
  ).toBeGreaterThan(0);
  expect(
    keyboardAttempt.facts.filter((f) => f.key.startsWith("keyboard.key.")),
  ).toHaveLength(3);
  const displayAttempts = report.inspection.attempts.filter(
    (a) => a.testId === "DISP-01",
  );
  expect(displayAttempts).toHaveLength(2);
  expect(displayAttempts[0]).toMatchObject({
    status: "skipped",
    finding: "not_assessed",
  });
  expect(displayAttempts[1]).toMatchObject({
    status: "completed",
    humanAnswer: "looks_good",
  });
  expect(
    report.inspection.profileFacts.find((f) => f.key === "installed_memory"),
  ).toMatchObject({ value: "8.00 GB", source: "imported_system_report" });
  expect(report.inspection.sellerClaims[0]).toMatchObject({
    key: "installed_memory",
    value: "16 GB",
    source: "user_provided",
  });
  await expect(
    page.getByText("2 attempts retained", { exact: false }),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await evidence(
    page,
    "desktop-report-synthetic-example.png",
    "Automated Chromium desktop report · SYNTHETIC example · no hardware certification",
  );
  await page.emulateMedia({ media: "print" });
  await expect(page.getByRole("button", { name: "Export JSON" })).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "What this report means" }),
  ).toBeVisible();
  await evidence(
    page,
    "desktop-report-print-software-test.png",
    "PRINT CSS software check · synthetic inspection · not physical hardware validation",
  );
  if (process.env.TD_E2E_PDF === "1") {
    await page.pdf({
      path: path.resolve("docs/evidence", page.url().startsWith("https://") ? "production" : ".", "synthetic-browser-print-software-test.pdf"),
      format: "Letter",
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: true,
      headerTemplate: '<div style="width:100%;font-size:8px;text-align:center;color:#444">TESTDRIVE - SYNTHETIC BROWSER PDF SOFTWARE TEST - no physical hardware validation</div>',
      footerTemplate: '<div style="width:100%;font-size:8px;text-align:center;color:#444">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
      margin: { top: "0.45in", bottom: "0.45in", left: "0.35in", right: "0.35in" },
    });
  }
  await page.emulateMedia({ media: "screen" });
  const url = page.url();
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Synthetic buyer example — no physical device",
  );
  await expect(page.locator(".comparison").first()).toContainText("16 GB");
  await page.goto("/reports");
  await page.getByRole("button", { name: "Clear local data" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Delete local data", exact: true })
    .click();
  await expect(page.getByRole("link", { name: "View report" })).toHaveCount(0);
  await importReport(page, JSON.stringify(report));
  await page.getByRole("link", { name: "View report" }).click();
  expect(page.url()).toBe(url);
  const imported = await downloadReport(page);
  expect(imported).toEqual(report);
  await page
    .getByRole("button", { name: "Delete this inspection", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete local data", exact: true })
    .click();
  await expect(page).toHaveURL(/\/reports$/);
  await expect(page.getByRole("link", { name: "View report" })).toHaveCount(0);
  await page.goto(url);
  await expect(
    page.getByRole("heading", {
      name: "This report isn’t saved in this browser",
    }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("camera denial requests access only on action and preserves an unknown result", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as Window & { cameraCalls?: number };
    state.cameraCalls = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        state.cameraCalls!++;
        throw new DOMException("Software-test denial", "NotAllowedError");
      },
    });
  });
  const id = await startInspection(page, "Synthetic denied-permission example");
  expect(
    await page.evaluate(
      () => (window as Window & { cameraCalls?: number }).cameraCalls,
    ),
  ).toBe(0);
  await page.goto(`/inspect/${id}/test/CAM-01`);
  await page.reload();
  expect(
    await page.evaluate(
      () => (window as Window & { cameraCalls?: number }).cameraCalls,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(page.getByText(/Access was not allowed/)).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as Window & { cameraCalls?: number }).cameraCalls,
    ),
  ).toBe(1);
  await expect(
    page.getByRole("button", { name: "Looks / sounds right" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Not sure" }).click();
  await page.getByRole("button", { name: "Save result" }).click();
  const report = await finishReport(page, id);
  const attempt = report.inspection.attempts.find((a) => a.testId === "CAM-01");
  expect(attempt).toMatchObject({
    status: "permission_denied",
    finding: "not_assessed",
  });
  expect(attempt?.explanation).toMatch(/Access was not allowed/i);
  expect(attempt?.explanation).not.toMatch(
    /hardware (?:fault|failure)|camera (?:broken|failed)/i,
  );
  await expect(
    page
      .locator(".result-item")
      .filter({
        has: page.getByRole("heading", { name: "Camera", exact: true }),
      })
      .locator(".result-title .status"),
  ).toHaveText("Not sure");
});

test("untrusted imports reject malformed and oversized files, and markup is inert text", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/reports");
  await importReport(page, '{"schemaVersion":');
  await expect(page.getByRole("alert")).toContainText("could not be read");
  await importReport(
    page,
    JSON.stringify({ ...syntheticReport(), schemaVersion: 999 }),
  );
  await expect(page.getByRole("alert")).toContainText(
    "schema version is unsupported",
  );
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "too-large.json",
      mimeType: "application/json",
      buffer: Buffer.alloc(5 * 1024 * 1024 + 1, "x"),
    });
  await expect(page.getByRole("alert")).toContainText("too large");
  const payload =
    '<img src=x onerror="window.__testdrive_xss=1"><script>window.__testdrive_xss=2</script>';
  const report = syntheticReport();
  report.inspection.nickname = payload;
  report.inspection.profileFacts.push({
    id: "synthetic-fact",
    key: "test.note",
    label: "Synthetic markup",
    value: payload,
    source: "user_provided",
    observedAt: report.finalizedAt,
  });
  await importReport(page, JSON.stringify(report));
  await page.getByRole("link", { name: "View report" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(payload);
  expect(
    await page.evaluate(
      () => (window as Window & { __testdrive_xss?: number }).__testdrive_xss,
    ),
  ).toBeUndefined();
  expect(await page.locator("img[src=x]").count()).toBe(0);
  expect(
    await page
      .locator("script")
      .evaluateAll((elements) =>
        elements.some((element) =>
          element.textContent?.includes("window.__testdrive_xss"),
        ),
      ),
  ).toBe(false);
  await page.goto("/reports");
  const unexpected = {
    ...syntheticReport(),
    reportId: "unexpected-field",
    __proto__: null,
    executable: payload,
  };
  await importReport(page, JSON.stringify(unexpected));
  await expect(page.getByRole("alert")).toContainText("unsupported field");
  expect(errors).toEqual([]);
});

test("unavailable local storage remains usable and exports without a persistence claim", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: undefined,
    }),
  );
  const id = await startInspection(page, "Synthetic ephemeral storage example");
  await expect(page.getByText(/Local storage is unavailable/)).toBeVisible();
  await page
    .getByRole("button", { name: "Run quick scan", exact: true })
    .click();
  const report = await finishReport(page, id);
  expect(report.inspection.nickname).toBe(
    "Synthetic ephemeral storage example",
  );
  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: "This report isn’t saved in this browser",
    }),
  ).toBeVisible();
});

test("partial keyboard observations survive sidebar exit and refresh, with distinct retest attempts", async ({
  page,
}) => {
  const id = await startInspection(page, "Synthetic partial recovery example");
  await page
    .getByRole("button", { name: "Run quick scan", exact: true })
    .click();
  await page.getByRole("link", { name: /Run your checks/ }).click();
  await page
    .locator(".inspection-check")
    .filter({
      has: page.getByRole("heading", { name: "Keyboard", exact: true }),
    })
    .getByRole("button", { name: "Start", exact: true })
    .click();
  await page.getByRole("group", { name: /^Keyboard test area/ }).click();
  await page.keyboard.press("a");
  await page.keyboard.press("b");
  await expect(page.getByText("2 keys received", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: /Review & report/ }).click();
  const keyboardResult = page
    .locator(".result-item")
    .filter({
      has: page.getByRole("heading", { name: "Keyboard", exact: true }),
    });
  await expect(keyboardResult).toContainText(
    "Partial browser observations are retained.",
  );
  await page.reload();
  await expect(keyboardResult).toContainText(
    "Partial browser observations are retained.",
  );
  const report = await finishReport(page, id);
  const attempts = report.inspection.attempts.filter(
    (a) => a.testId === "KEY-01",
  );
  expect(attempts).toHaveLength(1);
  expect(attempts[0]).toMatchObject({
    status: "interrupted",
    finding: "not_assessed",
  });
  expect(
    attempts[0].facts.find((f) => f.key === "keyboard.distinct")?.value,
  ).toBe(2);
  expect(
    attempts[0].facts.filter((f) => f.key.startsWith("keyboard.key.")),
  ).toHaveLength(2);
  await page.goto(`/inspect/${id}/test/KEY-01`);
  const retest = page.getByRole("group", { name: /^Keyboard test area/ });
  await retest.dispatchEvent("keydown", { key: "é", code: "", bubbles: true });
  await retest.dispatchEvent("keyup", { key: "é", code: "", bubbles: true });
  await expect(page.getByText("1 keys received", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Not sure" }).click();
  await page.getByRole("button", { name: "Save result" }).click();
  const updated = await finishReport(page, id);
  const retakes = updated.inspection.attempts.filter((attempt) => attempt.testId === "KEY-01");
  expect(retakes).toHaveLength(2);
  const fallback = retakes.at(-1)!;
  expect(fallback.facts.find((f) => f.key === "keyboard.distinct")?.value).toBe(0);
  expect(fallback.facts.find((f) => f.key === "keyboard.fallbacks")?.value).toBe(1);
  expect(fallback.facts.filter((f) => f.key.startsWith("keyboard.key.")).map((f) => f.key)).toEqual(["keyboard.key.Unidentified-e9"]);
  expect(fallback.finding).toBe("not_assessed");
});

test("ordinary keyboard navigation can start an inspection and missing routes recover", async ({
  page,
}) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Start inspection", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Give it a name")).toBeVisible();
  await page.getByLabel("Give it a name").focus();
  await page.keyboard.type("Keyboard navigation example");
  await expect(page.getByLabel("Give it a name")).toHaveValue(
    "Keyboard navigation example",
  );
  await page.goto("/reports/missing-synthetic-report");
  await expect(
    page.getByRole("heading", {
      name: "This report isn’t saved in this browser",
    }),
  ).toBeVisible();
  await page.goto("/not-a-real-route");
  await expect(
    page.getByRole("heading", { name: "This page took a wrong turn" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to overview" }).click();
  await expect(page).toHaveURL(/\/$/);
});
