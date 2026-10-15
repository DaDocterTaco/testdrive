import { expect, test } from "@playwright/test";
import {
  assertNoHorizontalOverflow,
  assess,
  downloadReport,
  evidence,
  saveGuided,
} from "./helpers";
import type { Page } from "@playwright/test";
import path from "node:path";

async function fastStart(page: Page): Promise<string> {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Start inspection", exact: true })
    .click();
  await expect(page).toHaveURL(/\/inspect\/[^/]+\/scan/);
  await expect(
    page.getByText("Your quick scan is saved.", { exact: true }),
  ).toBeVisible();
  return page.url().match(/\/inspect\/([^/]+)\//)![1];
}

async function saveAndExport(page: Page, id: string) {
  await saveGuided(page);
  await page.goto(`/inspect/${id}/review`);
  await page.getByRole("button", { name: "Finish & create report" }).click();
  return downloadReport(page);
}

test("one click starts automatic checks without requesting camera or microphone", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as Window & { testMediaCalls?: number };
    state.testMediaCalls = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        state.testMediaCalls!++;
        throw new DOMException("Synthetic denial", "NotAllowedError");
      },
    });
  });
  const id = await fastStart(page);
  expect(
    await page.evaluate(
      () => (window as Window & { testMediaCalls?: number }).testMediaCalls,
    ),
  ).toBe(0);
  await expect(
    page.locator(".scan-task .status").filter({ hasText: "Observed" }),
  ).toHaveCount(3);
  await page
    .getByRole("button", { name: "Continue to keyboard", exact: true })
    .click();
  await expect(page).toHaveURL(new RegExp(`/inspect/${id}/test/KEY-01$`));
  await expect(
    page.getByRole("group", { name: /^Keyboard test area/ }),
  ).toBeVisible();
  await assertNoHorizontalOverflow(page);
});

test("keyboard capture has explicit entry, prevents page defaults and exits by triple Escape, mouse or inactivity", async ({
  page,
}) => {
  const id = await fastStart(page);
  await page.goto(`/inspect/${id}/test/KEY-01`);
  const start = page.getByRole("button", {
    name: "Start keyboard test",
    exact: true,
  });
  const exit = page.getByRole("button", {
    name: "Exit keyboard test",
    exact: true,
  });
  await expect(start).toBeVisible();
  const defaultAllowedBefore = await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        code: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(defaultAllowedBefore).toBe(true);
  await start.click();
  await expect(exit).toBeVisible();
  const defaultAllowedDuring = await page.evaluate(() => {
    const results = ["Tab", "MetaLeft", "F5"].map((code) => {
      const accepted = window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: code,
          code,
          bubbles: true,
          cancelable: true,
        }),
      );
      window.dispatchEvent(
        new KeyboardEvent("keyup", {
          key: code,
          code,
          bubbles: true,
          cancelable: true,
        }),
      );
      return accepted;
    });
    return results;
  });
  expect(defaultAllowedDuring).toEqual([false, false, false]);
  await page.keyboard.press("Escape");
  await expect(exit).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(exit).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(start).toBeVisible();
  const defaultAllowedAfter = await page.evaluate(() =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Tab",
        code: "Tab",
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  expect(defaultAllowedAfter).toBe(true);
  await start.click();
  await exit.click();
  await expect(start).toBeVisible();
  await page.clock.install();
  await start.click();
  await page.clock.fastForward(50_000);
  await page.keyboard.press("a");
  await page.clock.fastForward(59_000);
  await expect(exit).toBeVisible();
  await page.clock.fastForward(2_000);
  await expect(start).toBeVisible();
  await expect(page.getByText(/inactiv/i).first()).toBeVisible();
  await evidence(
    page,
    "keyboard-capture-exit-software-test.png",
    "Synthetic key events and virtual clock · browser capture exits verified · OS shortcuts not physically tested",
  );
});

