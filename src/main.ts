import './styles.css';
import {
  changesCsv,
  exceptionsCsv,
  parseCsv,
  planChanges,
  serializeCsv,
  verifyChanges,
  type CsvTable,
  type ExceptionEntry,
  type Operation,
  type PlanResult,
  type ReceiptPayload,
  type TransformRule,
  type VerificationResult
} from './engine.ts';
import { captureReturnedLicense, checkoutUrl, getLicenseState, saveLicense, verifyLicense, type LicenseState } from './license.ts';
import { getVerificationMaterial, resetDemoSigningKey, signReceipt, verifySignedReceipt, type SignedReceipt, type VerificationMaterial } from './trust.ts';

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('App mount point is missing.');
const app: HTMLDivElement = appElement;

let sourceTable: CsvTable | null = null;
let activePlan: PlanResult | null = null;
let verification: VerificationResult | null = null;
let licenseState: LicenseState = { token: '', unlocked: false, checking: false, reason: '' };
let isDemoMode = false;

const PRODUCT_ORIGIN = 'https://metadata-change-receipt.sociobot.in';
const DEMO_PREFIX = 'demo:metadata-change-receipt:';
const SAMPLE_CSV = `filename,date,caption,keywords,rating
IMG_1042.CR3,2024-05-16,Heron at the west pond,bird; wetlands,5
IMG_1043.CR3,2024-05-16,Heron lifting off,bird,4
IMG_1044.CR3,not-a-date,Reeds after rain,landscape,3
,2024-05-17,Unidentified frame,review,1
IMG_1046.CR3,2024-05-17,Boardwalk detail,architecture; blue hour,4`;

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function sharedHeader(): string {
  return `<header class="site-header">
    <a class="wordmark" href="/" aria-label="Metadata Change Receipt home"><img src="/mark.svg" width="40" height="40" alt=""><span>Metadata Change Receipt</span></a>
    <nav aria-label="Primary"><a href="/demo">Demo</a><a href="/#how-it-works">How it works</a><a href="/#plus">Plus</a><a href="/privacy">Privacy</a></nav>
  </header>`;
}

function sharedFooter(): string {
  return `<footer>
    <div><strong>Metadata Change Receipt</strong><p>Plan and verify photo metadata CSV changes in your browser.</p></div>
    <nav aria-label="Footer"><a href="/demo">Demo</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
    <p class="fine-print">Built by Param Factory · Version 1.1.0 · Original AI-generated artwork · No analytics or tracking.</p>
  </footer>`;
}

type RouteKind = 'home' | 'demo' | 'privacy' | 'terms' | 'not-found';

const routeMetadata: Record<RouteKind, { title: string; description: string; path: string }> = {
  home: {
    title: 'Metadata Change Receipt — plan and prove CSV changes',
    description: 'Plan and verify batch photo metadata CSV changes locally. Export a signed before-and-after receipt and a clear exception list.',
    path: '/'
  },
  demo: {
    title: 'Demo — Metadata Change Receipt',
    description: 'Try a five-row photo metadata change plan in an isolated demo. Review changes, exceptions, verification, and signed receipts.',
    path: '/demo'
  },
  privacy: {
    title: 'Privacy — Metadata Change Receipt',
    description: 'Learn which metadata stays in your browser and when license checks contact the Sociobot billing service.',
    path: '/privacy'
  },
  terms: {
    title: 'Terms — Metadata Change Receipt',
    description: 'Read the limits, receipt trust model, purchase terms, and responsibilities for Metadata Change Receipt.',
    path: '/terms'
  },
  'not-found': {
    title: 'Page not found — Metadata Change Receipt',
    description: 'The requested page does not exist. Return to Metadata Change Receipt or open its isolated demo.',
    path: '/404'
  }
};

function updateRouteMetadata(kind: RouteKind): void {
  const metadata = routeMetadata[kind];
  document.title = metadata.title;
  const canonical = `${PRODUCT_ORIGIN}${metadata.path}`;
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute('content', metadata.description);
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', canonical);
  for (const [selector, content] of [
    ['meta[property="og:title"]', metadata.title],
    ['meta[property="og:description"]', metadata.description],
    ['meta[property="og:url"]', canonical],
    ['meta[name="twitter:title"]', metadata.title],
    ['meta[name="twitter:description"]', metadata.description]
  ] as const) document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
}

function renderLegal(kind: 'privacy' | 'terms'): void {
  const isPrivacy = kind === 'privacy';
  updateRouteMetadata(kind);
  app.innerHTML = `${sharedHeader()}<main id="main" class="legal-page">
    <a class="back-link" href="/">← Back to the product</a>
    <p class="eyebrow">Effective 5 September 2026</p>
    <h1 tabindex="-1">${isPrivacy ? 'How your metadata is handled' : 'Terms for using Metadata Change Receipt'}</h1>
    ${isPrivacy ? `<section><h2>Data that stays local</h2><p>Your CSV files are processed in this browser. Filenames, captions, dates, keywords, previews, receipts, and exceptions are not uploaded.</p><p>The app uses no analytics, advertising, or tracking.</p></section>
    <section><h2>Data saved on your device</h2><p>A private signing key stays in IndexedDB after you issue a real receipt.</p><p>Demo signing keys disappear when the demo page reloads. Demo labels use a separate session-storage key.</p><p>A license token and its daily check result use local storage. Plus recipes also use local storage.</p><p>Clearing this site’s data removes these local records.</p></section>
    <section><h2>Network requests</h2><p>The app contacts Sociobot only when you buy or verify a license. The payment provider handles checkout under its own policy.</p><p>The app shell is cached on your device for later offline use.</p></section>
    <section><h2>Privacy questions</h2><p>Email <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>. Do not attach sensitive metadata files.</p></section>`
    : `<section><h2>What the app does</h2><p>The app plans CSV changes, compares a later export, and signs a receipt with a browser key.</p><p>It does not edit photos, write XMP or IPTC data, inspect pixels, or prove that another tool changed an image.</p></section>
    <section><h2>How receipt signatures work</h2><p>Check a receipt with its separately exported public verification file. Save that file where a receipt editor cannot replace it.</p><p>The key identifies this browser profile. It does not identify a person, organization, legal signer, or trusted time.</p><p>Clearing browser data prevents new receipts with the same key. A saved public verification file can still verify old receipts.</p></section>
    <section><h2>Your responsibility</h2><p>Keep backups and inspect the preview and exceptions. Test your external metadata tool on a small set first.</p><p>Use a stable, unique identity column for reliable checks.</p></section>
    <section><h2>Price and license</h2><p>The core receipt workflow is free. Plus costs $19 once for one person.</p><p>Plus includes local recipes, receipt notes, and a separate JSON evidence export.</p><p>Sociobot and Dodo handle payment and refunds. A refund revokes the license.</p></section>
    <section><h2>Warranty</h2><p>The software is provided “as is” under the MIT License. You remain responsible for your files and metadata work.</p></section>`}
  </main>${sharedFooter()}`;
}

