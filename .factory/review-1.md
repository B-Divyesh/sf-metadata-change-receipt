# Plan and verify metadata CSV changes — review 1

**Verdict: FAIL — 5 findings, including 2 P1 findings and 12 untested public claims. Do not declare this product PASS.**

**Job:** plan a metadata CSV transformation, inspect each before/after value and exception, reconcile a later export, and keep a signed receipt without uploading the CSV.

**Audience:** photographers and small archive managers who need to prove a batch metadata change.

**First action:** **Start with a CSV**. The adjacent secondary action is **Try the sample**.

**First-screen check before scrolling:** On fresh phone (390×844) and desktop (1440×1000) sessions, the page showed the job only in the supporting text. It did not name the audience. Its first action was **Start with a CSV**; **Try the sample** was adjacent. The job inferred from the text was clear, but the headline was “Every edit. Receipted.” rather than a plain job statement.

## Candidate and live parity

- **Implementation reviewed:** `f4c42de20d09e7d6bda1250f23e95f98971f1219` (`fix: sign receipts and precache offline shell`). This is the last product-code commit.
- **Test-only handoff commit:** `d363511b14fa90a2aabc3b15ad90d724e7faeec0` changes only handoff text.
- **Documentation commit:** `a74a4148782da43e8f3c92ec1c28b0fed505e158` adds the prior verification report and handoff text.
- The live root referenced `assets/index-Dshu6fEB.js` and `assets/index-BvR3tNv_.css`, exactly the files emitted by a clean rebuild of this checkout. The live root HTML matched the rebuilt asset references. Later commits are documentation-only, so no separate product image was required.

## Checks run from the clean checkout

```sh
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1
npm run test:e2e
A11Y_URL=http://127.0.0.1:4173 npm run test:a11y
E2E_URL=https://metadata-change-receipt.sociobot.in npm run test:e2e
A11Y_URL=https://metadata-change-receipt.sociobot.in npm run test:a11y
```

- `npm ci`: PASS; 0 reported vulnerabilities.
- `npm test`: PASS; 12 tests.
- `npm run build`: PASS; produced `dist/` with `dist/index.html`.
- Local and live `test:e2e`: PASS. The declared smoke exercise produced 5 source rows, 4 changes, 4 verified changes, 1 exception, signed receipt verification, tamper rejection, offline-shell reload, paid-license return handling, and 0 console errors.
- Local and live `test:a11y`: PASS; 0 WCAG 2 A/AA and 2.1 AA violations on `/`, `/privacy`, and `/terms` at 390 px.
- There is no `.factory/claims.json`, so there were no declared claim commands to run. This is itself a finding; passing general smoke commands does not satisfy the claims contract.

## Product checks that passed

- Fresh live phone and desktop loads had `lang="en"`, one `main`, one `h1`, no console/page errors, no page-level horizontal overflow, and a visible Skip to main content focus ring (4px solid mustard).
- Reduced-motion mode set workflow transition duration to `1e-05s`.
- The sample loaded a realistic five-row bird-survey CSV. A caption rule produced 4 planned changes and 1 blank-identity exception. Issuing a receipt downloaded both the printable HTML and signed JSON. The signing key and signature behavior passed the repository’s live smoke test.
- A `.txt` upload gave “Choose a .csv file exported by your metadata tool.” An unclosed quote gave actionable recovery copy. Replacing the input with a 10,000-row CSV then produced 10,000 changes in 1,487 ms; the downloaded changes CSV had 10,001 lines including the header and distinct first/last identities.
- During a whole sample/boundary flow, observed browser request origins were only `https://metadata-change-receipt.sociobot.in`; no metadata upload or third-party script request was observed. The optional checkout endpoint returned the expected 303 to the merchant checkout.
- The live service worker shell reload, receipt signing, receipt verification, and tamper rejection address the two P1 items in `.factory/verification.md`. `.factory/verification-2.md` has no other prior findings. No earlier minor findings were recorded.

## Findings

### P1 — Required one-click demo sandbox is absent

The page has a **Try the sample** button, but it is not a demo sandbox as required. Fresh visits to both `/demo` and `?demo=1` render the ordinary blank landing page; neither has a demo title, persistent “Demo — sample data, nothing is saved” label, Reset demo control, or Start for real control. The header has no Demo link. There is also no `.factory/demo.md`.