test("ASUS Copilot chord credits the AI key and Escape dots show, reset and confirm exit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // Exercise the documented standard-capture branch without a platform fullscreen prompt.
    Object.defineProperty(Element.prototype, "requestFullscreen", {
      configurable: true,
      value: async () => {
        throw new DOMException("Software fallback test", "NotAllowedError");
      },
    });
  });
  const id = await fastStart(page);
  await page.goto(`/inspect/${id}/test/KEY-01`);
  await page
    .getByLabel("Keyboard model · US English")
    .selectOption("asus-zenbook-duo-ux8406ca-us");
  await page.clock.install({ time: new Date("2026-10-15T04:00:00Z") });
  await page.clock.pauseAt(new Date("2026-10-15T04:00:01Z"));
  await page
    .getByRole("button", { name: "Start keyboard test", exact: true })
    .click();
  const copilot = page.locator('[data-code="Copilot"]');
  const shift = page.locator('[data-code="ShiftLeft"]');
  const windows = page.locator('[data-code="MetaLeft"]');
  const dots = page.locator(".td-escape-dot");
  await expect(dots).toHaveCount(3);
  await expect(
    page.getByLabel("Escape progress: 0 of 3", { exact: true }),
  ).toBeVisible();
  await page.evaluate(() => {
    for (const type of ["keydown", "keyup"])
      window.dispatchEvent(
        new KeyboardEvent(type, {
          key: "F23",
          code: "F23",
          bubbles: true,
          cancelable: true,
        }),
      );
  });
  await expect(copilot).toHaveAttribute("data-key-state", "unseen");
  await page.evaluate(() => {
    for (const event of [
      { type: "keydown", code: "MetaLeft", key: "Meta", metaKey: true },
      {
        type: "keydown",
        code: "ShiftLeft",
        key: "Shift",
        metaKey: true,
        shiftKey: true,
      },
      {
        type: "keydown",
        code: "F23",
        key: "F23",
        metaKey: true,
        shiftKey: true,
      },
      { type: "keyup", code: "F23", key: "F23", metaKey: true, shiftKey: true },
      { type: "keyup", code: "ShiftLeft", key: "Shift", metaKey: true },
      { type: "keyup", code: "MetaLeft", key: "Meta" },
    ])
      window.dispatchEvent(
        new KeyboardEvent(event.type, {
          ...event,
          bubbles: true,
          cancelable: true,
        }),
      );
  });
  await expect(copilot).toHaveAttribute("data-key-state", "released");
  await expect(shift).toHaveAttribute("data-key-state", "compound");
  await expect(windows).toHaveAttribute("data-key-state", "compound");
  await page.keyboard.press("Shift");
  await expect(shift).toHaveAttribute("data-key-state", "released");
  await page.keyboard.press("Escape");
  await expect(
    page.getByLabel("Escape progress: 1 of 3", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.td-escape-dot[data-filled="true"]')).toHaveCount(
    1,
  );
  await page.clock.runFor(2_250);
  await expect(
    page.getByLabel("Escape progress: 0 of 3", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.td-escape-dot[data-filled="true"]')).toHaveCount(
    0,
  );
  await page.keyboard.press("Escape");
  await page.keyboard.press("a");
  await expect(
    page.getByLabel("Escape progress: 0 of 3", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(
    page.getByLabel("Escape progress: 2 of 3", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.td-escape-dot[data-filled="true"]')).toHaveCount(
    2,
  );
  await evidence(
    page,
    "copilot-escape-two-dots-software-test.png",
    "Synthetic Win+Shift+F23 input · Escape progress 2 of 3 · software behavior only",
  );
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Start keyboard test", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByLabel("Escape progress: 3 of 3", { exact: true }),
  ).toBeVisible();
  await expect(page.locator('.td-escape-dot[data-filled="true"]')).toHaveCount(
    3,
  );
  await expect(copilot).toHaveAttribute("data-key-state", "released");
  await evidence(
    page,
    "copilot-chord-escape-dots-software-test.png",
    "Synthetic Win+Shift+F23 browser events · AI shortcut and exit progress verified · no physical AI key validation",
  );
  await assess(page, "Not sure");
  const report = await saveAndExport(page, id);
  const keyboard = report.inspection.attempts.find(
    (attempt) => attempt.testId === "KEY-01",
  )!;
  expect(
    keyboard.facts.find(
      (fact) => fact.key === "keyboard.copilot.shortcut_count",
    )?.value,
  ).toBe(1);
  expect(
    keyboard.facts.find((fact) => fact.key === "keyboard.copilot.released")
      ?.value,
  ).toBe(true);
  expect(
    keyboard.facts.find((fact) => fact.key === "keyboard.key.MetaLeft")?.value,
  ).toContain("release received");
  expect(
    keyboard.facts.find((fact) => fact.key === "keyboard.core_complete")?.value,
  ).toBe(3);
});

test("pointer challenge automatically verifies each required action and excludes touch", async ({
  page,
}) => {
  const id = await fastStart(page);
  await page.goto(`/inspect/${id}/test/PTR-01`);
  const surface = page.locator(".td-pointer-area");
  await page
    .getByRole("button", { name: "Start pointer challenge", exact: true })
    .click();
  await surface.scrollIntoViewIfNeeded();
  const box = await surface.boundingBox();
  expect(box).toBeTruthy();
  const point = (x: number, y: number) => ({
    x: box!.x + box!.width * x,
    y: box!.y + box!.height * y,
  });
  const first = point(0.22, 0.32);
  await surface.dispatchEvent("pointermove", {
    pointerType: "touch",
    clientX: first.x,
    clientY: first.y,
    pointerId: 2,
  });
  await expect(surface).toHaveAttribute("data-step", "move-one");
  await page.mouse.move(first.x, first.y, { steps: 4 });
  await expect(surface).toHaveAttribute("data-step", "move-two");
  const second = point(0.78, 0.66);
  await page.mouse.move(second.x, second.y, { steps: 8 });
  await expect(surface).toHaveAttribute("data-step", "primary");
  const center = point(0.5, 0.5);
  await page.mouse.click(center.x, center.y);
  await expect(surface).toHaveAttribute("data-step", "double");
  await page.mouse.dblclick(center.x, center.y);
  await expect(surface).toHaveAttribute("data-step", "secondary");
  await page.mouse.click(center.x, center.y, { button: "right" });
  await expect(surface).toHaveAttribute("data-step", "scroll-down");
  await page.mouse.wheel(0, 3);
  await expect(surface).toHaveAttribute("data-step", "scroll-down");
  await surface.dispatchEvent("wheel", {
    deltaY: 3,
    deltaMode: 1,
    bubbles: true,
    cancelable: true,
  });
  await expect(surface).toHaveAttribute("data-step", "scroll-up");
  await page.mouse.wheel(0, -120);
  await expect(surface).toHaveAttribute("data-step", "drag");
  const start = point(0.18, 0.5),
    end = point(0.8, 0.5);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await page.mouse.up();
  await expect(surface).toHaveAttribute("data-step", "complete");
  await expect(
    page.getByText("Pointer challenge complete", { exact: true }),
  ).toBeVisible();
  await evidence(
    page,
    "pointer-automatic-challenge-software-test.png",
    "Automated pointer input · challenge software verification · no physical mouse validation",
  );
  const report = await saveAndExport(page, id);
  const result = report.inspection.attempts.find(
    (attempt) => attempt.testId === "PTR-01",
  )!;
  expect(result.status).toBe("completed");
  expect(result.finding).toBe("observed");
  expect(result.humanAnswer).toBeUndefined();
  expect(result.facts.some((fact) => fact.key === "human.answer")).toBe(false);
  expect(
    result.facts.find((fact) => fact.key === "pointer.primary")?.value,
  ).toBeGreaterThan(0);
  expect(
    result.facts.find((fact) => fact.key === "pointer.secondary")?.value,
  ).toBeGreaterThan(0);
  expect(
    result.facts.find((fact) => fact.key === "pointer.double")?.value,
  ).toBeGreaterThan(0);
  expect(
    result.facts.find((fact) => fact.key === "pointer.drag")?.value,
  ).toBeGreaterThan(0);
});

test("camera and microphone automatically analyze bounded synthetic streams and stop capture", async ({
  page,
}) => {
  const id = await fastStart(page);
  await page.goto(`/inspect/${id}/test/CAM-01`);
  await page.evaluate(() => {
    const state = window as Window & {
      qaCamera?: MediaStream;
      qaCanvasTimer?: number;
    };
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const context = canvas.getContext("2d")!;
    let frame = 0;
    state.qaCanvasTimer = window.setInterval(() => {
      context.fillStyle = frame++ % 2 ? "#48bd88" : "#e2e9ee";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }, 40);
    state.qaCamera = canvas.captureStream(15);
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => state.qaCamera,
    });
  });
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await expect(
    page.getByText("Video frames received", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            window as Window & { qaCamera?: MediaStream }
          ).qaCamera!.getTracks()[0].readyState,
      ),
    )
    .toBe("ended");
  await page.evaluate(() =>
    window.clearInterval(
      (window as Window & { qaCanvasTimer?: number }).qaCanvasTimer,
    ),
  );
  const cameraReport = await saveAndExport(page, id);
  const camera = cameraReport.inspection.attempts.find(
    (attempt) => attempt.testId === "CAM-01",
  )!;
  expect(camera.finding).toBe("observed");
  expect(camera.humanAnswer).toBeUndefined();
  expect(
    camera.facts.find((fact) => fact.key === "camera.sample_complete")?.value,
  ).toBe(true);
  await page.goto(`/inspect/${id}/test/MIC-01`);
  await page.evaluate(() => {
    const state = window as Window & {
      qaAudioContext?: AudioContext;
      qaMicrophone?: MediaStream;
      qaMicrophoneCalls?: number;
    };
    const context = new AudioContext();
    state.qaAudioContext = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0.4;
    const destination = context.createMediaStreamDestination();
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start();
    void context.resume();
    state.qaMicrophone = destination.stream;
    state.qaMicrophoneCalls = 0;
    Object.defineProperty(navigator.mediaDevices, "enumerateDevices", {
      configurable: true,
      value: async () => [
        {
          deviceId: "synthetic-second-mic",
          kind: "audioinput",
          label: "Synthetic second microphone",
          groupId: "software-test",
          toJSON: () => ({}),
        },
      ],
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        state.qaMicrophoneCalls!++;
        if (state.qaMicrophoneCalls === 1) return destination.stream;
        const next = context.createMediaStreamDestination();
        gain.connect(next);
        state.qaMicrophone = next.stream;
        return next.stream;
      },
    });
  });
  await expect(
    page.getByText("Testing my microphone, one two three.", { exact: false }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Start microphone sample", exact: true })
    .click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              window as Window & { qaMicrophone?: MediaStream }
            ).qaMicrophone!.getTracks()[0].readyState,
        ),
      { timeout: 12_000 },
    )
    .toBe("ended");
  await page.getByText("Use a different microphone", { exact: true }).click();
  await page
    .getByLabel("Microphone source")
    .selectOption("synthetic-second-mic");
  await expect(
    page.getByRole("button", { name: /^Save & (?:next check|review)/ }),
  ).toBeDisabled();
  await expect(page.locator("audio")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Start microphone sample", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as Window & { qaMicrophoneCalls?: number }).qaMicrophoneCalls,
    ),
  ).toBe(1);
  await page
    .getByRole("button", { name: "Start microphone sample", exact: true })
    .click();
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            (
              window as Window & { qaMicrophone?: MediaStream }
            ).qaMicrophone!.getTracks()[0].readyState,
        ),
      { timeout: 12_000 },
    )
    .toBe("ended");
  expect(
    await page.evaluate(
      () =>
        (window as Window & { qaMicrophoneCalls?: number }).qaMicrophoneCalls,
    ),
  ).toBe(2);
  await page.evaluate(() =>
    (
      window as Window & { qaAudioContext?: AudioContext }
    ).qaAudioContext?.close(),
  );
  const microphoneReport = await saveAndExport(page, id);
  const microphone = microphoneReport.inspection.attempts.find(
    (attempt) => attempt.testId === "MIC-01",
  )!;
  expect(microphone.finding).toBe("observed");
  expect(microphone.humanAnswer).toBeUndefined();
  expect(
    microphone.facts.find((fact) => fact.key === "microphone.sample_complete")
      ?.value,
  ).toBe(true);
  expect(
    microphone.facts.some(
      (fact) =>
        /speech.*match|phrase.*match/.test(fact.key) && fact.value === true,
    ),
  ).toBe(false);
});