function renderApp(demo: boolean): void {
  isDemoMode = demo;
  if (!demo) captureReturnedLicense();
  updateRouteMetadata(demo ? 'demo' : 'home');
  const demoBanner = demo ? `<aside class="demo-banner" aria-label="Demo controls"><strong>Demo — sample data, nothing is saved</strong><div><button class="text-button" id="reset-demo" type="button">Reset demo</button><a href="/" id="start-real">Start for real</a></div></aside>` : '';
  const firstScreen = demo ? `<section class="demo-intro" aria-labelledby="demo-title"><p class="eyebrow">Five sample photo records</p><h1 id="demo-title" tabindex="-1">Review a sample metadata receipt</h1><p>The sample already shows four planned caption changes and one missing filename.</p></section>` : `<section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">Local CSV planning and proof</p>
        <h1 id="hero-title" tabindex="-1">Plan and prove metadata CSV changes</h1>
        <p class="lede">For photographers and small archive managers who need a clear record before and after each batch edit.</p>
        <div class="hero-actions"><a class="button primary" href="/demo">Try it with sample data</a><a class="button quiet" href="#workbench">Start with your CSV</a></div>
        <p class="action-note">The demo loads five records and shows four planned edits.</p>
        <ul class="hero-facts"><li><strong>Private:</strong> your CSV stays in this browser.</li><li><strong>Offline:</strong> revisit after the first load.</li><li><strong>Price:</strong> the core is free. Plus costs $19 once.</li></ul>
      </div>
      <figure class="hero-art">
        <picture><source type="image/avif" srcset="/assets/receipt-worktable-768.avif 768w, /assets/receipt-worktable-1536.avif 1536w" sizes="(max-width: 700px) 768px, 800px"><source type="image/webp" srcset="/assets/receipt-worktable-768.webp 768w, /assets/receipt-worktable-1536.webp 1536w" sizes="(max-width: 700px) 768px, 800px"><img src="/assets/receipt-worktable-1536.jpg" srcset="/assets/receipt-worktable-768.jpg 768w, /assets/receipt-worktable-1536.jpg 1536w" sizes="(max-width: 700px) 768px, 800px" width="1536" height="1024" alt="Cobalt and vermillion paper records linked by a receipt" fetchpriority="high" decoding="async"></picture>
        <figcaption>A receipt links each old value to its planned replacement.</figcaption>
      </figure>
    </section>`;
  const plusPurchase = demo ? `<aside><p class="price"><strong>$19</strong> one time</p><p>One-person license. No subscription.</p><a class="button primary" href="/" id="demo-buy-real">Start for real</a><small>Leave the demo before buying or restoring a license.</small></aside>` : `<aside><p class="price"><strong>$19</strong> one time</p><p>One-person license. No subscription.</p><a class="button primary" href="${checkoutUrl}">Buy Plus in hosted checkout</a><button class="text-button" id="restore-license" type="button">Restore a license</button><p class="license-status" id="license-status" hidden></p><small>Sociobot and Dodo handle payment and refunds.</small></aside>`;
  const licenseDialog = demo ? '' : `<dialog id="license-dialog" aria-labelledby="license-title"><form method="dialog"><button class="dialog-close" value="cancel" aria-label="Close license dialog">×</button><p class="eyebrow">Metadata Change Receipt Plus</p><h2 id="license-title">Restore your license</h2><p>Paste the token from your purchase email. This browser stores it and checks it with Sociobot once a day.</p><label>License token<input id="license-token" type="text" autocomplete="off" spellcheck="false"></label><p id="license-message" class="form-message" aria-live="polite"></p><div class="dialog-actions"><a class="button quiet" href="${checkoutUrl}">Buy for $19 in hosted checkout</a><button class="button primary" id="verify-license" type="button">Verify license</button></div></form></dialog>`;
  app.innerHTML = `${sharedHeader()}${demoBanner}
  <div class="offline-banner" id="offline-banner" role="status" hidden><strong>Offline:</strong> the workbench still works. License checks will resume when you reconnect.</div>
  <aside class="update-toast" id="update-toast" role="status" hidden><p>An updated offline workbench is ready.</p><button class="button primary" id="apply-update" type="button">Reload update</button></aside>
  <main id="main">
    ${firstScreen}

    <section class="trust-strip" aria-label="Product boundaries">
      <p><strong>Reads</strong> exported CSV</p><span aria-hidden="true">→</span><p><strong>Plans</strong> field changes</p><span aria-hidden="true">→</span><p><strong>Checks</strong> a second export</p><span aria-hidden="true">→</span><p><strong>Writes</strong> receipts, not image files</p>
    </section>

    <section class="workbench" id="workbench" aria-labelledby="workbench-title">
      <div class="section-intro"><p class="eyebrow">CSV workbench</p><h2 id="workbench-title">Plan your metadata changes</h2><p>Your exported file is never changed. The app creates separate downloads.</p></div>

      <article class="workflow-step current" id="load-step">
        <div class="step-number" aria-hidden="true">01</div><div class="step-body">
          <div class="step-heading"><div><h3>Load the source CSV</h3><p>Use an export from Lightroom, ExifTool, your archive tool, or a spreadsheet.</p></div><span class="stamp" id="load-stamp">Waiting</span></div>
          <label class="drop-zone" id="drop-zone" for="csv-file">
            <span class="drop-icon" aria-hidden="true">⇩</span><strong>Drop a metadata CSV here</strong><span>or choose a file · read in this browser</span>
            <input id="csv-file" type="file" accept=".csv,text/csv">
          </label>
          <div class="file-summary" id="file-summary" hidden></div>
        </div>
      </article>

      <article class="workflow-step" id="plan-step" aria-disabled="true">
        <div class="step-number" aria-hidden="true">02</div><div class="step-body">
          <div class="step-heading"><div><h3>Describe the intended change</h3><p>Name the stable identifier, field, operation, and optional row condition.</p></div><span class="stamp" id="plan-stamp">Locked</span></div>
          <form id="rule-form">
            <fieldset id="rule-fields" disabled><legend class="sr-only">Transformation rule</legend>
              <div class="form-grid">
                <label>Identify each asset by<select id="identity-field" required></select><small>Usually filename, path, asset ID, or UUID.</small></label>
                <label>Change this field<select id="target-field" required></select><small>The original column is preserved in the receipt.</small></label>
                <label>Operation<select id="operation"><option value="set">Set exact value</option><option value="find-replace">Find and replace</option><option value="append-keywords">Append unique keywords</option><option value="prepend">Prepend text</option><option value="shift-date">Shift date by days</option></select></label>
                <label id="find-wrap" hidden>Find text<input id="find-value" type="text"></label>
                <label id="value-wrap">New value<input id="rule-value" type="text"><small id="value-help">Blank is allowed to clear a field.</small></label>
                <label id="days-wrap" hidden>Days to shift<input id="rule-days" type="number" value="1" step="1"><small>Use a negative number to move dates earlier.</small></label>
                <label>Only when<select id="condition-field"><option value="">All rows</option></select><small>Optional exact-match filter.</small></label>
                <label id="condition-wrap" hidden>Equals<input id="condition-value" type="text"></label>
              </div>
              <div class="rule-actions"><button class="button primary" type="submit">Preview affected rows</button><button class="button quiet plus-action" id="save-recipe" type="button">Save recipe <span>Plus</span></button><label class="recipe-picker" id="recipe-picker" hidden>Saved recipe<select id="saved-recipes"><option value="">Choose…</option></select></label></div>
            </fieldset>
          </form>
        </div>
      </article>

      <article class="workflow-step" id="receipt-step" aria-disabled="true">
        <div class="step-number" aria-hidden="true">03</div><div class="step-body">
          <div class="step-heading"><div><h3>Review and issue the receipt</h3><p>Each changed row appears once. Exceptions stay in a separate list.</p></div><span class="stamp" id="receipt-stamp">Locked</span></div>
          <div id="result-empty" class="result-empty"><span aria-hidden="true">◎</span><p>Preview a rule to see the receipt.</p></div>
          <div id="results" hidden>
            <div class="stats" id="stats"></div>
            <div class="notice boundary-notice"><strong>CSV proof has a boundary.</strong> This records expected values and can compare a second CSV. It does not prove pixels or embedded XMP/IPTC were written.</div>
            <div class="table-heading"><div><h4>Before / after ledger</h4><p id="preview-caption"></p></div><button class="text-button" id="download-changes" type="button">Download changes CSV</button></div>
            <div class="table-scroll" tabindex="0" aria-label="Scrollable before and after change preview"><table><thead><tr><th>Row</th><th>Identity</th><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody id="changes-body"></tbody></table></div>
            <details class="exceptions-panel" id="exceptions-panel"><summary><span>Exception list</span><strong id="exception-count">0</strong></summary><div id="exceptions-content"></div></details>
            <section class="verify-box" aria-labelledby="verify-title"><div><p class="eyebrow">Optional check</p><h4 id="verify-title">Check the later export</h4><p>After running your metadata tool, export a fresh CSV. Include the same identity and target columns. The app compares every planned change.</p></div><label class="button quiet" for="verify-file">Choose verification CSV<input id="verify-file" type="file" accept=".csv,text/csv"></label><div id="verify-status" aria-live="polite"></div></section>
            <label class="receipt-note" id="note-wrap" hidden>Receipt note <textarea id="receipt-note" rows="2" maxlength="300" placeholder="Job number, operator, or handoff note"></textarea><small>Plus feature. Stored only inside exported receipts.</small></label>
            <section class="signature-box" aria-labelledby="signature-title"><div><p class="eyebrow">Receipt signature</p><h4 id="signature-title">Save the public verification file separately</h4><p>This browser creates a private P-256 signing key when you first sign. The key stays in this browser.</p><p>A signed receipt JSON downloads with the printable receipt. Save the public verification file somewhere else.</p><p>Anyone with both JSON files can detect receipt changes. The key identifies this browser profile, not a person or trusted time.</p></div><div class="signature-actions"><button class="button quiet" id="download-verification-key" type="button">Download public verification file</button><p class="muted" id="signing-key-status" aria-live="polite"></p></div><div class="verify-receipt"><label>Signed receipt JSON<input id="signed-receipt-file" type="file" accept="application/json,.json"></label><label>Public verification file<input id="verification-material-file" type="file" accept="application/json,.json"></label><button class="button quiet" id="verify-receipt" type="button">Verify receipt signature</button><p id="receipt-signature-status" aria-live="polite"></p></div></section>
            <div class="issue-bar"><div><strong>Ready to issue</strong><span id="issue-summary"></span></div><div><button class="button quiet" id="download-planned" type="button">Export planned CSV</button><button class="button quiet plus-action" id="download-json" type="button">JSON evidence <span>Plus</span></button><button class="button primary" id="issue-receipt" type="button">Issue signed receipt</button></div></div>
          </div>
        </div>
      </article>
      <div class="live-region" id="live-region" role="status" aria-live="polite"></div>
    </section>

    <section class="method" id="how-it-works" aria-labelledby="method-title">
      <div><p class="eyebrow">Three steps</p><h2 id="method-title">How the CSV receipt works</h2></div>
      <ol><li><span>1</span><div><h3>Export a CSV</h3><p>Bring a plain CSV from the system you already use.</p></div></li><li><span>2</span><div><h3>Plan one rule</h3><p>See every affected value before running the batch job.</p></div></li><li><span>3</span><div><h3>Check and sign</h3><p>Compare a later export, list each mismatch, and sign the record.</p></div></li></ol>
    </section>

    <section class="boundaries" aria-labelledby="boundaries-title"><p class="eyebrow">Clear limits</p><h2 id="boundaries-title">What this tool does not do</h2><ul><li>It does not edit photos or write embedded XMP or IPTC data.</li><li>A CSV comparison proves records, not pixels or saved image files.</li><li>It does not need a cloud photo account.</li></ul></section>

    <section class="plus-section" id="plus" aria-labelledby="plus-title"><div><p class="eyebrow">Optional paid features</p><h2 id="plus-title">Plus pricing and features</h2><p>Plus saves reusable recipes on this browser, adds receipt notes, and exports a separate JSON evidence file.</p><p>Signed receipts, public verification files, planned CSV files, and exception lists remain free.</p><ul><li>Save reusable field rules on this device</li><li>Add operator or job notes to receipts</li><li>Export the unsigned evidence payload for another system</li></ul></div>${plusPurchase}</section>
  </main>
  ${sharedFooter()}
  ${licenseDialog}`;

  bindApp();
  if (demo) startDemo();
}

