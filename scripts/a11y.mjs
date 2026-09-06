import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright-core';

const baseUrl = process.env.A11Y_URL || 'http://127.0.0.1:5173';
const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1208/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const reports = [];

for (const path of ['/', '/demo', '/privacy', '/terms', '/404.html']) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'networkidle' });
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  reports.push({ path, violations: results.violations });
}

await browser.close();
const violations = reports.flatMap((report) => report.violations.map((violation) => ({ path: report.path, id: violation.id, impact: violation.impact, description: violation.description, targets: violation.nodes.flatMap((node) => node.target) })));
console.log(JSON.stringify({ baseUrl, violations }, null, 2));
if (violations.length) process.exit(1);
