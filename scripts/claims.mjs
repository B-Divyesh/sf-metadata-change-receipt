import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { preview } from 'vite';

const root = new URL('..', import.meta.url).pathname;
if (!existsSync(`${root}dist/index.html`)) execFileSync('npm', ['run', 'build'], { cwd: root, stdio: 'inherit' });

const server = await preview({ root, logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } });
const address = server.httpServer.address();
if (!address || typeof address === 'string') throw new Error('The claim server did not start.');
const baseUrl = `http://127.0.0.1:${address.port}`;
const executablePath = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1208/chrome-linux64/chrome';
const browser = await chromium.launch({ executablePath });
const evidenceDirectory = '/work/.evidence/claims';
await mkdir(evidenceDirectory, { recursive: true });

const sampleCsv = `filename,date,caption,keywords,rating
IMG_1042.CR3,2024-05-16,Heron at the west pond,bird; wetlands,5
IMG_1043.CR3,2024-05-16,Heron lifting off,bird,4
IMG_1044.CR3,not-a-date,Reeds after rain,landscape,3
,2024-05-17,Unidentified frame,review,1
IMG_1046.CR3,2024-05-17,Boardwalk detail,architecture; blue hour,4`;

async function gotoDemo(page) {
  await page.goto(`${baseUrl}/demo`, { waitUntil: 'networkidle' });
  await page.getByText('Demo — sample data, nothing is saved').waitFor();
  await page.locator('#results:not([hidden])').waitFor();
}

async function downloadFrom(page, locator) {
  const pending = page.waitForEvent('download');
  await locator.click();
  const download = await pending;
  const path = await download.path();
  assert(path, `Download ${download.suggestedFilename()} has no readable path.`);
  return { name: download.suggestedFilename(), text: await readFile(path, 'utf8') };
}

async function issueReceipt(page) {
  const downloads = [];
  const complete = new Promise((resolve) => {
    const listener = async (download) => {
      const path = await download.path();
      if (!path) return;
      downloads.push({ name: download.suggestedFilename(), text: await readFile(path, 'utf8') });
      if (downloads.length === 2) {
        page.off('download', listener);
        resolve();
      }
    };
    page.on('download', listener);
  });
  await page.getByRole('button', { name: 'Issue signed receipt' }).click();
  await complete;
  return {
    printable: downloads.find((item) => item.name.endsWith('.html')),
    signed: downloads.find((item) => item.name.endsWith('.receipt.json'))
  };
}

async function loadRealSample(page) {
  await page.locator('#csv-file').setInputFiles({ name: 'sample-bird-survey.csv', mimeType: 'text/csv', buffer: Buffer.from(sampleCsv) });
  await page.locator('#target-field').selectOption('caption');
  await page.locator('#operation').selectOption('set');
  await page.locator('#rule-value').fill('Archive review complete');
  await page.getByRole('button', { name: 'Preview affected rows' }).click();
  await page.locator('#results:not([hidden])').waitFor();
}