function renderNotFound(): void {
  isDemoMode = false;
  updateRouteMetadata('not-found');
  app.innerHTML = `${sharedHeader()}<main id="main" class="not-found-page"><p class="error-code">404</p><h1 tabindex="-1">This page does not exist</h1><p>Check the address, return to the product, or open the sample demo.</p><div class="hero-actions"><a class="button primary" href="/">Return to the product</a><a class="button quiet" href="/demo">Try the sample demo</a></div></main>${sharedFooter()}`;
}

function currentPath(): string {
  return window.location.pathname.replace(/\/$/, '') || '/';
}

function renderRoute(moveFocus = false): void {
  sourceTable = null;
  activePlan = null;
  verification = null;
  licenseState = { token: '', unlocked: false, checking: false, reason: '' };
  const path = currentPath();
  if (path === '/privacy' || path === '/terms') renderLegal(path.slice(1) as 'privacy' | 'terms');
  else if (path === '/') renderApp(false);
  else if (path === '/demo') renderApp(true);
  else renderNotFound();
  if (moveFocus) {
    const heading = document.querySelector<HTMLElement>('h1');
    heading?.focus({ preventScroll: true });
    const status = document.querySelector<HTMLElement>('#route-status');
    if (status) status.textContent = document.title;
  }
  if (window.location.hash) requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView());
}

