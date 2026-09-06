import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const baseUrl = process.env.SITE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1208/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(10_000);
const errors = [];
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
page.on('pageerror', (error) => errors.push(String(error)));

const routes = [
  ['/', 'Metadata Change Receipt — plan and prove CSV changes', 'https://metadata-change-receipt.sociobot.in/'],
  ['/demo', 'Demo — Metadata Change Receipt', 'https://metadata-change-receipt.sociobot.in/demo'],
  ['/privacy', 'Privacy — Metadata Change Receipt', 'https://metadata-change-receipt.sociobot.in/privacy'],
  ['/terms', 'Terms — Metadata Change Receipt', 'https://metadata-change-receipt.sociobot.in/terms'],
  ['/404.html', 'Page not found — Metadata Change Receipt', 'https://metadata-change-receipt.sociobot.in/404']
];

for (const [path, title, canonical] of routes) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  assert.equal(await page.title(), title);
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.locator('main').count(), 1);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), canonical);
  assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), title);
  assert.equal(await page.locator('meta[name="twitter:card"]').getAttribute('content'), 'summary_large_image');
  assert.equal(await page.locator('meta[property="og:image"]').getAttribute('content'), 'https://metadata-change-receipt.sociobot.in/assets/metadata-change-receipt-social.jpg');
  assert.equal(await page.locator('link[rel="apple-touch-icon"][sizes="180x180"]').count(), 1);
  assert.equal(await page.locator('img:not([alt])').count(), 0);
  const width = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert(width.scroll <= width.client + 1, `${path} overflows horizontally: ${JSON.stringify(width)}`);
}

await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
await page.keyboard.press('Tab');
assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), 'Skip to main content');
await page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Privacy' }).click();
assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H1');
await page.goBack();
assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'H1');

await page.emulateMedia({ reducedMotion: 'reduce' });
const transitionDuration = await page.locator('.button.primary').first().evaluate((element) => getComputedStyle(element).transitionDuration);
assert.match(transitionDuration, /1e-05s|0\.00001s|0s/);
await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
const zoomed = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
assert(zoomed.scroll <= zoomed.client + 1, `The page overflows at 200% text size: ${JSON.stringify(zoomed)}`);

assert.deepEqual(errors, []);
if (process.env.SITE_EXPECT_404 === '1') {
  const response = await page.goto(`${baseUrl}/this-page-does-not-exist`, { waitUntil: 'networkidle' });
  assert.equal(response?.status(), 404);
  await page.getByRole('heading', { level: 1, name: 'This page does not exist' }).waitFor();
  assert(errors.every((message) => /Failed to load resource: the server responded with a status of 404/.test(message)));
}

console.log(JSON.stringify({ baseUrl, routes: routes.length, keyboard: true, reducedMotion: true, textZoom: true, errors: 0 }));
await context.close();
await browser.close();