const tests = [
  {
    id: 'demo-isolation',
    tag: '@claim:demo-isolation',
    async run({ page }) {
      await page.addInitScript(() => {
        if (location.pathname === '/demo') {
          localStorage.setItem('metadata-receipt:recipes', '[{"name":"real record"}]');
          localStorage.setItem('sb_license:metadata-change-receipt', 'real-license-sentinel');
        }
      });
      await gotoDemo(page);
      assert.equal(await page.locator('#stats strong').first().textContent(), '4');
      await issueReceipt(page);
      const state = await page.evaluate(async () => ({
        recipes: localStorage.getItem('metadata-receipt:recipes'),
        license: localStorage.getItem('sb_license:metadata-change-receipt'),
        demoActive: sessionStorage.getItem('demo:metadata-change-receipt:active'),
        demoKey: sessionStorage.getItem('demo:metadata-change-receipt:key-id'),
        databases: (await indexedDB.databases()).map((database) => database.name)
      }));
      assert.equal(state.recipes, '[{"name":"real record"}]');
      assert.equal(state.license, 'real-license-sentinel');
      assert.equal(state.demoActive, '1');
      assert.match(state.demoKey || '', /^[A-Za-z0-9_-]{40,}$/);
      assert(!state.databases.includes('metadata-change-receipt-keys'));
      await page.reload({ waitUntil: 'networkidle' });
      await page.locator('#results:not([hidden])').waitFor();
      await issueReceipt(page);
      const reloadedDemoKey = await page.evaluate(() => sessionStorage.getItem('demo:metadata-change-receipt:key-id'));
      assert.notEqual(reloadedDemoKey, state.demoKey);
      await page.getByRole('button', { name: 'Reset demo' }).click();
      await page.getByText('Demo reset to five sample records, four changes, and one exception.').waitFor();
      assert.equal(await page.locator('#stats strong').first().textContent(), '4');
      await page.getByRole('link', { name: 'Start for real' }).first().click();
      await page.waitForURL(`${baseUrl}/`);
      assert.equal(await page.locator('.demo-banner').count(), 0);
      assert.deepEqual(await page.evaluate(() => ({
        recipes: localStorage.getItem('metadata-receipt:recipes'),
        license: localStorage.getItem('sb_license:metadata-change-receipt'),
        demoKeys: Object.keys(sessionStorage).filter((key) => key.startsWith('demo:'))
      })), { recipes: '[{"name":"real record"}]', license: 'real-license-sentinel', demoKeys: [] });
    }
  },
  {
    id: 'local-private-flow',
    tag: '@claim:local-private-flow',
    async run({ page }) {
      const origins = new Set();
      page.on('request', (request) => origins.add(new URL(request.url()).origin));
      await gotoDemo(page);
      await page.locator('#verify-file').setInputFiles({
        name: 'after.csv', mimeType: 'text/csv',
        buffer: Buffer.from('filename,caption\nIMG_1042.CR3,Archive review complete\nIMG_1043.CR3,Archive review complete\nIMG_1044.CR3,Archive review complete\nIMG_1046.CR3,Archive review complete\n')
      });
      await page.getByText('Verification matched').waitFor();
      await issueReceipt(page);
      assert.deepEqual([...origins], [new URL(baseUrl).origin]);
    }
  },
  {
    id: 'offline-reload',
    tag: '@claim:offline-reload',
    async run({ context, page }) {
      await gotoDemo(page);
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload({ waitUntil: 'networkidle' });
      await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
      await context.setOffline(true);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.getByRole('heading', { level: 1, name: 'Review a sample metadata receipt' }).waitFor();
      await page.getByText('Demo — sample data, nothing is saved').waitFor();
      assert.equal(await page.locator('#stats strong').first().textContent(), '4');
    }
  },
  {
    id: 'field-transformations',
    tag: '@claim:field-transformations',
    async run({ page }) {
      await gotoDemo(page);
      await page.locator('#target-field').selectOption('keywords');
      await page.locator('#operation').selectOption('append-keywords');
      await page.locator('#rule-value').fill('archive; reviewed');
      await page.getByRole('button', { name: 'Preview affected rows' }).click();
      assert.match(await page.locator('#changes-body').innerText(), /bird; wetlands; archive; reviewed/);

      await page.locator('#target-field').selectOption('date');
      await page.locator('#operation').selectOption('shift-date');
      await page.locator('#rule-days').fill('1');
      await page.getByRole('button', { name: 'Preview affected rows' }).click();
      assert.match(await page.locator('#changes-body').innerText(), /2024-05-17/);

      const iptcCsv = 'filename,IPTCHeadline\nA.CR3,Old title\nB.CR3,Second title';
      await page.locator('#csv-file').setInputFiles({ name: 'iptc.csv', mimeType: 'text/csv', buffer: Buffer.from(iptcCsv) });
      await page.locator('#target-field').selectOption('IPTCHeadline');
      await page.locator('#operation').selectOption('set');
      await page.locator('#rule-value').fill('Archive title');
      await page.getByRole('button', { name: 'Preview affected rows' }).click();
      assert.equal(await page.locator('#changes-body ins').allTextContents().then((values) => values.filter((value) => value === 'Archive title').length), 2);
    }
  },
  {
    id: 'source-unchanged',
    tag: '@claim:source-unchanged',
    async run({ page }) {
      await gotoDemo(page);
      const original = 'filename,caption\nA.CR3,Original caption\nB.CR3,Second caption';
      await page.locator('#csv-file').setInputFiles({ name: 'original.csv', mimeType: 'text/csv', buffer: Buffer.from(original) });
      await page.locator('#target-field').selectOption('caption');
      await page.locator('#operation').selectOption('set');
      await page.locator('#rule-value').fill('Planned caption');
      await page.getByRole('button', { name: 'Preview affected rows' }).click();
      const planned = await downloadFrom(page, page.getByRole('button', { name: 'Export planned CSV' }));
      const selectedFileText = await page.locator('#csv-file').evaluate((input) => input.files?.[0]?.text());
      assert.equal(await selectedFileText, original);
      assert.match(planned.text, /Planned caption/);
      assert(!original.includes('Planned caption'));
    }
  },
  {
    id: 'exact-once-10000',
    tag: '@claim:exact-once-10000',
    async run({ page }) {
      await gotoDemo(page);
      const lines = ['filename,keywords'];
      for (let index = 0; index < 10_000; index += 1) lines.push(`IMG_${String(index).padStart(5, '0')}.jpg,nature`);
      await page.locator('#csv-file').setInputFiles({ name: 'fixture-10000.csv', mimeType: 'text/csv', buffer: Buffer.from(lines.join('\n')) });
      await page.locator('#target-field').selectOption('keywords');
      await page.locator('#operation').selectOption('append-keywords');
      await page.locator('#rule-value').fill('archive');
      await page.getByRole('button', { name: 'Preview affected rows' }).click();
      await page.getByText('Showing first 100 of 10,000 changes. Downloads contain all rows.').waitFor();
      const output = await downloadFrom(page, page.getByRole('button', { name: 'Download changes CSV' }));
      const rows = output.text.trim().split('\n').slice(1);
      assert.equal(rows.length, 10_000);
      assert.equal(new Set(rows.map((row) => row.split(',')[1])).size, 10_000);
      assert.match(rows[0], /IMG_00000\.jpg/);
      assert.match(rows.at(-1) || '', /IMG_09999\.jpg/);
    }
  },
  {
    id: 'csv-exports',
    tag: '@claim:csv-exports',
    async run({ page }) {
      await gotoDemo(page);
      const changes = await downloadFrom(page, page.getByRole('button', { name: 'Download changes CSV' }));
      const planned = await downloadFrom(page, page.getByRole('button', { name: 'Export planned CSV' }));
      await page.getByText('Exception list', { exact: true }).click();
      const exceptions = await downloadFrom(page, page.getByRole('button', { name: 'Download all exceptions CSV' }));
      assert.equal(changes.text.trim().split('\n').length, 5);
      assert.equal(planned.text.trim().split('\n').length, 6);
      assert.match(exceptions.text, /Identity value is blank/);
      assert.match(changes.text, /^row_number,identity,field,before,after/m);
    }
  },
  {
    id: 'verification-exceptions',
    tag: '@claim:verification-exceptions',
    async run({ page }) {
      await gotoDemo(page);
      const after = 'filename,caption\nIMG_1042.CR3,Archive review complete\nIMG_1043.CR3,Wrong caption\nIMG_1044.CR3,Archive review complete\nIMG_1044.CR3,Archive review complete';
      await page.locator('#verify-file').setInputFiles({ name: 'after.csv', mimeType: 'text/csv', buffer: Buffer.from(after) });
      await page.getByText('Differences found').waitFor();
      await page.getByText('Exception list', { exact: true }).click();
      const exceptions = await downloadFrom(page, page.getByRole('button', { name: 'Download all exceptions CSV' }));
      assert.match(exceptions.text, /Value does not match/);
      assert.match(exceptions.text, /more than once/);
      assert.match(exceptions.text, /missing from the verification export/);
    }
  },
  {
    id: 'signed-receipt',
    tag: '@claim:signed-receipt',
    async run({ page }) {
      await gotoDemo(page);
      const receipt = await issueReceipt(page);
      assert(receipt.printable && receipt.signed);
      assert.match(receipt.printable.text, /Cryptographic signature/);
      const signed = JSON.parse(receipt.signed.text);
      assert.equal(signed.format, 'metadata-change-receipt/v2');
      assert.equal(signed.algorithm, 'ECDSA-P256-SHA256');
      assert.match(signed.signature, /^[A-Za-z0-9_-]+$/);
      const key = await downloadFrom(page, page.getByRole('button', { name: 'Download public verification file' }));
      await page.locator('#signed-receipt-file').setInputFiles({ name: receipt.signed.name, mimeType: 'application/json', buffer: Buffer.from(receipt.signed.text) });
      await page.locator('#verification-material-file').setInputFiles({ name: key.name, mimeType: 'application/json', buffer: Buffer.from(key.text) });
      await page.getByRole('button', { name: 'Verify receipt signature' }).click();
      await page.getByText('Signature is valid for this exact receipt and public verification file.').waitFor();
    }
  },
  {
    id: 'tamper-detection',
    tag: '@claim:tamper-detection',
    async run({ page }) {
      await gotoDemo(page);
      const receipt = await issueReceipt(page);
      assert(receipt.signed);
      const key = await downloadFrom(page, page.getByRole('button', { name: 'Download public verification file' }));
      const changed = JSON.parse(receipt.signed.text);
      changed.payload.changes[0].after = 'Changed after signing';
      await page.locator('#signed-receipt-file').setInputFiles({ name: 'changed.receipt.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(changed)) });
      await page.locator('#verification-material-file').setInputFiles({ name: key.name, mimeType: 'application/json', buffer: Buffer.from(key.text) });
      await page.getByRole('button', { name: 'Verify receipt signature' }).click();
      await page.locator('#receipt-signature-status').getByText(/Signature mismatch/).waitFor();
    }
  },
  {
    id: 'local-signing-key',
    tag: '@claim:local-signing-key',
    async run({ page }) {
      await gotoDemo(page);
      await page.getByRole('link', { name: 'Start for real' }).first().click();
      await loadRealSample(page);
      const first = await issueReceipt(page);
      assert(first.signed);
      const firstKeyId = JSON.parse(first.signed.text).keyId;
      await page.reload({ waitUntil: 'networkidle' });
      await loadRealSample(page);
      const second = await issueReceipt(page);
      assert(second.signed);
      assert.equal(JSON.parse(second.signed.text).keyId, firstKeyId);
      const databases = await page.evaluate(async () => (await indexedDB.databases()).map((database) => database.name));
      assert(databases.includes('metadata-change-receipt-keys'));
    }
  },
  {
    id: 'plus-price',
    tag: '@claim:plus-price',
    async run({ page }) {
      await gotoDemo(page);
      await page.getByText('$19', { exact: true }).waitFor();
      await page.getByRole('link', { name: 'Start for real' }).last().click();
      const checkout = await page.getByRole('link', { name: 'Buy Plus in hosted checkout' }).getAttribute('href');
      assert(checkout);
      const response = await fetch(checkout, { redirect: 'manual' });
      assert.equal(response.status, 303);
      const location = response.headers.get('location');
      assert(location?.startsWith('https://checkout.dodopayments.com/'));
      const checkoutHtml = await (await fetch(location)).text();
      assert.match(checkoutHtml, /one_time_price/);
      assert.match(checkoutHtml, /\$19\.00/);
      assert.match(checkoutHtml, /USD/);
    }
  },
  {
    id: 'daily-license-check',
    tag: '@claim:daily-license-check',
    async run({ page }) {
      let checks = 0;
      await page.route('https://api.sociobot.in/api/v1/products/metadata-change-receipt/verify*', async (route) => {
        checks += 1;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null }) });
      });
      await gotoDemo(page);
      await page.getByRole('link', { name: 'Start for real' }).first().click();
      await page.goto(`${baseUrl}/?license=daily-check-fixture`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.body.classList.contains('is-plus'));
      await page.reload({ waitUntil: 'networkidle' });
      await page.reload({ waitUntil: 'networkidle' });
      assert.equal(checks, 1);
      assert(!page.url().includes('license='));
    }
  },
  {
    id: 'plus-deliverables',
    tag: '@claim:plus-deliverables',
    async run({ page }) {
      await page.route('https://api.sociobot.in/api/v1/products/metadata-change-receipt/verify*', (route) => route.fulfill({
        status: 200, contentType: 'application/json', body: JSON.stringify({ valid: true, reason: 'ok', expires_at: null })
      }));
      await gotoDemo(page);
      await page.getByRole('link', { name: 'Start for real' }).first().click();
      await page.goto(`${baseUrl}/?license=plus-feature-fixture`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.body.classList.contains('is-plus'));
      await loadRealSample(page);
      page.once('dialog', (dialog) => dialog.accept('Caption review'));
      await page.getByRole('button', { name: /Save recipe/ }).click();
      assert.match(await page.evaluate(() => localStorage.getItem('metadata-receipt:recipes') || ''), /Caption review/);
      await page.locator('#receipt-note').fill('Job 2048');
      const receipt = await issueReceipt(page);
      assert.equal(JSON.parse(receipt.signed.text).payload.note, 'Job 2048');
      const evidence = await downloadFrom(page, page.getByRole('button', { name: /JSON evidence/ }));
      assert.equal(JSON.parse(evidence.text).note, 'Job 2048');
    }
  }
];