function installNavigation(): void {
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.target || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;
    if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return;
    event.preventDefault();
    history.pushState({}, '', `${url.pathname}${url.search}${url.hash}`);
    renderRoute(true);
  });
  window.addEventListener('popstate', () => renderRoute(true));
}

renderRoute();
installNavigation();
registerServiceWorker();

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: ${id}`);
  return element as T;
}

function announce(message: string): void { byId('live-region').textContent = message; }

function bindApp(): void {
  const fileInput = byId<HTMLInputElement>('csv-file');
  const dropZone = byId('drop-zone');
  fileInput.addEventListener('change', () => { const file = fileInput.files?.[0]; if (file) void loadSource(file); });
  for (const eventName of ['dragenter', 'dragover']) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.add('dragging'); });
  for (const eventName of ['dragleave', 'drop']) dropZone.addEventListener(eventName, (event) => { event.preventDefault(); dropZone.classList.remove('dragging'); });
  dropZone.addEventListener('drop', (event) => { const file = (event as DragEvent).dataTransfer?.files[0]; if (file) void loadSource(file); });
  byId<HTMLSelectElement>('operation').addEventListener('change', updateOperationFields);
  byId<HTMLSelectElement>('condition-field').addEventListener('change', () => { byId('condition-wrap').hidden = !byId<HTMLSelectElement>('condition-field').value; });
  byId<HTMLFormElement>('rule-form').addEventListener('submit', (event) => { event.preventDefault(); buildPreview(); });
  byId<HTMLInputElement>('verify-file').addEventListener('change', () => { const file = byId<HTMLInputElement>('verify-file').files?.[0]; if (file) void loadVerification(file); });
  byId('download-changes').addEventListener('click', () => activePlan && downloadText('metadata-changes.csv', changesCsv(activePlan.changes), 'text/csv'));
  byId('download-planned').addEventListener('click', () => activePlan && downloadText('planned-metadata.csv', serializeCsv(activePlan.plannedTable.headers, activePlan.plannedTable.rows), 'text/csv'));
  byId('issue-receipt').addEventListener('click', () => void issueReceipt());
  byId('download-json').addEventListener('click', () => licenseState.unlocked ? downloadEvidencePayload() : isDemoMode ? announce('Start for real to use Plus features.') : openLicenseDialog());
  byId('download-verification-key').addEventListener('click', () => void downloadVerificationMaterial());
  byId('verify-receipt').addEventListener('click', () => void verifyReceiptFiles());
  byId('save-recipe').addEventListener('click', () => licenseState.unlocked ? saveRecipe() : isDemoMode ? announce('Start for real to save recipes with Plus.') : openLicenseDialog());
  byId<HTMLSelectElement>('saved-recipes').addEventListener('change', loadRecipe);
  document.getElementById('restore-license')?.addEventListener('click', openLicenseDialog);
  document.getElementById('verify-license')?.addEventListener('click', () => void restoreLicense());
  document.getElementById('reset-demo')?.addEventListener('click', resetDemo);
  document.getElementById('start-real')?.addEventListener('click', clearDemoStorage);
  document.getElementById('demo-buy-real')?.addEventListener('click', clearDemoStorage);
  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);
  updateOnlineState();
  updateOperationFields();
  licenseState = isDemoMode ? { token: '', unlocked: false, checking: false, reason: '' } : getLicenseState();
  updateLicenseUi();
  if (!isDemoMode) void verifyLicense().then((state) => { licenseState = state; updateLicenseUi(); });
}

async function loadSource(file: File): Promise<void> {
  if (!file.name.toLocaleLowerCase().endsWith('.csv')) { showError('Choose a .csv file exported by your metadata tool.'); return; }
  setLoading(true, `Reading ${file.name}…`);
  try {
    const table = parseCsv(await file.text(), file.name);
    acceptSource(table);
  } catch (error) { showError(error instanceof Error ? error.message : 'The CSV could not be read.'); }
  finally { setLoading(false); }
}

function loadSample(): void {
  acceptSource(parseCsv(SAMPLE_CSV, 'sample-bird-survey.csv'));
}

function startDemo(): void {
  sessionStorage.setItem(`${DEMO_PREFIX}active`, '1');
  loadSample();
  byId<HTMLSelectElement>('target-field').value = 'caption';
  byId<HTMLSelectElement>('operation').value = 'set';
  byId<HTMLInputElement>('rule-value').value = 'Archive review complete';
  updateOperationFields();
  buildPreview();
  requestAnimationFrame(() => byId('results').scrollIntoView({ block: 'start' }));
}

function clearDemoStorage(): void {
  for (const key of Object.keys(sessionStorage)) if (key.startsWith(DEMO_PREFIX)) sessionStorage.removeItem(key);
  resetDemoSigningKey();
}

function resetDemo(): void {
  clearDemoStorage();
  sessionStorage.setItem(`${DEMO_PREFIX}active`, '1');
  resetDemoSigningKey();
  loadSample();
  byId<HTMLSelectElement>('target-field').value = 'caption';
  byId<HTMLSelectElement>('operation').value = 'set';
  byId<HTMLInputElement>('rule-value').value = 'Archive review complete';
  updateOperationFields();
  buildPreview();
  announce('Demo reset to five sample records, four changes, and one exception.');
}

function acceptSource(table: CsvTable): void {
  sourceTable = table; activePlan = null; verification = null;
  const summary = byId('file-summary');
  summary.hidden = false;
  summary.innerHTML = `<div><span class="file-mark" aria-hidden="true">CSV</span><div><strong>${escapeHtml(table.sourceName)}</strong><p>${table.rows.length.toLocaleString()} rows · ${table.headers.length} fields · read locally</p></div></div><button class="text-button" id="replace-file" type="button">Replace</button>`;
  byId('replace-file').addEventListener('click', () => byId<HTMLInputElement>('csv-file').click());
  byId('drop-zone').hidden = true;
  populateFields(table.headers);
  byId<HTMLFieldSetElement>('rule-fields').disabled = false;
  byId('plan-step').removeAttribute('aria-disabled');
  byId('load-stamp').textContent = 'Loaded'; byId('load-stamp').classList.add('done');
  byId('plan-stamp').textContent = 'Ready'; byId('plan-step').classList.add('current');
  byId('results').hidden = true; byId('result-empty').hidden = false;
  announce(`${table.sourceName} loaded: ${table.rows.length} rows and ${table.headers.length} fields.`);
}

function populateFields(headers: string[]): void {
  const options = headers.map((header) => `<option value="${escapeHtml(header)}">${escapeHtml(header)}</option>`).join('');
  byId<HTMLSelectElement>('identity-field').innerHTML = options;
  byId<HTMLSelectElement>('target-field').innerHTML = options;
  byId<HTMLSelectElement>('condition-field').innerHTML = `<option value="">All rows</option>${options}`;
  const identityGuess = headers.find((header) => /^(filename|file|path|asset.?id|uuid|id)$/i.test(header)) ?? headers[0] ?? '';
  const targetGuess = headers.find((header) => /^(caption|description|keywords|date|datetimeoriginal)$/i.test(header)) ?? headers[1] ?? headers[0] ?? '';
  byId<HTMLSelectElement>('identity-field').value = identityGuess;
  byId<HTMLSelectElement>('target-field').value = targetGuess;
}

function updateOperationFields(): void {
  const operation = byId<HTMLSelectElement>('operation').value as Operation;
  byId('find-wrap').hidden = operation !== 'find-replace';
  byId('days-wrap').hidden = operation !== 'shift-date';
  byId('value-wrap').hidden = operation === 'shift-date';
  const help = byId('value-help');
  help.textContent = operation === 'append-keywords' ? 'Separate multiple keywords with semicolons.' : operation === 'set' ? 'Blank is allowed to clear a field.' : 'Applied exactly as typed.';
}

function readRule(): TransformRule {
  return {
    identityField: byId<HTMLSelectElement>('identity-field').value,
    targetField: byId<HTMLSelectElement>('target-field').value,
    operation: byId<HTMLSelectElement>('operation').value as Operation,
    value: byId<HTMLInputElement>('rule-value').value,
    find: byId<HTMLInputElement>('find-value').value,
    days: Number(byId<HTMLInputElement>('rule-days').value),
    conditionField: byId<HTMLSelectElement>('condition-field').value,
    conditionValue: byId<HTMLInputElement>('condition-value').value
  };
}

function buildPreview(): void {
  if (!sourceTable) return;
  try {
    activePlan = planChanges(sourceTable, readRule()); verification = null;
    renderResults(activePlan);
    announce(`Preview ready: ${activePlan.changes.length} changes and ${activePlan.exceptions.length} exceptions.`);
  } catch (error) { showError(error instanceof Error ? error.message : 'The preview could not be built.'); }
}

function renderResults(plan: PlanResult): void {
  byId('result-empty').hidden = true; byId('results').hidden = false;
  byId('receipt-step').removeAttribute('aria-disabled'); byId('receipt-step').classList.add('current');
  byId('plan-stamp').textContent = 'Planned'; byId('plan-stamp').classList.add('done');
  byId('receipt-stamp').textContent = plan.changes.length ? 'Review' : 'No changes';
  byId('stats').innerHTML = `<div><strong>${plan.changes.length.toLocaleString()}</strong><span>changed</span></div><div><strong>${plan.unchangedRows.toLocaleString()}</strong><span>already match</span></div><div><strong>${plan.skippedRows.toLocaleString()}</strong><span>outside rule</span></div><div class="${plan.exceptions.length ? 'danger' : ''}"><strong>${plan.exceptions.length.toLocaleString()}</strong><span>exceptions</span></div>`;
  const visible = plan.changes.slice(0, 100);
  byId('changes-body').innerHTML = visible.length ? visible.map((change) => `<tr><td>${change.rowNumber}</td><td><code>${escapeHtml(change.identity)}</code></td><td>${escapeHtml(change.field)}</td><td><del>${escapeHtml(change.before) || '<span class="empty-value">empty</span>'}</del></td><td><ins>${escapeHtml(change.after) || '<span class="empty-value">empty</span>'}</ins></td></tr>`).join('') : `<tr><td colspan="5" class="empty-cell">No values would change. Adjust the rule or review “already match.”</td></tr>`;
  byId('preview-caption').textContent = plan.changes.length > 100 ? `Showing first 100 of ${plan.changes.length.toLocaleString()} changes. Downloads contain all rows.` : `${plan.changes.length.toLocaleString()} planned changes.`;
  renderExceptions();
  byId('verify-status').innerHTML = '<p class="muted">No verification CSV loaded yet.</p>';
  byId('issue-summary').textContent = `${plan.changes.length.toLocaleString()} changes · ${plan.exceptions.length.toLocaleString()} current exceptions`;
}

function allExceptions(): ExceptionEntry[] { return [...(activePlan?.exceptions ?? []), ...(verification?.exceptions ?? [])]; }

function renderExceptions(): void {
  const exceptions = allExceptions();
  byId('exception-count').textContent = String(exceptions.length);
  byId('exceptions-content').innerHTML = exceptions.length
    ? `<div class="table-scroll" tabindex="0" aria-label="Scrollable exceptions table"><table><thead><tr><th>Row</th><th>Identity</th><th>Field</th><th>Reason</th></tr></thead><tbody>${exceptions.slice(0, 100).map((item) => `<tr><td>${item.rowNumber}</td><td><code>${escapeHtml(item.identity)}</code></td><td>${escapeHtml(item.field)}</td><td>${escapeHtml(item.reason)}</td></tr>`).join('')}</tbody></table></div><button class="text-button" id="download-exceptions" type="button">Download all exceptions CSV</button>`
    : '<p class="success-message">✓ No exceptions in the current evidence set.</p><button class="text-button" id="download-exceptions" type="button">Download empty exceptions CSV</button>';
  document.getElementById('download-exceptions')?.addEventListener('click', () => downloadText('metadata-exceptions.csv', exceptionsCsv(exceptions), 'text/csv'));
}

async function loadVerification(file: File): Promise<void> {
  if (!activePlan) return;
  const status = byId('verify-status'); status.innerHTML = '<p class="loading-line">Comparing every planned change…</p>';
  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    verification = verifyChanges(activePlan, parseCsv(await file.text(), file.name));
    const passed = verification.mismatched === 0;
    status.innerHTML = `<div class="verification-result ${passed ? 'passed' : 'failed'}"><strong>${passed ? '✓ Verification matched' : '! Differences found'}</strong><span>${verification.verified.toLocaleString()} verified · ${verification.mismatched.toLocaleString()} need attention</span></div>`;
    byId('receipt-stamp').textContent = passed ? 'Verified' : 'Exceptions'; byId('receipt-stamp').classList.toggle('done', passed);
    renderExceptions();
    byId('issue-summary').textContent = `${activePlan.changes.length.toLocaleString()} changes · ${allExceptions().length.toLocaleString()} current exceptions`;
    announce(`Verification complete: ${verification.verified} matched and ${verification.mismatched} need attention.`);
  } catch (error) { status.innerHTML = `<p class="error-message">${escapeHtml(error instanceof Error ? error.message : 'Verification failed.')}</p>`; }
}

function makePayload(): ReceiptPayload {
  if (!activePlan) throw new Error('Preview a rule first.');
  return { version: 1, issuedAt: new Date().toISOString(), sourceName: activePlan.sourceName, sourceRows: activePlan.totalRows, rule: activePlan.rule, changes: activePlan.changes, exceptions: allExceptions(), verification, note: licenseState.unlocked ? byId<HTMLTextAreaElement>('receipt-note').value.trim() : '' };
}

async function issueReceipt(): Promise<void> {
  if (!activePlan) return;
  const button = byId<HTMLButtonElement>('issue-receipt');
  const original = button.textContent ?? ''; button.disabled = true; button.textContent = 'Signing…';
  try {
    const payload = makePayload();
    const { receipt, material } = await signReceipt(payload, isDemoMode);
    if (isDemoMode) sessionStorage.setItem(`${DEMO_PREFIX}key-id`, material.keyId);
    const rows = payload.changes.map((entry) => `<tr><td>${entry.rowNumber}</td><td>${escapeHtml(entry.identity)}</td><td>${escapeHtml(entry.field)}</td><td>${escapeHtml(entry.before)}</td><td>${escapeHtml(entry.after)}</td></tr>`).join('');
    const exceptionRows = payload.exceptions.map((entry) => `<tr><td>${entry.rowNumber}</td><td>${escapeHtml(entry.identity)}</td><td>${escapeHtml(entry.field)}</td><td>${escapeHtml(entry.reason)}</td></tr>`).join('');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Metadata change receipt — ${escapeHtml(payload.sourceName)}</title><style>body{font:16px/1.5 Arial,sans-serif;color:#1e2522;max-width:1100px;margin:40px auto;padding:0 24px}h1{font:48px Georgia,serif;margin-bottom:8px}.seal{border:3px solid #1646a0;padding:16px;word-break:break-all;background:#f4ead2}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;border-bottom:1px solid #777;padding:8px;vertical-align:top}th{background:#f4ead2}.warning{border-left:6px solid #c53d2d;padding:12px 16px;background:#fff4eb}@media print{body{margin:0}.no-print{display:none}thead{display:table-header-group}}</style></head><body><p>METADATA CHANGE RECEIPT · VERSION 2</p><h1>Before / after receipt</h1><p><strong>Source:</strong> ${escapeHtml(payload.sourceName)} · ${payload.sourceRows.toLocaleString()} rows<br><strong>Issued:</strong> ${escapeHtml(payload.issuedAt)}<br><strong>Rule:</strong> ${escapeHtml(describeRule(payload.rule))}</p>${payload.note ? `<p><strong>Note:</strong> ${escapeHtml(payload.note)}</p>` : ''}<div class="seal"><strong>Cryptographic signature</strong><br><code>ECDSA P-256 / SHA-256 · key ID ${escapeHtml(receipt.keyId)}</code><p>This printable rendering is accompanied by <code>metadata-change-receipt.receipt.json</code>, which contains the signed evidence. Verify that file using the separately saved <code>metadata-change-receipt.public-key.json</code>. A valid signature detects edits made without this browser profile’s private key; it is not proof of a person, organization, or trusted timestamp.</p></div><p class="warning"><strong>Boundary:</strong> This receipt records expected CSV values${payload.verification ? ` and comparison with ${escapeHtml(payload.verification.checkedSourceName)}` : ''}. It does not prove pixels or embedded XMP/IPTC were written.</p><h2>Changes (${payload.changes.length.toLocaleString()})</h2><table><thead><tr><th>Source row</th><th>Identity</th><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No changes.</td></tr>'}</tbody></table><h2>Exceptions (${payload.exceptions.length.toLocaleString()})</h2><table><thead><tr><th>Source row</th><th>Identity</th><th>Field</th><th>Reason</th></tr></thead><tbody>${exceptionRows || '<tr><td colspan="4">No exceptions.</td></tr>'}</tbody></table><p class="no-print">Keep the printable file with its signed JSON, source CSV, changes CSV, and exceptions CSV.</p></body></html>`;
    downloadText('metadata-change-receipt.html', html, 'text/html');
    downloadText('metadata-change-receipt.receipt.json', JSON.stringify(receipt, null, 2), 'application/json');
    byId('signing-key-status').textContent = `Signed with local key ${material.keyId.slice(0, 18)}… Save its public verification file separately.`;
    announce(`Printable and signed receipt files downloaded with key ${receipt.keyId.slice(0, 12)}…`);
  } catch (error) {
    announce(`Could not issue a signed receipt: ${error instanceof Error ? error.message : 'Unknown signing error.'}`);
  } finally { button.disabled = false; button.textContent = original; }
}

