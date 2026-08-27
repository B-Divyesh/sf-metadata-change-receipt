# Independent verification — FAIL

**Verified candidate:** `811e9ff56b1016c18aa45d2a12d3158b815a4272` (`main`)  
**Live URL:** https://metadata-change-receipt.sociobot.in/  
**Verification date:** 2026-08-27  
**Scope:** independent static-web verification against the researched brief and factory work order. No product files were changed.

## Verdict

**FAIL — do not release this candidate as an auditable, signed/offline receipt product.** The normal CSV workflow is well implemented, but two P1 defects break required promises: the receipt is not tamper-evident/signable in the claimed sense, and the PWA cannot reload offline after a first visit when only its service-worker cache is available.

## Release blockers

### P1 — “signed” / “tamper-evident” receipts can be silently rewritten

`src/main.ts` computes `SHA-256(JSON.stringify(payload))` and embeds both that public digest and the complete canonical payload in the downloaded HTML. There is no private signing key, public-key signature, remote/notarized commitment, timestamp authority, or independent verifier. Anyone who changes a receipt's before/after values can recompute SHA-256 and replace the embedded digest; the result is indistinguishable from an original receipt.

This contradicts the core brief: an archive user needs a trustworthy before/after receipt rather than another opaque assertion. The UI/document call this a “signed receipt” and “tamper-evident”; an unkeyed checksum only detects accidental modification when a trusted original digest is held elsewhere, which the product neither creates nor requires.

Evidence:

- A downloaded 10,000-row HTML receipt had a digest that correctly matched its embedded canonical JSON. That confirms the implementation is a checksum, not a signature.
- The digest algorithm and its sole input are visible in `src/main.ts` (`crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical))`); the full input is deliberately embedded in the export.

Required remediation: remove the signature/tamper-evidence claim or implement a verifiable authenticated commitment (with a documented trust model and verification flow). A hash alone is not sufficient.

### P1 — first-visit PWA offline reload blanks the application

The service worker's install list is only `/`, `/privacy`, `/terms`, `/mark.svg`, and `/manifest.webmanifest`; it does not precache the compiled JS or CSS that bootstraps the app.

Reproduction on the live deployment:

1. Open the live site in a new Chromium context and wait for `navigator.serviceWorker.ready`.
2. Clear the ordinary browser HTTP cache, retaining Cache Storage, then go offline and reload.
3. The service worker returns cached HTML but has no cached `assets/index-*.js` or CSS. The app root is empty (`h1: 0`), and Chromium logs strict MIME/module failures because the offline navigation fallback HTML is returned for those missing assets.

The `metadata-receipt-shell-v1` cache contained exactly `/`, `/privacy`, `/terms`, `/mark.svg`, and `/manifest.webmanifest`. A normal offline reload may appear to work only while the browser's separate immutable HTTP cache still contains the assets. This violates the README/Privacy claim that the workbench works offline after the first production visit and the PWA acceptance requirement.

Required remediation: precache the built entry JS/CSS and required assets (normally using a generated revisioned manifest), then add an automated cold-cache offline-reload test.

## What passed

### Reproducible build and automated checks

- Clean candidate checkout was exactly `811e9ff56b1016c18aa45d2a12d3158b815a4272`; `npm ci` completed with 0 reported vulnerabilities.
- `npm test`: PASS — 9/9 Vitest tests, including parser errors, duplicate/blank identity handling, verification exceptions, and a 10,000-row fixture.
- `npm run build`: PASS — TypeScript no-emit check and Vite production build. No separate lint script exists.
- Production-browser checks against `npm run preview`: PASS — repository E2E reports 5 source rows, 4 planned edits, 4 verified, 1 source exception, receipt/exception downloads, offline status event, mocked license return, and 0 console errors.
- Repository axe check: PASS — 0 WCAG 2 A/AA and 2.1 AA violations on populated workbench, `/privacy`, and `/terms` at 390×844.

### Independent workflow exercise