const grepArgument = process.argv.find((argument) => argument.startsWith('@claim:'))
  ?? (process.argv.includes('--grep') ? process.argv[process.argv.indexOf('--grep') + 1] : undefined);
const selected = grepArgument ? tests.filter((test) => test.tag === grepArgument) : tests;
if (!selected.length) throw new Error(`No claim test matches ${grepArgument}.`);

const report = [];
try {
  for (const test of selected) {
    const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    page.setDefaultTimeout(20_000);
    const consoleErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => consoleErrors.push(String(error)));
    const startedAt = Date.now();
    try {
      await test.run({ context, page });
      assert.deepEqual(consoleErrors, []);
      await page.screenshot({ path: `${evidenceDirectory}/${test.id}.png`, fullPage: true });
      report.push({ id: test.id, tag: test.tag, status: 'passed', duration_ms: Date.now() - startedAt });
      console.log(`PASS ${test.tag}`);
    } catch (error) {
      await page.screenshot({ path: `${evidenceDirectory}/${test.id}-failed.png`, fullPage: true }).catch(() => {});
      report.push({ id: test.id, tag: test.tag, status: 'failed', error: String(error), duration_ms: Date.now() - startedAt });
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await writeFile('/work/.evidence/claims-result.json', JSON.stringify({ baseUrl, report }, null, 2));
  await browser.close();
  await server.close();
}

console.log(JSON.stringify({ claims: report.length, passed: report.filter((item) => item.status === 'passed').length }));