function downloadEvidencePayload(): void {
  try {
    downloadText('metadata-change-evidence.json', JSON.stringify(makePayload(), null, 2), 'application/json');
    announce('Plain evidence payload downloaded. It is not a signed receipt.');
  } catch (error) { announce(error instanceof Error ? error.message : 'Evidence export failed.'); }
}

async function downloadVerificationMaterial(): Promise<void> {
  const button = byId<HTMLButtonElement>('download-verification-key');
  const original = button.textContent ?? ''; button.disabled = true; button.textContent = 'Preparing…';
  try {
    const material = await getVerificationMaterial(isDemoMode);
    if (isDemoMode) sessionStorage.setItem(`${DEMO_PREFIX}key-id`, material.keyId);
    downloadText('metadata-change-receipt.public-key.json', JSON.stringify(material, null, 2), 'application/json');
    byId('signing-key-status').textContent = `Public material exported. Key ID ${material.keyId}. Store it outside the receipt folder.`;
    announce('Public verification file downloaded.');
  } catch (error) {
    byId('signing-key-status').textContent = error instanceof Error ? error.message : 'Could not create the public verification file.';
  } finally { button.disabled = false; button.textContent = original; }
}

async function verifyReceiptFiles(): Promise<void> {
  const status = byId('receipt-signature-status');
  const receiptFile = byId<HTMLInputElement>('signed-receipt-file').files?.[0];
  const materialFile = byId<HTMLInputElement>('verification-material-file').files?.[0];
  if (!receiptFile || !materialFile) { status.textContent = 'Choose both the signed receipt JSON and its separately saved public verification file.'; status.className = 'error-message'; return; }
  status.textContent = 'Checking the signature…'; status.className = 'muted';
  try {
    const receipt = JSON.parse(await receiptFile.text()) as SignedReceipt;
    const material = JSON.parse(await materialFile.text()) as VerificationMaterial;
    const result = await verifySignedReceipt(receipt, material);
    status.textContent = result.valid ? `✓ ${result.reason}` : `! ${result.reason}`;
    status.className = result.valid ? 'success-message' : 'error-message';
    announce(result.valid ? 'Receipt signature verified.' : `Receipt verification failed: ${result.reason}`);
  } catch (error) {
    status.textContent = `! ${error instanceof Error ? error.message : 'The selected files are not valid JSON.'}`;
    status.className = 'error-message';
  }
}

