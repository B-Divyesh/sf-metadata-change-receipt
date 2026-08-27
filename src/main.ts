import './styles.css';
import {
  changesCsv,
  exceptionsCsv,
  parseCsv,
  planChanges,
  receiptCanonicalJson,
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

const appElement = document.querySelector<HTMLDivElement>('#app');
if (!appElement) throw new Error('App mount point is missing.');
const app: HTMLDivElement = appElement;

const escapeHtml = (value: unknown) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function sharedHeader(): string {
  return `<header class="site-header">
    <a class="wordmark" href="/" aria-label="Metadata Change Receipt home"><img src="/mark.svg" width="40" height="40" alt=""><span>Metadata Change Receipt</span></a>
    <nav aria-label="Primary"><a href="/#workbench">Workbench</a><a href="/#how-it-works">Method</a><button class="text-button" id="open-license" type="button">Unlock Plus</button></nav>
  </header>`;
}

function sharedFooter(): string {
  return `<footer>
    <div><strong>Metadata Change Receipt</strong><p>Evidence around your tools, never a replacement for them.</p></div>
    <nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav>
    <p class="fine-print">Runs locally in your browser. Original hero artwork was AI-generated for this product; no third-party assets or tracking.</p>
  </footer>`;
}

function renderLegal(kind: 'privacy' | 'terms'): void {
  const isPrivacy = kind === 'privacy';
  document.title = `${isPrivacy ? 'Privacy' : 'Terms'} — Metadata Change Receipt`;
  app.innerHTML = `${sharedHeader()}<main id="main" class="legal-page">
    <a class="back-link" href="/">← Back to the workbench</a>
    <p class="eyebrow">Plain-language policy · effective 27 August 2026</p>
    <h1>${isPrivacy ? 'Your metadata stays on your desk.' : 'A receipt is evidence, not magic.'}</h1>
    ${isPrivacy ? `<section><h2>What stays local</h2><p>CSV files, filenames, captions, dates, keywords, previews, receipts, and exception lists are processed in your browser. They are not uploaded to us. The app has no analytics, advertising, or tracking.</p></section>
    <section><h2>What is stored</h2><p>If you paste or return with a purchase license, the token and a once-daily verification result are saved in this browser’s local storage. Plus users may choose to save transformation recipes locally. You can remove both by clearing site data.</p></section>
    <section><h2>Network requests</h2><p>The app only contacts the Sociobot billing API when you buy or verify a license. Sociobot and its merchant-of-record payment partner process the purchase under their own policies. The offline app shell is cached on your device.</p></section>
    <section><h2>Questions</h2><p>Contact <a href="mailto:privacy@sociobot.in">privacy@sociobot.in</a>. Do not email sensitive metadata files.</p></section>`
    : `<section><h2>What the app does</h2><p>The app plans changes against a metadata CSV, compares an optional second export, and creates a tamper-evident digest. It does not edit photos, write XMP/IPTC data, inspect pixels, or prove that another tool successfully embedded metadata in an image.</p></section>
    <section><h2>Your responsibility</h2><p>Keep backups, inspect the preview and exception list, and test your external metadata tool on a small set first. Stable, unique identifiers are essential for reliable verification.</p></section>
    <section><h2>License and purchase</h2><p>The core receipt workflow is free. Plus is a $19 one-time license for one person and includes local saved recipes, custom receipt notes, and JSON evidence export. Sociobot/Dodo is the merchant of record and handles payment and refunds. A refund revokes the license automatically.</p></section>
    <section><h2>Warranty</h2><p>The software is provided “as is” under the MIT License, without warranty. You retain responsibility for your files and metadata workflow.</p></section>`}
  </main>${sharedFooter()}`;
  document.querySelector('#open-license')?.addEventListener('click', () => { window.location.href = '/#plus'; });
}

const path = window.location.pathname.replace(/\/$/, '') || '/';
if (path === '/privacy' || path === '/terms') {
  renderLegal(path.slice(1) as 'privacy' | 'terms');
  registerServiceWorker();
} else {
  renderApp();
}

function renderApp(): void {
  captureReturnedLicense();
  document.title = 'Metadata Change Receipt — prove every planned edit';
  app.innerHTML = `${sharedHeader()}
  <div class="offline-banner" id="offline-banner" role="status" hidden><strong>Offline:</strong> the workbench still works. License checks will resume when you reconnect.</div>
  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">Local metadata audit desk · nothing uploaded</p>
        <h1 id="hero-title">Every edit.<br><em>Receipted.</em></h1>
        <p class="lede">Plan batch date, caption, keyword, and IPTC changes from a CSV. See every before and after, catch exceptions, then take a tamper-evident receipt back to your archive.</p>
        <div class="hero-actions"><a class="button primary" href="#workbench">Start with a CSV</a><button class="button quiet" id="load-sample" type="button">Try the sample</button></div>
        <p class="privacy-note"><span aria-hidden="true">●</span> Your filenames and location data never leave this browser.</p>
      </div>
      <figure class="hero-art">
        <picture><source media="(max-width: 700px)" srcset="/assets/receipt-worktable-768.webp"><img src="/assets/receipt-worktable-1536.webp" width="1536" height="1024" alt="A cobalt and vermillion risograph collage of contact sheets connected by a long paper receipt" fetchpriority="high" decoding="async"></picture>
        <figcaption>From “I think it changed” to a row-by-row record.</figcaption>
      </figure>
    </section>

    <section class="trust-strip" aria-label="Product boundaries">
      <p><strong>Reads</strong> exported CSV</p><span aria-hidden="true">→</span><p><strong>Plans</strong> field changes</p><span aria-hidden="true">→</span><p><strong>Checks</strong> a second export</p><span aria-hidden="true">→</span><p><strong>Writes</strong> receipts, not image files</p>
    </section>

    <section class="workbench" id="workbench" aria-labelledby="workbench-title">
      <div class="section-intro"><p class="eyebrow">The workbench</p><h2 id="workbench-title">Build the evidence trail</h2><p>Nothing is changed until you export a planned CSV. Your original file remains untouched.</p></div>

      <article class="workflow-step current" id="load-step">
        <div class="step-number" aria-hidden="true">01</div><div class="step-body">
          <div class="step-heading"><div><h3>Load the source export</h3><p>Use a CSV exported from Lightroom, ExifTool, your DAM, or a spreadsheet.</p></div><span class="stamp" id="load-stamp">Waiting</span></div>
          <label class="drop-zone" id="drop-zone" for="csv-file">
            <span class="drop-icon" aria-hidden="true">⇩</span><strong>Drop a metadata CSV here</strong><span>or choose a file · up to 25 MB · processed locally</span>
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
          <div class="step-heading"><div><h3>Inspect and issue the receipt</h3><p>Changed rows appear once. Exceptions stay separate and actionable.</p></div><span class="stamp" id="receipt-stamp">Locked</span></div>
          <div id="result-empty" class="result-empty"><span aria-hidden="true">◎</span><p>Preview a rule to open the receipt desk.</p></div>
          <div id="results" hidden>
            <div class="stats" id="stats"></div>
            <div class="notice boundary-notice"><strong>CSV proof has a boundary.</strong> This records expected values and can compare a second CSV. It does not prove pixels or embedded XMP/IPTC were written.</div>
            <div class="table-heading"><div><h4>Before / after ledger</h4><p id="preview-caption"></p></div><button class="text-button" id="download-changes" type="button">Download changes CSV</button></div>
            <div class="table-scroll" tabindex="0" aria-label="Scrollable before and after change preview"><table><thead><tr><th>Row</th><th>Identity</th><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody id="changes-body"></tbody></table></div>
            <details class="exceptions-panel" id="exceptions-panel"><summary><span>Exception list</span><strong id="exception-count">0</strong></summary><div id="exceptions-content"></div></details>
            <section class="verify-box" aria-labelledby="verify-title"><div><p class="eyebrow">Optional but recommended</p><h4 id="verify-title">Check the post-edit export</h4><p>After running your metadata tool, export a fresh CSV with the same identity and target columns. We’ll compare every planned change.</p></div><label class="button quiet" for="verify-file">Choose verification CSV<input id="verify-file" type="file" accept=".csv,text/csv"></label><div id="verify-status" aria-live="polite"></div></section>
            <label class="receipt-note" id="note-wrap" hidden>Receipt note <textarea id="receipt-note" rows="2" maxlength="300" placeholder="Job number, operator, or handoff note"></textarea><small>Plus feature. Stored only inside exported receipts.</small></label>
            <div class="issue-bar"><div><strong>Ready to issue</strong><span id="issue-summary"></span></div><div><button class="button quiet" id="download-planned" type="button">Export planned CSV</button><button class="button quiet plus-action" id="download-json" type="button">JSON evidence <span>Plus</span></button><button class="button primary" id="issue-receipt" type="button">Issue signed receipt</button></div></div>
          </div>
        </div>
      </article>
      <div class="live-region" id="live-region" role="status" aria-live="polite"></div>
    </section>

    <section class="method" id="how-it-works" aria-labelledby="method-title">
      <div><p class="eyebrow">Independent by design</p><h2 id="method-title">A paper trail your catalog doesn’t own.</h2></div>
      <ol><li><span>1</span><div><h3>Export</h3><p>Bring a plain CSV from the system you already use. No proprietary catalog connection.</p></div></li><li><span>2</span><div><h3>Rehearse</h3><p>Apply one explicit rule and see the exact set before running a risky batch job.</p></div></li><li><span>3</span><div><h3>Reconcile</h3><p>Compare a new export, isolate every mismatch, and seal the full record with SHA-256.</p></div></li></ol>
    </section>

    <section class="plus-section" id="plus" aria-labelledby="plus-title"><div><p class="eyebrow">For repeat archive work</p><h2 id="plus-title">Keep the core free. Make the routine faster.</h2><p>Plus adds locally saved recipes, custom receipt notes, and machine-readable JSON evidence. Core CSV planning, verification, and all exports stay free.</p><ul><li>Save reusable field rules on this device</li><li>Add operator or job notes to receipts</li><li>Export the signed evidence payload as JSON</li></ul></div><aside><p class="price"><strong>$19</strong> one time</p><p>One-person license · no subscription</p><a class="button primary" href="${checkoutUrl}">Buy Plus securely</a><button class="text-button" id="restore-license" type="button">Have a license? Restore it</button><small>Sociobot/Dodo is merchant of record. Refunds are handled there.</small></aside></section>
  </main>
  ${sharedFooter()}
  <dialog id="license-dialog" aria-labelledby="license-title"><form method="dialog"><button class="dialog-close" value="cancel" aria-label="Close license dialog">×</button><p class="eyebrow">Metadata Change Receipt Plus</p><h2 id="license-title">Restore your license</h2><p>Paste the token from your purchase email. It is stored only in this browser and checked with Sociobot at most once a day.</p><label>License token<input id="license-token" type="text" autocomplete="off" spellcheck="false"></label><p id="license-message" class="form-message" aria-live="polite"></p><div class="dialog-actions"><a class="button quiet" href="${checkoutUrl}">Buy for $19</a><button class="button primary" id="verify-license" type="button">Verify and unlock</button></div></form></dialog>`;

  bindApp();
  registerServiceWorker();
}

let sourceTable: CsvTable | null = null;
let activePlan: PlanResult | null = null;
let verification: VerificationResult | null = null;
let licenseState: LicenseState = { token: '', unlocked: false, checking: false, reason: '' };

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
  byId('load-sample').addEventListener('click', loadSample);
  byId<HTMLSelectElement>('operation').addEventListener('change', updateOperationFields);
  byId<HTMLSelectElement>('condition-field').addEventListener('change', () => { byId('condition-wrap').hidden = !byId<HTMLSelectElement>('condition-field').value; });
  byId<HTMLFormElement>('rule-form').addEventListener('submit', (event) => { event.preventDefault(); buildPreview(); });
  byId<HTMLInputElement>('verify-file').addEventListener('change', () => { const file = byId<HTMLInputElement>('verify-file').files?.[0]; if (file) void loadVerification(file); });
  byId('download-changes').addEventListener('click', () => activePlan && downloadText('metadata-changes.csv', changesCsv(activePlan.changes), 'text/csv'));
  byId('download-planned').addEventListener('click', () => activePlan && downloadText('planned-metadata.csv', serializeCsv(activePlan.plannedTable.headers, activePlan.plannedTable.rows), 'text/csv'));
  byId('issue-receipt').addEventListener('click', () => void issueReceipt('html'));
  byId('download-json').addEventListener('click', () => licenseState.unlocked ? void issueReceipt('json') : openLicenseDialog());
  byId('save-recipe').addEventListener('click', () => licenseState.unlocked ? saveRecipe() : openLicenseDialog());
  byId<HTMLSelectElement>('saved-recipes').addEventListener('change', loadRecipe);
  byId('open-license').addEventListener('click', openLicenseDialog);
  byId('restore-license').addEventListener('click', openLicenseDialog);
  byId('verify-license').addEventListener('click', () => void restoreLicense());
  window.addEventListener('online', updateOnlineState);
  window.addEventListener('offline', updateOnlineState);
  updateOnlineState();
  updateOperationFields();
  licenseState = getLicenseState();
  updateLicenseUi();
  void verifyLicense().then((state) => { licenseState = state; updateLicenseUi(); });
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
  const csv = `filename,date,caption,keywords,rating\nIMG_1042.CR3,2024-05-16,Heron at the west pond,bird; wetlands,5\nIMG_1043.CR3,2024-05-16,Heron lifting off,bird,4\nIMG_1044.CR3,not-a-date,Reeds after rain,landscape,3\n,2024-05-17,Unidentified frame,review,1\nIMG_1046.CR3,2024-05-17,Boardwalk detail,architecture; blue hour,4`;
  acceptSource(parseCsv(csv, 'sample-bird-survey.csv'));
  location.hash = 'workbench';
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
    : '<p class="success-message">✓ No exceptions in the current evidence set.</p>';
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

async function sha256(text: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function issueReceipt(format: 'html' | 'json'): Promise<void> {
  if (!activePlan) return;
  const button = byId<HTMLButtonElement>(format === 'html' ? 'issue-receipt' : 'download-json');
  const original = button.textContent ?? ''; button.disabled = true; button.textContent = 'Sealing…';
  try {
    const payload = makePayload();
    const canonical = receiptCanonicalJson(payload);
    const digest = await sha256(canonical);
    if (format === 'json') {
      downloadText('metadata-change-receipt.json', JSON.stringify({ algorithm: 'SHA-256', digest, payload }, null, 2), 'application/json');
    } else {
      const rows = payload.changes.map((entry) => `<tr><td>${entry.rowNumber}</td><td>${escapeHtml(entry.identity)}</td><td>${escapeHtml(entry.field)}</td><td>${escapeHtml(entry.before)}</td><td>${escapeHtml(entry.after)}</td></tr>`).join('');
      const exceptionRows = payload.exceptions.map((entry) => `<tr><td>${entry.rowNumber}</td><td>${escapeHtml(entry.identity)}</td><td>${escapeHtml(entry.field)}</td><td>${escapeHtml(entry.reason)}</td></tr>`).join('');
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Metadata change receipt — ${escapeHtml(payload.sourceName)}</title><style>body{font:16px/1.5 Arial,sans-serif;color:#1e2522;max-width:1100px;margin:40px auto;padding:0 24px}h1{font:48px Georgia,serif;margin-bottom:8px}.seal{border:3px solid #1646a0;padding:16px;word-break:break-all;background:#f4ead2}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{text-align:left;border-bottom:1px solid #777;padding:8px;vertical-align:top}th{background:#f4ead2}.warning{border-left:6px solid #c53d2d;padding:12px 16px;background:#fff4eb}@media print{body{margin:0}.no-print{display:none}thead{display:table-header-group}}</style></head><body><p>METADATA CHANGE RECEIPT · VERSION 1</p><h1>Before / after receipt</h1><p><strong>Source:</strong> ${escapeHtml(payload.sourceName)} · ${payload.sourceRows.toLocaleString()} rows<br><strong>Issued:</strong> ${escapeHtml(payload.issuedAt)}<br><strong>Rule:</strong> ${escapeHtml(describeRule(payload.rule))}</p>${payload.note ? `<p><strong>Note:</strong> ${escapeHtml(payload.note)}</p>` : ''}<div class="seal"><strong>SHA-256 evidence digest</strong><br><code>${digest}</code><p>This digest seals the canonical JSON evidence used to create this document. Any content change produces a different digest. It is tamper-evident, not proof of the issuer’s identity.</p></div><p class="warning"><strong>Boundary:</strong> This receipt records expected CSV values${payload.verification ? ` and comparison with ${escapeHtml(payload.verification.checkedSourceName)}` : ''}. It does not prove pixels or embedded XMP/IPTC were written.</p><h2>Changes (${payload.changes.length.toLocaleString()})</h2><table><thead><tr><th>Source row</th><th>Identity</th><th>Field</th><th>Before</th><th>After</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No changes.</td></tr>'}</tbody></table><h2>Exceptions (${payload.exceptions.length.toLocaleString()})</h2><table><thead><tr><th>Source row</th><th>Identity</th><th>Field</th><th>Reason</th></tr></thead><tbody>${exceptionRows || '<tr><td colspan="4">No exceptions.</td></tr>'}</tbody></table><p class="no-print">Keep this file with the source CSV, changes CSV, and exceptions CSV.</p></body></html>`;
      downloadText('metadata-change-receipt.html', html, 'text/html');
    }
    announce(`Signed ${format.toUpperCase()} receipt downloaded with digest ${digest.slice(0, 12)}…`);
  } finally { button.disabled = false; button.textContent = original; }
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
function registerServiceWorker(): void { if ('serviceWorker' in navigator && import.meta.env.PROD) window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js')); }