test("battery check records reported charge and a real browser event without claiming battery health", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const battery = Object.assign(new EventTarget(), {
      level: 0.72,
      charging: false,
    });
    (window as Window & { qaBattery?: typeof battery }).qaBattery = battery;
    Object.defineProperty(navigator, "getBattery", {
      configurable: true,
      value: async () => battery,
    });
  });
  const id = await fastStart(page);
  await page.goto(`/inspect/${id}/test/PWR-01`);
  await expect(page.getByText("72%", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Check charger connection", exact: true })
    .click();
  await page.evaluate(() => {
    const battery = (
      window as Window & { qaBattery?: EventTarget & { charging: boolean } }
    ).qaBattery!;
    battery.charging = true;
    battery.dispatchEvent(new Event("chargingchange"));
  });
  await expect(
    page.getByText("Power change detected", { exact: true }),
  ).toBeVisible();
  const report = await saveAndExport(page, id);
  const result = report.inspection.attempts.find(
    (attempt) => attempt.testId === "PWR-01",
  )!;
  expect(result.finding).toBe("observed");
  expect(result.humanAnswer).toBeUndefined();
  expect(
    result.facts.find((fact) => fact.key === "battery.level"),
  ).toMatchObject({ value: 72, source: "browser_reported" });
  expect(
    result.facts.find((fact) => fact.key === "battery.power_changes")?.value,
  ).toBe(1);
  expect(result.explanation).toContain("does not measure battery wear");
});