- Normal flow: sample CSV, `caption → Set exact value`, produced 4 changes and 1 pre-existing blank-identity exception. A post-edit CSV produced 1 verified, 1 mismatched, 1 duplicate identity, and 1 missing asset; the downloaded exceptions CSV contained all three post-edit reasons plus the source exception.
- Malformed/recovery: an unterminated quoted field produced the actionable “quoted field is not closed” error. Replacing it with a structurally bad/date-invalid CSV recovered without reload and isolated the invalid date, blank identity, and extra-column rows (0 changes, 4 exceptions).
- Boundary: a browser-uploaded 10,000-row CSV previewed in 1,517 ms; the changes CSV had exactly 10,000 data rows and 10,000 distinct identities. Its downloaded HTML receipt listed `Changes (10,000)` and its SHA-256 matched the embedded canonical JSON.
- The verified behavior matches the brief's one-rule local planning, exception listing, and post-export reconciliation boundaries. It does not write image/XMP data and states that boundary.

### Live parity, privacy, security, and delivery

- The live `index.html` SHA-256 exactly matched rebuilt `dist/index.html`: `23c8d06c1288a942a9984a981ce85091e09fd917a9d3a4be12cb35b1d09af276`.
- The live application JS exactly matched rebuilt `dist/assets/index-DtdFI6JV.js`: `43003f862605112b1aff3ba8c0d59a11e5fca857a609538f87a1d4728a12be34`.
- Live initial-page request origins were only `https://metadata-change-receipt.sociobot.in`; source inspection finds the Sociobot billing API only for license verification/checkout. No analytics, third-party runtime scripts, font CDNs, or metadata upload requests were observed.
- `/privacy` and `/terms` render through the SPA and accurately disclose local storage for license/recipes. License return-token storage/URL cleanup passed the repository browser test.
- Live HTTPS responses supplied HSTS, CSP (`default-src 'self'`, narrowly allowing the billing API), `frame-ancestors 'none'`, `nosniff`, Referrer-Policy, and camera/microphone/geolocation Permissions-Policy. Hashed assets use `Cache-Control: public, max-age=31536000, immutable`; HTML and `sw.js` use 30-second revalidation.
- Controlled service-worker update test: serving a changed worker cache version, `registration.update()` changed Cache Storage from `metadata-receipt-shell-v1` to `metadata-receipt-shell-v2`. This passed; it does not cure the missing first-load app assets.

### Accessibility, responsive behavior, and budgets

- Independent live 390×844 run: one `<h1>`, one `<main>`, `lang="en"`, title present, no horizontal page overflow, 0 serious/critical axe findings, 0 console/page errors, and `prefers-reduced-motion: reduce` computed a near-zero (`1e-05s`) step transition.
- Desktop 1440×1000 also had no horizontal page overflow. Keyboard Tab reached the skip link with a visible solid focus outline; controls use native button/input/select semantics. The product's own E2E uses native controls end to end.
- Build budgets pass: JS 37,627 bytes (13,060 gzip) and CSS 17,781 bytes (4,760 gzip); no web fonts. The mobile AVIF hero is 32,032 bytes (under the 300 KB image budget). Initial JS is well under 200 KB and CSS under 50 KB.
- Lighthouse could not be independently scored in this container: Lighthouse 13.4.1 could not attach to the supplied Chrome-for-Testing 145 binary (`Unable to connect to Chrome`). Direct browser/a11y/bundle checks above were completed instead; the builder's self-reported Lighthouse result was not treated as independent evidence.

## Retest criteria

1. Produce a receipt format with a real, independently verifiable integrity/authenticity model, or remove all “signed” and “tamper-evident” statements and narrow the product promise accordingly.
2. Revision-precache the actual built application shell and prove a first-visit, HTTP-cache-cleared offline reload initializes the workbench with no asset/MIME/page errors.
3. Rerun `npm ci`, `npm test`, `npm run build`, production browser/a11y checks, the 10,000-row receipt count, receipt verification, service-worker update, and cold-cache offline reload.
