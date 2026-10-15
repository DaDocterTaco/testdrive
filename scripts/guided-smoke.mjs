import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (message) => {
  if (message.type() === "error") console.log("Console:", message.text());
});
page.on("requestfailed", (request) =>
  console.log("Request failed:", request.url(), request.failure()?.errorText),
);
const base = process.env.TD_QA_URL || "http://127.0.0.1:4176";
async function open(title) {
  await page.goto(`${base}/tests`);
  await page
    .locator(".test-grid")
    .waitFor({ timeout: 10000 })
    .catch(async (e) => {
      console.log("Page body:", await page.locator("body").innerText());
      console.log("Page errors:", errors);
      throw e;
    });
  await page
    .locator(".test-card")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) })
    .getByRole("button", { name: "Run check" })
    .click();
  await page.locator(".td-workbench").waitFor();
}
try {
  await open("Keyboard");
  await page.locator(".td-keyboard").click();
  await page.keyboard.down("a");
  await page.keyboard.down("a");
  await page.keyboard.up("a");
  await page.getByText("1 keys received", { exact: true }).waitFor();
  await page.keyboard.press("b");
  await page.keyboard.press("Escape");
  await page.getByText("3 keys received", { exact: true }).waitFor();
  assert.equal(
    await page
      .locator(".td-keyboard")
      .evaluate((e) => e === document.activeElement),
    false,
  );
  await page.getByRole("button", { name: "Looks / sounds right" }).click();
  await page.getByRole("button", { name: "Save result" }).click();
  await page.waitForURL(/\/tests$/);
  console.log(
    "Keyboard: distinct codes, repeat ignored, release and Escape focus exit verified.",
  );

  await open("Mouse & trackpad");
  const surface = page.locator(".td-pointer-area");
  const box = await surface.boundingBox();
  await page.mouse.move(box.x + 100, box.y + 50);
  await page.mouse.click(box.x + 100, box.y + 50);
  await page.mouse.click(box.x + 100, box.y + 50, { button: "right" });
  await page.mouse.wheel(0, 100);
  await page
    .locator(".td-metrics")
    .getByText("1", { exact: true })
    .first()
    .waitFor();
  const handle = await page.locator(".td-drag-handle").boundingBox();
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.82, box.y + box.height * 0.5, {
    steps: 8,
  });
  await page.mouse.up();
  assert.match(
    await page.locator(".td-metrics").innerText(),
    /1\s*Drag complete/,
  );
  console.log(
    "Pointer: movement, primary/secondary, wheel and target drag verified.",
  );

  await open("Touchscreen");
  const touchBox = await page.locator(".td-touch-grid").boundingBox();
  await page.mouse.click(touchBox.x + 10, touchBox.y + 10);
  assert.equal(await page.locator(".td-touch-grid .touched").count(), 0);
  const cdp = await page.context().newCDPSession(page);
  const x = touchBox.x + touchBox.width / 12,
    y = touchBox.y + touchBox.height / 20;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x, y, id: 1 },
      { x: x + touchBox.width / 6, y, id: 2 },
    ],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await page.getByText("2 / 60 areas touched", { exact: true }).waitFor();
  await page.getByText("2 simultaneous touches", { exact: true }).waitFor();
  await page.setViewportSize({ width: 600, height: 900 });
  await page.getByText("0 / 60 areas touched", { exact: true }).waitFor();
  console.log(
    "Touch: mouse excluded, two real browser touch samples map to two cells, multitouch and resize reset verified (emulated, not physical hardware).",
  );

  await page.setViewportSize({ width: 1280, height: 900 });
  await open("Camera");
  await page.evaluate(() => {
    window.__cameraCalls = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        window.__cameraCalls++;
        throw new DOMException("denied", "NotAllowedError");
      },
    });
  });
  assert.equal(await page.evaluate(() => window.__cameraCalls), 0);
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await page.getByText(/Access was not allowed/).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Looks / sounds right" })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Skip this check" }).click();
  console.log(
    "Camera: no automatic permission prompt, denial copy and positive assessment gate verified.",
  );

  await open("Camera");
  await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext("2d");
    let n = 0;
    window.__canvasTimer = setInterval(() => {
      ctx.fillStyle = n++ % 2 ? "#008800" : "#888800";
      ctx.fillRect(0, 0, 320, 240);
    }, 30);
    window.__firstCamera = canvas.captureStream(15);
    window.__lateCamera = canvas.captureStream(15);
    let calls = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () =>
        ++calls === 1
          ? Promise.resolve(window.__firstCamera)
          : new Promise((resolve) => {
              window.__resolveCamera = resolve;
            }),
    });
  });
  await page.getByRole("button", { name: "Start camera", exact: true }).click();
  await page.getByText("320 × 240 · video received", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Looks / sounds right" })
      .isEnabled(),
    true,
  );
  await page.getByRole("button", { name: "Front camera", exact: true }).click();
  await page.getByRole("button", { name: "Cancel opening" }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Looks / sounds right" })
      .isDisabled(),
    true,
  );
  assert.equal(
    await page.evaluate(() => window.__firstCamera.getTracks()[0].readyState),
    "ended",
  );
  await page.getByRole("button", { name: "Cancel opening" }).click();
  await page.evaluate(() => window.__resolveCamera(window.__lateCamera));
  await page.waitForFunction(
    () => window.__lateCamera.getTracks()[0].readyState === "ended",
  );
  await page.evaluate(() => clearInterval(window.__canvasTimer));
  console.log(
    "Camera simulated stream: real frame observations, current-source reset, previous track stop, and late-stream cancellation cleanup verified.",
  );

  await open("Microphone");
  await page.evaluate(() => {
    window.__micCalls = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => {
        window.__micCalls++;
        return new Promise(() => {});
      },
    });
  });
  assert.equal(await page.evaluate(() => window.__micCalls), 0);
  await page.getByRole("button", { name: "Start microphone sample" }).click();
  await page.getByRole("button", { name: "Cancel opening" }).click();
  await page.getByText(/Opening was cancelled/).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Looks / sounds right" })
      .isDisabled(),
    true,
  );
  console.log(
    "Microphone: explicit start and cancellable permission wait verified.",
  );

  await open("Microphone");
  await page.evaluate(() => {
    const ctx = new AudioContext();
    window.__audioSourceContext = ctx;
    const osc = ctx.createOscillator();
    osc.frequency.value = 440;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    const dest = ctx.createMediaStreamDestination();
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    ctx.resume();
    window.__audioSource = dest.stream;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: () => Promise.resolve(dest.stream),
    });
  });
  await page.getByRole("button", { name: "Start microphone sample" }).click();
  await page.getByText("Sound input received", { exact: false }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "Looks / sounds right" })
      .isDisabled(),
    true,
  );
  await page.locator("audio").waitFor({ timeout: 9000 });
  assert.equal(
    await page.evaluate(() => window.__audioSource.getTracks()[0].readyState),
    "ended",
  );
  await page.locator("audio").evaluate((e) => e.play());
  await page.waitForFunction(
    () => !document.querySelector(".td-answer-options button").disabled,
  );
  await page.evaluate(() => window.__audioSourceContext.close());
  console.log(
    "Microphone simulated audio: analyser receives live samples, max-five-second recording stops input, playback enables human clarity assessment.",
  );

  await open("Speakers");
  await page.evaluate(() => {
    window.__speakerMediaCalls = 0;
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      configurable: true,
      value: async () => {
        window.__speakerMediaCalls++;
        throw new Error("Speakers must not request input");
      },
    });
  });
  assert.equal(
    await page
      .getByRole("button", { name: "Looks / sounds right" })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Play both", exact: true }).click();
  await page
    .getByRole("status")
    .getByText("Playing both", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Stop all sound" }).click();
  await page
    .getByRole("status")
    .getByText("Sound stopped", { exact: true })
    .waitFor();
  assert.equal(await page.evaluate(() => window.__speakerMediaCalls), 0);
  assert.equal(
    await page
      .getByRole("button", { name: "Looks / sounds right" })
      .isEnabled(),
    true,
  );
  console.log(
    "Speakers: deliberate play, scheduled browser audio, always-available Stop and no input permission request verified. Physical audibility remains a human check.",
  );

  await open("Display");
  assert.equal(
    await page
      .getByRole("button", { name: "Looks / sounds right" })
      .isDisabled(),
    true,
  );
  await page.getByRole("button", { name: "Show first pattern" }).click();
  await page.getByText("1 / 8 patterns shown", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Next pattern", exact: true }).click();
  await page.getByText("2 / 8 patterns shown", { exact: true }).waitFor();
  console.log(
    "Display: patterns appear only after user action, manual progression and assessment gate verified.",
  );
  assert.deepEqual(errors, []);
  console.log("All guided UI smoke checks passed; no page errors.");
} finally {
  await browser.close();
}