function describeRule(rule: TransformRule): string {
  const detail = rule.operation === 'shift-date' ? `${rule.days} days` : rule.operation === 'find-replace' ? `“${rule.find}” → “${rule.value}”` : `“${rule.value}”`;
  return `${rule.operation} on ${rule.targetField}: ${detail}${rule.conditionField ? ` where ${rule.conditionField} equals “${rule.conditionValue}”` : ''}`;
}

function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: `${type};charset=utf-8` }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function openLicenseDialog(): void {
  const dialog = byId<HTMLDialogElement>('license-dialog');
  byId<HTMLInputElement>('license-token').value = licenseState.token;
  byId('license-message').textContent = licenseState.unlocked ? 'This browser is unlocked.' : '';
  dialog.showModal(); setTimeout(() => byId<HTMLInputElement>('license-token').focus(), 0);
}

async function restoreLicense(): Promise<void> {
  const token = byId<HTMLInputElement>('license-token').value.trim();
  if (!token) { byId('license-message').textContent = 'Paste the token from your purchase email.'; return; }
  saveLicense(token); byId('license-message').textContent = navigator.onLine ? 'Checking license…' : 'Saved. Connect to verify this license once.';
  licenseState = await verifyLicense(true); updateLicenseUi();
  byId('license-message').textContent = licenseState.unlocked ? '✓ Plus is unlocked on this browser.' : licenseState.reason === 'offline' ? 'Could not reach license verification. Your token is saved; try again when online.' : 'This license is not active. Check the token or buy a new license.';
}