test("confirmed Zenbook system report selects its US keyboard without converting reference details into measured specs", async ({
  page,
}) => {
  const id = await fastStart(page);
  await page.goto(`/inspect/${id}/specs`);
  await page
    .locator("input[type=file]")
    .setInputFiles(
      path.resolve(
        "tests/fixtures/zenbook-duo-system-information-synthetic.txt",
      ),
    );
  await expect(
    page.getByRole("button", { name: "Use these specifications", exact: true }),
  ).toBeDisabled();
  await page
    .getByLabel("I confirm this report describes the device I’m inspecting.")
    .check();
  await page
    .getByRole("button", { name: "Use these specifications", exact: true })
    .click();
  await page.goto(`/inspect/${id}/test/KEY-01`);
  await expect(page.getByLabel("Keyboard model · US English")).toHaveValue(
    "asus-zenbook-duo-ux8406ca-us",
  );
  await expect(page.locator('[data-code="Copilot"]')).toBeVisible();
  await expect(page.locator('[data-code="Screenshot"]')).toBeVisible();
  await expect(page.locator('[data-code="ControlRight"]')).toHaveCount(0);
  await page
    .getByRole("button", { name: "Start keyboard test", exact: true })
    .click();
  await page.keyboard.press("a");
  await expect(page.locator('[data-code="KeyA"]')).toHaveAttribute(
    "data-key-state",
    "released",
  );
  await page
    .getByRole("button", { name: "Exit keyboard test", exact: true })
    .click();
  await evidence(
    page,
    "zenbook-reference-keyboard-synthetic-import.png",
    "Synthetic UX8406CA Windows import · US reference layout · no physical keyboard or personal system report used",
  );
  await page.goto(`/inspect/${id}/review`);
  await page.getByRole("button", { name: "Finish & create report" }).click();
  const report = await downloadReport(page);
  expect(
    report.inspection.profileFacts.find(
      (fact) => fact.key === "installed_memory",
    ),
  ).toMatchObject({ value: "32.0 GB", source: "imported_system_report" });
  expect(
    report.inspection.profileFacts.filter(
      (fact) =>
        fact.source === "measured" && /model|processor|memory/.test(fact.key),
    ),
  ).toHaveLength(0);
  const rememberedId = await fastStart(page);
  await page.goto(`/inspect/${rememberedId}/test/KEY-01`);
  await expect(page.getByLabel("Keyboard model · US English")).toHaveValue(
    "asus-zenbook-duo-ux8406ca-us",
  );
  await page.goto("/reports");
  await page
    .getByRole("button", { name: "Clear local data", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete local data", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("testdrive-keyboard-profile")),
    )
    .toBeNull();
  const clearedId = await fastStart(page);
  await page.goto(`/inspect/${clearedId}/test/KEY-01`);
  await expect(page.getByLabel("Keyboard model · US English")).toHaveValue(
    "generic-ansi-us",
  );
});

test("guided display tour advances slowly and still requires a human assessment", async ({
  page,
}) => {
  const id = await fastStart(page);
  await page.goto(`/inspect/${id}/test/DISP-01`);
  await page.clock.install();
  await page
    .getByRole("button", { name: "Start guided color tour", exact: true })
    .click();
  await expect(
    page.getByText("1 / 8 patterns shown", { exact: true }),
  ).toBeVisible();
  await page.clock.runFor(4_000);
  await expect(
    page.getByText("2 / 8 patterns shown", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause color tour", exact: true })
    .click();
  await page.clock.runFor(8_000);
  await expect(
    page.getByText("2 / 8 patterns shown", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Save & (?:next check|review)/ }),
  ).toBeDisabled();
});

test("silent microphone sample requests a closer look and does not claim phrase recognition", async ({
  page,
}) => {
  const id = await fastStart(page);
  await page.goto(`/inspect/${id}/test/MIC-01`);
  await page.evaluate(() => {
    const state = window as Window & {
      qaSilentContext?: AudioContext;
      qaSilentStream?: MediaStream;
    };
    Object.defineProperty(window, "SpeechRecognition", {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(window, "webkitSpeechRecognition", {
      configurable: true,
      value: undefined,
    });
    const context = new AudioContext();
    state.qaSilentContext = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    gain.gain.value = 0;
    const destination = context.createMediaStreamDestination();
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start();
    void context.resume();
    state.qaSilentStream = destination.stream;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => destination.stream,
    });
  });
  await page
    .getByRole("button", { name: "Start microphone sample", exact: true })
    .click();
  await expect(
    page.getByText("Sample finished · check your input", { exact: true }),
  ).toBeVisible({ timeout: 12_000 });
  await expect(
    page.getByText("Words not verified", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (
          window as Window & { qaSilentStream?: MediaStream }
        ).qaSilentStream!.getTracks()[0].readyState,
    ),
  ).toBe("ended");
  await page.evaluate(() =>
    (
      window as Window & { qaSilentContext?: AudioContext }
    ).qaSilentContext?.close(),
  );
  const report = await saveAndExport(page, id);
  const result = report.inspection.attempts.find(
    (attempt) => attempt.testId === "MIC-01",
  )!;
  expect(result.finding).toBe("attention");
  expect(result.humanAnswer).toBeUndefined();
  expect(
    result.facts.find((fact) => fact.key === "microphone.input")?.value,
  ).toBe(false);
  expect(
    result.facts.find((fact) => fact.key === "microphone.sound_samples")?.value,
  ).toBe(0);
  expect(result.explanation).not.toMatch(
    /broken|hardware failure|microphone failed/i,
  );
});

test("speaker output stays user-triggered, stoppable and separate from microphone access", async ({
  page,
}) => {
  const id = await fastStart(page);
  await page.goto(`/inspect/${id}/test/SPK-01`);
  await page.evaluate(() => {
    const state = window as Window & { qaInputCalls?: number };
    state.qaInputCalls = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        state.qaInputCalls!++;
        throw new Error("Output must not request input");
      },
    });
  });
  await expect(
    page.getByRole("button", { name: "Looks / sounds right" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Play both", exact: true }).click();
  await expect(
    page.getByRole("status").getByText("Playing both", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Stop all sound", exact: true })
    .click();
  await expect(
    page.getByRole("status").getByText("Sound stopped", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Looks / sounds right" }),
  ).toBeEnabled();
  expect(
    await page.evaluate(
      () => (window as Window & { qaInputCalls?: number }).qaInputCalls,
    ),
  ).toBe(0);
  await page.getByRole("button", { name: "Not sure" }).click();
  const report = await saveAndExport(page, id);
  const attempt = report.inspection.attempts.find(
    (value) => value.testId === "SPK-01",
  )!;
  expect(attempt.humanAnswer).toBe("not_sure");
  expect(attempt.finding).toBe("not_assessed");
});

test("cancelled camera and microphone requests stop late-arriving synthetic streams", async ({
  page,
}) => {
  const id = await fastStart(page);
  for (const item of [
    { id: "CAM-01", start: "Start camera" },
    { id: "MIC-01", start: "Start microphone sample" },
  ]) {
    await page.goto(`/inspect/${id}/test/${item.id}`);
    await page.evaluate(() => {
      const state = window as Window & {
        qaLateStream?: MediaStream;
        qaResolveStream?: (stream: MediaStream) => void;
        qaMediaCalls?: number;
      };
      const canvas = document.createElement("canvas");
      canvas.width = 20;
      canvas.height = 20;
      state.qaLateStream = canvas.captureStream(1);
      state.qaMediaCalls = 0;
      Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
        configurable: true,
        value: () => {
          state.qaMediaCalls!++;
          return new Promise<MediaStream>((resolve) => {
            state.qaResolveStream = resolve;
          });
        },
      });
    });
    expect(
      await page.evaluate(
        () => (window as Window & { qaMediaCalls?: number }).qaMediaCalls,
      ),
    ).toBe(0);
    await page.getByRole("button", { name: item.start, exact: true }).click();
    await page
      .getByRole("button", { name: "Cancel opening", exact: true })
      .click();
    await page.evaluate(() => {
      const state = window as Window & {
        qaLateStream?: MediaStream;
        qaResolveStream?: (stream: MediaStream) => void;
      };
      state.qaResolveStream!(state.qaLateStream!);
    });
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (
              window as Window & { qaLateStream?: MediaStream }
            ).qaLateStream!.getTracks()[0].readyState,
        ),
      )
      .toBe("ended");
    await expect(
      page.getByRole("button", { name: /^Save & (?:next check|review)/ }),
    ).toBeDisabled();
  }
});
