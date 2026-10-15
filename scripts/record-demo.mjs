/**
 * Record the real TESTDRIVE UI in an isolated Playwright browser profile.
 * This is a software walkthrough. Input events and specifications are synthetic;
 * nothing here establishes the condition of a physical keyboard or display.
 *
 * PowerShell:
 *   $env:PLAYWRIGHT_BROWSERS_PATH = Join-Path $env:LOCALAPPDATA 'ms-playwright'
 *   $env:TD_DEMO_URL='http://127.0.0.1:4173'
 *   node scripts/record-demo.mjs
 */
import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const base = (process.env.TD_DEMO_URL || 'http://127.0.0.1:4173').replace(/\/$/, '');
const output = path.resolve('docs/evidence/demo-browser-walkthrough.webm');
const recordingDirectory = path.resolve('tmp/demo-recording');
const fixture = path.resolve('tests/fixtures/windows-system-information-synthetic.txt');
const nickname = 'DEMO — synthetic specifications';
const provenance = 'SOFTWARE WALKTHROUGH · SYNTHETIC SPECS · NO PHYSICAL DEVICE VALIDATION';
const errors = [];
await mkdir(path.dirname(output), { recursive: true });
await mkdir(recordingDirectory, { recursive: true });
assert.match(await readFile(fixture, 'utf8'), /SYNTHETIC EXAMPLE/);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 960 },
  recordVideo: { dir: recordingDirectory, size: { width: 1440, height: 960 } },
  acceptDownloads: true,
  locale: 'en-US',
  timezoneId: 'America/New_York',
  reducedMotion: 'reduce',
});
// This annotation describes the recording; no app logic, storage, measurements,
// permission behavior, or result is mocked or overwritten.
await context.addInitScript(({ provenance }) => {
  window.addEventListener('DOMContentLoaded', () => {
    const label = document.createElement('div');
    label.id = 'testdrive-demo-provenance';
    label.textContent = provenance;
    label.style.cssText = 'position:fixed;bottom:0;left:0;right:0;padding:8px 16px;background:#132b29;color:#fff;font:11px/1.4 system-ui;text-align:center;z-index:2147483647;pointer-events:none;letter-spacing:.04em';
    document.body.append(label);
  });
}, { provenance });
const page = await context.newPage();
const video = page.video();
page.setDefaultTimeout(15_000);
page.on('pageerror', error => errors.push(error.message));
const startedAt = Date.now();
const recordedAt = new Date().toISOString();
let completed = false;
async function pause(ms = 1500) { await page.waitForTimeout(ms); }
async function chapter(text) {
  console.log(text);
  await page.evaluate(({ text, provenance }) => {
    const label = document.getElementById('testdrive-demo-provenance');
    if (label) label.textContent = `${text}  |  ${provenance}`;
  }, { text, provenance });
}
async function show(locator) {
  await locator.scrollIntoViewIfNeeded();
  await pause(500);
}
async function moveTo(locator) {
  await locator.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const box = await locator.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 12 });
}
async function clickVisibleControl(locator) {
  // Use a real pointer event at the visible control. This avoids the runner's
  // repeated actionability retries when a below-fold control is hover-shifted.
  await moveTo(locator);
  await pause(250);
  const box = await locator.boundingBox();
  assert.ok(box, 'Expected a rendered control');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
async function type(locator, text) {
  await locator.click();
  await locator.pressSequentially(text, { delay: 55 });
}
try {
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Start inspection', exact: true }).waitFor();
  await chapter('01 · Know the device before you buy it');
  await pause(2000);
  await moveTo(page.getByRole('button', { name: 'Start inspection', exact: true }));
  await pause(700);
  await page.getByRole('button', { name: 'Start inspection', exact: true }).click();
  await page.waitForURL(/\/inspect\/[^/]+\/setup$/);
  const id = page.url().match(/\/inspect\/([^/]+)\//)[1];
  await chapter('02 · Set up a clearly labeled demo inspection');
  await page.getByRole('button', { name: 'Computer', exact: true }).click();
  await type(page.getByLabel('Give it a name'), nickname);
  await pause();
  const plan = page.getByRole('heading', { name: 'Your inspection plan', exact: true });
  await show(plan);
  await pause();
  await page.getByRole('button', { name: 'Run quick scan', exact: true }).click();
  await chapter('03 · Run the actual browser observations');
  await pause();
  await page.getByRole('button', { name: 'Run quick scan', exact: true }).click();
  await page.getByText('Your quick scan is saved.', { exact: true }).waitFor({ timeout: 25_000 });
  await pause();
  await clickVisibleControl(page.getByRole('button', { name: 'Continue to hands-on checks' }));
  await page.waitForURL(/\/inspect\/[^/]+\/tests$/);
  await chapter('04 · Measurements and hands-on checks stay distinct');
  await pause(2000);

  await page.goto(`${base}/inspect/${id}/test/KEY-01`);
  await chapter('05 · Keyboard receives browser key events from the test runner');
  const keyboard = page.getByRole('group', { name: /^Keyboard test area/ });
  await show(keyboard);
  await keyboard.click();
  for (const key of ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v', 'b', 'Space', 'ArrowLeft', 'ArrowRight']) {
    await page.keyboard.down(key);
    await pause(150);
    await page.keyboard.up(key);
    await pause(80);
  }
  await page.keyboard.press('Escape');
  await page.getByText('19 keys received', { exact: true }).waitFor();
  await pause();
  await page.getByRole('button', { name: 'Not sure', exact: false }).click();
  await page.getByLabel('Optional note').fill('Automated browser key events only. Physical keyboard quality was not assessed.');
  await pause(1000);
  await page.getByRole('button', { name: 'Save result' }).click();

  await page.goto(`${base}/inspect/${id}/test/DISP-01`);
  await chapter('06 · Display patterns advance only on deliberate button presses');
  await page.getByRole('button', { name: 'Show first pattern' }).click();
  await show(page.locator('.td-display-surface'));
  for (let index = 0; index < 7; index++) {
    await pause(1000);
    await page.getByRole('button', { name: 'Next pattern', exact: true }).click();
  }
  await page.getByText('8 / 8 patterns shown', { exact: true }).waitFor();
  await pause();
  await page.getByRole('button', { name: 'Not sure', exact: false }).click();
  await page.getByLabel('Optional note').fill('Automated software walkthrough. Patterns rendered; no person assessed a physical display.');
  await pause(1000);
  await page.getByRole('button', { name: 'Save result' }).click();

  await page.getByRole('link', { name: /Specifications/ }).click();
  await chapter('07 · Import the repository’s explicitly synthetic Windows fixture');
  await pause();
  await page.locator('input[type=file]').setInputFiles(fixture);
  const preview = page.getByRole('heading', { name: 'Review extracted fields' });
  await show(preview);
  await pause(2000);
  await page.getByLabel('I confirm this report describes the device I’m inspecting.').check();
  await chapter('Demo fixture confirmation · this synthetic file describes no physical device');
  await pause(1000);
  await page.getByRole('button', { name: 'Use these specifications' }).click();
  await type(page.getByLabel('Claimed installed memory'), '16 GB');
  await page.getByRole('button', { name: 'Save seller claims' }).click();
  await chapter('08 · A seller claim of 16 GB differs from the synthetic imported 8 GB');
  const comparison = page.locator('.comparison').first();
  await show(comparison);
  assert.match(await comparison.innerText(), /16 GB/);
  assert.match(await comparison.innerText(), /8.00 GB/);
  await pause(2000);

  await page.getByRole('link', { name: /Review & report/ }).click();
  await chapter('09 · Review findings, uncertainty, and remaining checks');
  await pause(2000);
  await page.getByLabel('Anything else to remember?').fill('SOFTWARE DEMO. The imported specifications and seller claim are synthetic and describe no physical device. Automated key events and rendered display patterns demonstrate app behavior only; hardware quality was not assessed. Other hands-on checks remain untested.');
  await page.getByRole('button', { name: 'Finish & create report' }).click();
  await page.waitForURL(/\/reports\/[^/]+$/);
  await chapter('10 · Keep an honest local report, including what is unknown');
  await page.getByRole('heading', { level: 1, name: nickname }).waitFor();
  await pause(2000);
  await show(page.getByRole('heading', { name: 'Inspection findings', exact: true }));
  await pause(2000);
  await show(page.getByRole('heading', { name: 'What this report means', exact: true }));
  await pause(2000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await chapter('11 · Export portable JSON or use the browser’s Print / Save PDF control');
  const downloaded = page.waitForEvent('download');
  await moveTo(page.getByRole('button', { name: 'Export JSON', exact: true }));
  await pause(700);
  await page.getByRole('button', { name: 'Export JSON', exact: true }).click();
  const download = await downloaded;
  const exported = JSON.parse(await readFile(await download.path(), 'utf8'));
  assert.equal(exported.inspection.nickname, nickname);
  assert.equal(exported.inspection.profileFacts.find(f => f.key === 'installed_memory').value, '8.00 GB');
  assert.equal(exported.inspection.sellerClaims[0].value, '16 GB');
  assert.equal(exported.inspection.attempts.find(a => a.testId === 'KEY-01').humanAnswer, 'not_sure');
  assert.equal(exported.inspection.attempts.find(a => a.testId === 'DISP-01').humanAnswer, 'not_sure');
  await pause(1000);
  await moveTo(page.getByRole('button', { name: 'Print / Save PDF', exact: true }));
  // The real print control is shown but deliberately not clicked: opening a
  // native OS dialog is outside this isolated browser recording.
  await pause(1800);
  assert.deepEqual(errors, []);
  completed = true;
} finally {
  await context.close();
  await browser.close();
}

if (completed) {
  await video.saveAs(output);
  const elapsedSeconds = Math.round((Date.now() - startedAt) / 1000);
  await writeFile(path.resolve('docs/evidence/DEMO.md'), `# Silent browser walkthrough\n\n- Recording: [demo-browser-walkthrough.webm](demo-browser-walkthrough.webm)\n- Captured: ${recordedAt}\n- App origin: ${base}\n- Format: silent WebM, 1440 × 960, approximately ${elapsedSeconds} seconds.\n- Runner: \`node scripts/record-demo.mjs\` (optional \`TD_DEMO_URL\` environment variable).\n\nThis is a real isolated Chromium browser recording of TESTDRIVE. A narrow provenance banner annotates the UI; the runner does not replace app results or page screens. The sequence starts an inspection, performs the actual quick scan, sends keyboard events through Playwright, advances display patterns with their actual controls, imports the repository's explicitly synthetic Windows fixture, compares a synthetic 16 GB seller claim against its 8 GB imported memory, creates a report, and downloads its JSON through the real export button. The Print / Save PDF control is shown; no native print dialog is opened.\n\nThe inspection is named “${nickname}”. Imported specifications and seller claims are synthetic and describe no physical device. The demo checks the import confirmation only to exercise the software workflow with that fixture. Keyboard and display answers are recorded as **Not sure** with explanatory notes; no person confirmed physical hardware quality. The automated key events are browser input events, not proof of working physical keys. Rendering a display pattern is not proof of a healthy panel. Remaining guided checks remain untested. The browser's quick-scan observations describe only the automated browser session. No personal browser profile, real camera, microphone, or existing inspection data is used.\n\nThis artifact is a software demonstration, not a physical device test, hardware certification, or evidence of real iPhone/Safari testing. It is kept in the local workspace and is not published by the recording script.\n`);
  console.log(`Saved ${output} (${elapsedSeconds}s workflow wall time).`);
}