function updateLicenseUi(): void {
  document.body.classList.toggle('is-plus', licenseState.unlocked);
  const button = document.getElementById('open-license'); if (button) button.textContent = licenseState.unlocked ? 'Plus unlocked' : 'Unlock Plus';
  const note = document.getElementById('note-wrap'); if (note) note.hidden = !licenseState.unlocked;
  const picker = document.getElementById('recipe-picker'); if (picker) picker.hidden = !licenseState.unlocked;
  const status = document.getElementById('license-status');
  if (status) {
    const inactive = Boolean(licenseState.token && !licenseState.unlocked && licenseState.reason && licenseState.reason !== 'offline');
    status.hidden = !inactive;
    status.innerHTML = inactive ? `License no longer active. <a href="${checkoutUrl}">Buy a new license</a>.` : '';
  }
  if (licenseState.unlocked) refreshRecipes();
}

interface SavedRecipe { name: string; rule: TransformRule }
const RECIPES_KEY = 'metadata-receipt:recipes';
function getRecipes(): SavedRecipe[] { try { return JSON.parse(localStorage.getItem(RECIPES_KEY) ?? '[]') as SavedRecipe[]; } catch { return []; } }
function saveRecipe(): void {
  const rule = readRule(); const fallback = `${rule.operation} ${rule.targetField}`;
  const name = window.prompt('Name this local recipe', fallback)?.trim(); if (!name) return;
  const recipes = getRecipes().filter((item) => item.name !== name); recipes.push({ name, rule }); localStorage.setItem(RECIPES_KEY, JSON.stringify(recipes)); refreshRecipes(); announce(`Recipe “${name}” saved on this device.`);
}
function refreshRecipes(): void {
  const select = document.getElementById('saved-recipes') as HTMLSelectElement | null; if (!select) return;
  select.innerHTML = `<option value="">Choose…</option>${getRecipes().map((recipe, index) => `<option value="${index}">${escapeHtml(recipe.name)}</option>`).join('')}`;
}
function loadRecipe(): void {
  const selected = Number(byId<HTMLSelectElement>('saved-recipes').value); const recipe = getRecipes()[selected]; if (!recipe) return;
  const rule = recipe.rule; const set = (id: string, value: string) => { const input = byId<HTMLInputElement | HTMLSelectElement>(id); input.value = value; };
  set('identity-field', rule.identityField); set('target-field', rule.targetField); set('operation', rule.operation); set('rule-value', rule.value); set('find-value', rule.find); set('rule-days', String(rule.days)); set('condition-field', rule.conditionField); set('condition-value', rule.conditionValue); updateOperationFields(); byId('condition-wrap').hidden = !rule.conditionField; announce(`Recipe “${recipe.name}” loaded.`);
}

function setLoading(loading: boolean, message = ''): void {
  byId('drop-zone').classList.toggle('loading', loading); if (message) announce(message);
}
function showError(message: string): void { announce(`Error: ${message}`); const summary = byId('file-summary'); summary.hidden = false; summary.innerHTML = `<p class="error-message"><strong>Couldn’t read that CSV.</strong> ${escapeHtml(message)}</p>`; }
function updateOnlineState(): void { const banner = document.getElementById('offline-banner'); if (banner) banner.hidden = navigator.onLine; }
function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', () => void (async () => {
    const registration = await navigator.serviceWorker.register('/sw.js');
    let reloading = false;
    const showUpdate = () => {
      const toast = document.getElementById('update-toast');
      const apply = document.getElementById('apply-update');
      if (!toast || !apply) return;
      toast.hidden = false;
      apply.addEventListener('click', () => registration.waiting?.postMessage({ type: 'SKIP_WAITING' }), { once: true });
    };
    if (registration.waiting && navigator.serviceWorker.controller) showUpdate();
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      installing?.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
      });
    });
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!reloading) { reloading = true; window.location.reload(); }
    });
  })().catch(() => { /* the online app remains usable if registration is unavailable */ }));
}