This is more than a missing label. After choosing the sample and issuing a receipt, the live page created the real IndexedDB database `metadata-change-receipt-keys`. The implementation uses that database for the local signing key, not a `demo:` namespace. The sample action therefore cannot prove that a try-out never writes persistent real-product state. A visitor cannot reset or leave the sample explicitly.

**Required repair:** provide `/demo` or `?demo=1` as an actual isolated namespace, show the persistent required banner and controls, document it in `.factory/demo.md`, ensure sample receipt/key state is disposable, and test it from a fresh context.

### P1 — Public claims have no required registry or claim-specific tests

`.factory/claims.json` is missing. The product and README make at least these 12 material visitor-reliance claims without a required `@claim:` command: local/no-upload processing; original CSV is unchanged; 25 MB CSV support; plans all stated transformation types; changed rows are represented once; complete exception/change/planned exports; ECDSA signed receipts; independently verifiable public material; offline-after-first-visit behavior; local signing-key storage; $19 one-time Plus pricing; and at-most-daily license checks.

The existing smoke test incidentally covers portions of several claims, but no claim is registered with its exact observable sandbox test. This leaves **12 untested claims** under the factory contract.

**Required repair:** inventory every public reliance claim in `.factory/claims.json`, attach one unique tagged demo-sandbox test to each, remove any claim that cannot be tested, and rerun each declared command from a clean checkout.

### P2 — First screen does not meet the plain-words first-screen contract

The single `h1`, “Every edit. Receipted.”, names neither the job nor the audience and is marketing-style copy rather than a plain job statement. The first screen does not identify photographers or small archive managers. It also supplies only one of the required three plain facts (privacy): offline status and the $19 one-time price are not on that screen. “Try the sample” is understandable but does not use the required “Try it with sample data” wording or explain that it is isolated.

Other visible copy has the same issue: “A paper trail your catalog doesn’t own.” and the Terms `h1`, “A receipt is evidence, not magic.” are metaphor-led rather than informative headings. `.factory/copy-audit.md`, required to prove the copy review, is absent.

**Required repair:** use a ≤9-word job headline, name the intended audience in the following ≤22-word sentence, place the isolated sample action and its result next to the real action, show privacy/offline/price facts, replace metaphor-led headings, and add the completed copy audit.

### P2 — No designed 404 response exists

`/404` and `/does-not-exist` both returned HTTP 200 and the ordinary product landing page. `public/staticwebapp.config.json` has no `responseOverrides` 404 rewrite and the repository has no designed 404 document. This is not a deliberate HTTP 404 with a way back; unknown paths silently look like successful product pages.

**Required repair:** add a product-styled 404 page with a clear return link and configure Static Web Apps to serve it with status 404. Include it in the route check.

### P2 — Required social/discovery metadata is missing

The live root, Privacy, Terms, Demo, and error routes all lack canonical links, Open Graph metadata, Twitter card metadata, and a 180px apple-touch icon. The required generated 1200×630 product social image is not present. The root title is present and within the length limit, and Privacy/Terms titles update correctly after the SPA boots, but the required metadata skeleton is incomplete.

**Required repair:** add route-aware canonical, Open Graph, and Twitter metadata; author the apple-touch icon; generate and ship the required product-specific social image; then test the rendered route metadata.

## Route, legal, privacy, and update checks

- `/privacy` and `/terms` loaded as real SPA routes with correct post-boot titles: “Privacy — Metadata Change Receipt” and “Terms — Metadata Change Receipt.” Both have one `h1` and a footer legal link. `/robots.txt` and `/sitemap.xml` returned 200; the sitemap lists `/`, `/privacy`, and `/terms`.
- The root response had HSTS, CSP with `frame-ancestors 'none'` as a response header, `nosniff`, strict referrer policy, and a restrictive Permissions-Policy. Its CSP permits only the product origin and the stated billing API connection.
- The offline/update promise was exercised by the repository smoke test: emitted JS/CSS are precached and an offline cold-cache reload initializes the h1 without errors. The update path is exercised in the prior verification and has no new regression evidence here.
- This static product has no backend tenant, health, restart-persistence, or 429/Retry-After surface to test.

## Result

**FAIL.** The core local planning, verification, signing, accessibility, offline reload, and boundary behavior are functioning, and the two previously recorded P1 defects remain fixed. However, the missing isolated demo contract, missing claims registry/test evidence, plain-words first-screen failures, missing 404 design, and incomplete route metadata mean there are 5 open findings and 12 untested claims. PASS is not permitted.
