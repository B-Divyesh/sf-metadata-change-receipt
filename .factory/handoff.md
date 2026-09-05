# Metadata Change Receipt — verification handoff

## Review 1 status: FAIL — do not release as PASS

Review 1 on 2026-09-05 found **5 open findings and 12 untested public claims**. The full evidence is in `.factory/review-1.md`.

- P1: the visible sample is not the required isolated demo. `/demo` and `?demo=1` are ordinary landing pages, with no persistent demo label, reset/start-real controls, isolated storage, or `.factory/demo.md`.
- P1: `.factory/claims.json` is absent. Twelve material public claims lack the required tagged sandbox test assignment.
- P2: the first screen does not plainly name the job/audience or show all three facts; required copy audit is missing.
- P2: unknown paths return the regular page with HTTP 200; there is no designed 404.
- P2: canonical, Open Graph, Twitter, apple-touch, and social-image metadata are missing.

The reviewer did not alter product code. `npm ci`, unit tests, build, local/live smoke, and local/live axe checks passed. The current live runtime matches implementation commit `f4c42de20d09e7d6bda1250f23e95f98971f1219`; documentation is at `a74a4148782da43e8f3c92ec1c28b0fed505e158`.

The earlier receipt-signature and cold-cache-offline P1 findings remain fixed. See the historical verification below for their evidence; it does not override this FAIL.

## Release status: PASS — independently verified for release

Independent QA on 2026-08-27 passed candidate `d363511b14fa90a2aabc3b15ad90d724e7faeec0` at https://metadata-change-receipt.sociobot.in/. The full evidence is in `.factory/verification-2.md`; no product source was changed during verification.

- Clean-install tests: `npm ci` (0 reported vulnerabilities), `npm test` (12/12), and exact `npm run build` all passed.
- Local and live production E2E passed: planning, reconciliation, exports, ECDSA receipt verification/tamper rejection, license-return mock, and cold-cache offline reload, with 0 console/page errors.
- Local and live axe checks found 0 WCAG 2 A/AA and 2.1 AA violations on the workbench, privacy, and terms pages at 390px.
- Independent browser checks covered invalid/recovery CSV input, actionable exceptions, a 10,000-row exact-once fixture, desktop/mobile layout, keyboard focus, reduced motion, no third-party first-load requests, headers, caching, and a production-build service-worker update.
- Live root/JS/CSS byte-match the rebuilt candidate. Initial JS/CSS and mobile hero asset meet the stated budgets.
- **Open defects by severity:** none (no P0/P1/P2/P3).

## Previous repair context

This repair resolves both P1 findings recorded against `811e9ff56b1016c18aa45d2a12d3158b815a4272`.

## What changed

- Replaced the recomputable SHA-only receipt claim with an ECDSA P-256 signature. A private key is generated locally and retained as a non-exportable browser `CryptoKey` in IndexedDB. Issuing a receipt downloads a printable HTML rendering and a signed `metadata-change-receipt.receipt.json` envelope.
- Added separately exportable `metadata-change-receipt.public-key.json` verification material, a key ID, in-app file-based verification, and explicit provenance/trust-boundary copy. A valid signature proves that the exact evidence was signed by the browser profile holding that private key. It does not claim a person, organization, legal signature, or trusted timestamp. Users must retain the public material separately from a receipt to make substitution detectable.
- Added tamper and substituted-public-key unit regressions plus a browser regression that verifies a downloaded receipt and rejects an edited payload.
- Replaced the fixed worker shell list with a build-generated, revisioned precache manifest. It includes the emitted hashed JS/CSS and the complete static app shell. Navigation falls back to cached `index.html` only; asset misses never receive HTML, preventing the prior module/MIME failure.
- Added the PWA update toast and explicit worker activation request. Manifest now declares 192/512 maskable SVG icon entries and a versioned PWA start URL.
- The paid path remains on the registered Dodo Live-backed Sociobot endpoint: `https://api.sociobot.in/api/v1/products/metadata-change-receipt/{checkout,verify}`. No payment provider is embedded.

## Verification completed locally (2026-08-27)

```sh
npm ci
npm test
npm run build
npm run preview -- --host 127.0.0.1
npm run test:e2e
A11Y_URL=http://127.0.0.1:4173 npm run test:a11y
```

- `npm test`: 12/12 passing. Includes the 10,000-row fixture (exactly 10,000 unique planned changes), cryptographic verification, payload tampering, and public-key substitution rejection.
- `npm run build`: passes TypeScript and produces `dist/`. Initial JS is 46.2 KB (15.5 KB gzip); CSS is 18.8 KB (4.9 KB gzip); no web fonts or third-party runtime assets.
- `npm run test:e2e`: source/plan/reconciliation workflow, signed receipt export, independent public-key verification, tamper rejection, exception CSV, paid-license return flow mock, and a cold first-visit offline reload all pass with zero console/page errors. While offline, it fetches emitted JS/CSS with an HTTP-cache bypass and asserts the active worker cache contains those exact assets before reload.
- `npm run test:a11y`: zero WCAG 2 A/AA and 2.1 AA violations on the populated workbench, `/privacy`, and `/terms` at 390×844.

## Known boundaries

- The signing key is local to one browser profile. Clearing that profile’s site data prevents future signatures from that key; old receipts remain verifiable with a separately saved public-key file.
- The key is deliberately not an identity or timestamp service. For a stronger organizational/legal assertion, archive the public material independently and use an external signing/notarization process appropriate to that policy.
- The product remains a CSV evidence layer. It does not prove pixels or embedded XMP/IPTC writes and processes one transformation rule per receipt.

## Deploy

Deployed as Azure Static Web Apps **Standard** on 2026-08-27:

- https://metadata-change-receipt.sociobot.in/
- `dist/sw.js` is build-specific and was deployed with its corresponding hashed assets.
- `/opt/fleet/lib/verify-url.sh` passed against the live URL: HTTPS 200, title/lang/one h1/main/alt/button checks pass, and no browser console or page errors.
- Live `E2E_URL=https://metadata-change-receipt.sociobot.in npm run test:e2e` passed, including signed receipt verification, tamper rejection, and cold-cache offline reload. Live axe checks also reported zero violations.
