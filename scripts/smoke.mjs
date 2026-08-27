import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const baseUrl = process.env.E2E_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1208/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } });
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
page.on('pageerror', (error) => consoleErrors.push(String(error)));

await page.goto(baseUrl, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Try the sample' }).click();
await page.locator('#target-field').selectOption('caption');
await page.locator('#operation').selectOption('set');
await page.locator('#rule-value').fill('Audited caption');
await page.getByRole('button', { name: 'Preview affected rows' }).click();
await page.getByText('4', { exact: true }).first().waitFor();

const verificationCsv = 'filename,caption\nIMG_1042.CR3,Audited caption\nIMG_1043.CR3,Audited caption\nIMG_1044.CR3,Audited caption\nIMG_1046.CR3,Audited caption\n';
await page.locator('#verify-file').setInputFiles({ name: 'after.csv', mimeType: 'text/csv', buffer: Buffer.from(verificationCsv) });
await page.getByText('Verification matched').waitFor();

const receiptDownload = page.waitForEvent('download');
await page.getByRole('button', { name: 'Issue signed receipt' }).click();
const receipt = await receiptDownload;
const receiptPath = await receipt.path();
if (!receiptPath) throw new Error('Receipt download did not produce a file.');
const receiptText = await readFile(receiptPath, 'utf8');
if (!/SHA-256 evidence digest/.test(receiptText) || !/Canonical evidence/.test(receiptText) || !/IMG_1042\.CR3/.test(receiptText)) throw new Error('Receipt is missing its digest, embedded evidence, or change rows.');

const exceptionsDownload = page.waitForEvent('download');
await page.getByText('Exception list').click();
await page.getByRole('button', { name: /Download all exceptions CSV/ }).click();
const exceptions = await exceptionsDownload;
const exceptionsPath = await exceptions.path();
if (!exceptionsPath || !/Identity value is blank/.test(await readFile(exceptionsPath, 'utf8'))) throw new Error('Exception CSV is incomplete.');

if (consoleErrors.length) throw new Error(`Console errors: ${consoleErrors.join('; ')}`);
await page.evaluate(() => navigator.serviceWorker.ready);
await context.setOffline(true);
await page.locator('#offline-banner:not([hidden])').waitFor();
await context.setOffline(false);
await page.route('https://api.sociobot.in/api/v1/products/metadata-change-receipt/verify*', (route) => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null })
}));
await page.goto(`${baseUrl}/?license=test-license-token`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Plus unlocked' }).waitFor();
if (page.url().includes('license=')) throw new Error('Returned license token was not stripped from the URL.');
const storedLicense = await page.evaluate(() => localStorage.getItem('sb_license:metadata-change-receipt'));
if (storedLicense !== 'test-license-token') throw new Error('Returned license token was not stored with the product key.');

console.log(JSON.stringify({ sourceRows: 5, plannedChanges: 4, verifiedChanges: 4, exceptions: 1, receiptDigest: true, offlineState: true, paidUnlock: true, consoleErrors: 0 }));
await browser.close();
