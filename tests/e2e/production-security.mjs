import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const origin = process.env.TD_E2E_BASE_URL;
assert(origin?.startsWith('https://'), 'Set TD_E2E_BASE_URL to the confirmed deployed HTTPS origin.');
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.__testdriveSecurityViolations = [];
    document.addEventListener('securitypolicyviolation', event => window.__testdriveSecurityViolations.push({ directive: event.violatedDirective, blockedURI: event.blockedURI }));
  });
  const page = await context.newPage();
  const requests = new Set(); const failures = []; const errors = []; const statuses = []; const violations = [];
  page.on('request', request => { if (/^https?:/.test(request.url())) requests.add(new URL(request.url()).origin); });
  page.on('requestfailed', request => failures.push({ url: new URL(request.url()).pathname, error: request.failure()?.errorText }));
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  let headers;
  for (const route of ['/', '/tests', '/reports', '/about', '/privacy', '/inspect/missing-synthetic/setup', '/reports/missing-synthetic']) {
    const response = await page.goto(`${origin}${route}`);
    assert.equal(response?.status(), 200, `SPA direct route ${route} must return200`);
    statuses.push({ route, status: response.status() });
    headers ??= response.headers();
    await page.locator('main h1, main h2').first().waitFor();
    assert.equal(await page.evaluate(() => window.isSecureContext), true);
    violations.push(...await page.evaluate(() => window.__testdriveSecurityViolations));
  }
  const response = await page.reload();
  assert.equal(response?.status(), 200);
  assert.match(await page.locator('main').innerText(), /This report isn’t saved in this browser/);
  const csp = headers['content-security-policy'];
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(headers['permissions-policy'], /camera=\(self\)/);
  assert.equal(headers['x-content-type-options'], 'nosniff');
  assert.deepEqual([...requests], [new URL(origin).origin], 'No third-party requests are expected.');
  assert.deepEqual(violations, [], 'CSP violations must be absent.');
  assert.deepEqual(failures, [], 'Static app requests must succeed.');
  assert.deepEqual(errors, [], 'Browser and console errors must be absent.');
  const evidence = { testedAtUTC: new Date().toISOString(), url: origin, browser: `Chromium ${browser.version()}`, scope: 'Production HTTPS software smoke; no physical hardware validation.', statuses, freshReload:200, requestOrigins:[...requests], csp, permissionsPolicy:headers['permissions-policy'], cspViolations:violations, failedRequests:failures, browserErrors:errors };
  await mkdir('docs/evidence/production', { recursive:true });
  await writeFile('docs/evidence/production/security-smoke.json', JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
} finally { await browser.close(); }
