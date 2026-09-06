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

async function assertNavigationGeometry(path, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  const result = await page.locator('header, footer').evaluateAll((containers) => containers.map((container) => {
    const targets = [...container.querySelectorAll('a, button')]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          name: element.getAttribute('aria-label') || element.textContent?.trim() || element.tagName,
          width: rect.width,
          height: rect.height,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom
        };
      });
    const separations = [];
    for (let first = 0; first < targets.length; first += 1) {
      for (let second = first + 1; second < targets.length; second += 1) {
        const a = targets[first];
        const b = targets[second];
        const horizontal = Math.max(a.left - b.right, b.left - a.right, 0);
        const vertical = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
        separations.push({ pair: `${a.name} / ${b.name}`, distance: Math.hypot(horizontal, vertical) });
      }
    }
    return { landmark: container.tagName.toLowerCase(), targets, separations };
  }));

  for (const container of result) {
    for (const target of container.targets) {
      assert(target.width >= 44 && target.height >= 44,
        `${path} ${viewport.width}px ${container.landmark} target ${target.name} is ${target.width.toFixed(2)}×${target.height.toFixed(2)}px`);
    }
    for (const separation of container.separations) {
      assert(separation.distance >= 8,
        `${path} ${viewport.width}px ${container.landmark} targets ${separation.pair} are ${separation.distance.toFixed(2)}px apart`);
    }
  }
}

async function assertNavigationKeyboardFocus(viewport) {
  await page.setViewportSize(viewport);
  await page.goto(`${baseUrl}/privacy`, { waitUntil: 'networkidle' });
  const expected = await page.locator('header a:visible, header button:visible, footer a:visible, footer button:visible').evaluateAll((targets) => targets.map((target, index) => {
    const id = `navigation-target-${index}`;
    target.setAttribute('data-navigation-test-id', id);
    return id;
  }));
  const reached = new Set();
  for (let press = 0; press < 40 && reached.size < expected.length; press += 1) {
    await page.keyboard.press('Tab');
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return null;
      const id = element.getAttribute('data-navigation-test-id');
      if (!id) return null;
      const style = getComputedStyle(element);
      return { id, outlineStyle: style.outlineStyle, outlineWidth: Number.parseFloat(style.outlineWidth) };
    });
    if (focus) {
      assert.notEqual(focus.outlineStyle, 'none', `${focus.id} has no visible keyboard focus style`);
      assert(focus.outlineWidth >= 3, `${focus.id} focus outline is only ${focus.outlineWidth}px`);
      reached.add(focus.id);
    }
  }
  assert.deepEqual([...reached].sort(), expected.sort(), `${viewport.width}px navigation targets were not all reached with Tab`);
}

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
  await assertNavigationGeometry(path, { width: 390, height: 844 });
}

for (const viewport of [{ width: 320, height: 800 }, { width: 1440, height: 1000 }]) {
  for (const [path] of routes) await assertNavigationGeometry(path, viewport);
}
await assertNavigationKeyboardFocus({ width: 390, height: 844 });
await assertNavigationKeyboardFocus({ width: 1440, height: 1000 });

await page.setViewportSize({ width: 390, height: 844 });
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

console.log(JSON.stringify({ baseUrl, routes: routes.length, navigationTargets: '44x44 with 8px separation', phoneWidths: [320, 390], desktopWidth: 1440, keyboard: true, reducedMotion: true, textZoom: true, errors: 0 }));
await context.close();
await browser.close();
