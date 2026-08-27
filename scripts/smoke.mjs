import { chromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';

const baseUrl = process.env.E2E_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1208/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath });
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } });
const page = await context.newPage();
page.setDefaultTimeout(8000);
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
const receiptDownloads = [];
const receiptDownloadsComplete = new Promise((resolve) => page.on('download', (download) => {
  receiptDownloads.push(download);
  if (receiptDownloads.length === 2) resolve();
}));
await page.getByRole('button', { name: 'Issue signed receipt' }).click();
const receipt = await receiptDownload;
await receiptDownloadsComplete;
const receiptPath = await receipt.path();
if (!receiptPath) throw new Error('Receipt download did not produce a file.');
const receiptText = await readFile(receiptPath, 'utf8');
if (!/Cryptographic signature/.test(receiptText) || !/separately saved/.test(receiptText) || !/IMG_1042\.CR3/.test(receiptText)) throw new Error('Printable receipt is missing its signature guidance or change rows.');
const signedReceiptDownload = receiptDownloads.find((download) => download.suggestedFilename() === 'metadata-change-receipt.receipt.json');
if (!signedReceiptDownload) throw new Error('Signed receipt JSON was not downloaded alongside the printable receipt.');
const signedReceiptPath = await signedReceiptDownload.path();
if (!signedReceiptPath) throw new Error('Signed receipt JSON did not produce a file.');
const signedReceiptText = await readFile(signedReceiptPath, 'utf8');
const signedReceipt = JSON.parse(signedReceiptText);
if (signedReceipt.format !== 'metadata-change-receipt/v2' || !signedReceipt.signature || !signedReceipt.keyId) throw new Error('Signed receipt JSON has no verifiable signature envelope.');

const keyDownload = page.waitForEvent('download');
await page.getByRole('button', { name: 'Download public verification material' }).click();
const publicKey = await keyDownload;
const publicKeyPath = await publicKey.path();
if (!publicKeyPath) throw new Error('Public verification material did not download.');
const publicKeyText = await readFile(publicKeyPath, 'utf8');
await page.locator('#signed-receipt-file').setInputFiles({ name: 'receipt.json', mimeType: 'application/json', buffer: Buffer.from(signedReceiptText) });
await page.locator('#verification-material-file').setInputFiles({ name: 'public-key.json', mimeType: 'application/json', buffer: Buffer.from(publicKeyText) });
await page.getByRole('button', { name: 'Verify receipt signature' }).click();
await page.getByText('Signature is valid for this exact receipt payload and public key.').waitFor();
signedReceipt.payload.changes[0].after = 'tampered after signing';
await page.locator('#signed-receipt-file').setInputFiles({ name: 'tampered-receipt.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(signedReceipt)) });
await page.getByRole('button', { name: 'Verify receipt signature' }).click();
await page.locator('#receipt-signature-status').getByText(/Signature mismatch/).waitFor();

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

const coldBrowser = await chromium.launch({ executablePath });
const coldContext = await coldBrowser.newContext({ viewport: { width: 390, height: 844 } });
const coldPage = await coldContext.newPage();
coldPage.setDefaultTimeout(8000);
const coldErrors = [];
coldPage.on('console', (message) => { if (message.type() === 'error') coldErrors.push(message.text()); });
coldPage.on('pageerror', (error) => coldErrors.push(String(error)));
coldPage.on('requestfailed', (request) => {
  const errorText = request.failure()?.errorText ?? 'failed';
  if (errorText !== 'net::ERR_ABORTED') coldErrors.push(`${request.url()} ${errorText}`);
});
await coldPage.goto(baseUrl, { waitUntil: 'networkidle' });
await coldPage.evaluate(() => navigator.serviceWorker.ready);
await coldPage.waitForFunction(() => navigator.serviceWorker.controller !== null);
await coldPage.reload({ waitUntil: 'networkidle' });
const controllerState = await coldPage.evaluate(() => ({ controlled: Boolean(navigator.serviceWorker.controller), state: navigator.serviceWorker.controller?.state ?? 'none' }));
if (!controllerState.controlled) throw new Error(`Cold-cache page is not controlled by its service worker: ${JSON.stringify(controllerState)}`);
const precache = await coldPage.evaluate(async () => {
  const keys = await caches.keys();
  const cached = await Promise.all(keys.map(async (key) => (await caches.open(key)).keys()));
  return cached.flat().map((request) => new URL(request.url).pathname);
});
if (!precache.some((path) => /^\/assets\/index-.*\.js$/u.test(path)) || !precache.some((path) => /^\/assets\/index-.*\.css$/u.test(path))) throw new Error('Cold-cache service worker did not precache the emitted JS and CSS shell.');
const pageAssetCache = await coldPage.evaluate(async () => {
  const urls = [
    ...[...document.querySelectorAll('script[src]')].map((element) => (element).src),
    ...[...document.querySelectorAll('link[rel="stylesheet"]')].map((element) => (element).href)
  ];
  return Promise.all(urls.map(async (url) => ({ url, cached: Boolean(await caches.match(url)) })));
});
if (pageAssetCache.some((asset) => !asset.cached)) throw new Error(`Service worker cache is missing a loaded shell asset: ${JSON.stringify(pageAssetCache)}`);
// Reload aborts the previous document's asset requests; only offline-reload failures below are actionable.
coldErrors.length = 0;
await coldContext.setOffline(true);
const offlineShell = await coldPage.evaluate(async () => {
  const urls = [
    ...[...document.querySelectorAll('script[src]')].map((element) => (element).src),
    ...[...document.querySelectorAll('link[rel="stylesheet"]')].map((element) => (element).href)
  ];
  return Promise.all(urls.map(async (url) => ({ url, status: (await fetch(url, { cache: 'reload' })).status })));
});
if (offlineShell.some((asset) => asset.status !== 200)) throw new Error(`Offline cache miss for an emitted shell asset: ${JSON.stringify(offlineShell)}`);
await coldPage.reload({ waitUntil: 'domcontentloaded' });
await coldPage.waitForTimeout(1000);
const offlineH1 = await coldPage.getByRole('heading', { level: 1, name: /Every edit/i }).count();
if (offlineH1 !== 1 || coldErrors.length) throw new Error(`Cold-cache offline reload failed: controller=${JSON.stringify(controllerState)}; h1=${offlineH1}; errors=${coldErrors.join('; ')}; body=${(await coldPage.locator('body').innerText()).slice(0, 300)}`);
await coldContext.close();
await coldBrowser.close();

console.log(JSON.stringify({ sourceRows: 5, plannedChanges: 4, verifiedChanges: 4, exceptions: 1, signedReceipt: true, tamperRejected: true, coldCacheOfflineReload: true, paidUnlock: true, consoleErrors: 0 }));
await browser.close();
