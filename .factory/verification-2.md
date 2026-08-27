# Independent verification 2 — PASS

**Candidate:** `d363511b14fa90a2aabc3b15ad90d724e7faeec0` (`main`)  
**Live URL:** https://metadata-change-receipt.sociobot.in/  
**Verified:** 2026-08-27  
**Scope:** clean-checkout, independent static-web QA against the researched brief and factory acceptance contract. No product code was changed.

## Verdict

**PASS — release candidate is fit for the stated local-first metadata-planning, reconciliation, and signed-receipt job.** The two P1 issues in the preceding report are fixed and independently reproduced as passing: receipt signatures are ECDSA P-256 signatures verifiable with separately saved public material, and a cold-cache offline reload boots from the generated service-worker precache.

## Reproducible checks

From the clean candidate checkout:

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

- `npm ci`: pass, 0 reported vulnerabilities.
- `npm test`: pass, 12/12 tests. This includes quoted/multiline CSV handling, invalid parse cases, all core transformations/conditions, duplicate identities, reconciliation exceptions, a 10,000-row fixture, ECDSA validation, payload tampering, and substituted-key rejection.
- `npm run build`: pass (`tsc --noEmit` plus Vite) and produced `dist/`. There is no separate lint script in `package.json`.
- Repository production-browser smoke test: pass locally and against live. It completed a CSV plan and post-edit comparison, downloaded printable and signed JSON receipts, verified a separately exported public key, rejected a tampered envelope, exported exceptions, exercised mocked license return handling, and performed a cold-cache offline reload with 0 console/page errors.
- Repository axe test: pass locally and against live: 0 WCAG 2 A/AA and 2.1 AA violations across `/`, `/privacy`, and `/terms` at 390×844.

## Independent product exercise

- Normal flow: a five-row caption plan produced 4 changes and isolated one blank source identity. A deliberately incomplete post-edit export reported differences and its exceptions CSV contained the blank source identity, duplicate verification identity, and missing post-edit assets.
- Invalid/recovery flow: a `.txt` upload was rejected with CSV guidance; an unterminated quote produced actionable recovery copy; a replacement CSV then completed a date-shift preview without reload. Its exception list distinctly identified malformed date, blank identity, duplicate identity, and extra-column structural error.
- Boundary: a browser-uploaded 10,000-row CSV produced exactly 10,000 planned CSV data rows, with both first and last identities correctly transformed, in 1,701 ms. This meets the brief’s exact-once success measure.
- Receipt trust: live E2E independently verified an ECDSA P-256 signed receipt using separately downloaded public material and rejected a modified payload. The UI accurately limits the claim to browser-profile key control and says it is not identity, legal-signature, or trusted-timestamp proof.
- Scope boundary: the workbench and receipt explicitly say CSV evidence does not prove pixels or embedded XMP/IPTC were written, and it exports plans/receipts rather than image changes.

## Live parity, privacy, and response policy

- Live root, hashed JS, and hashed CSS exactly matched this rebuilt `dist`: SHA-256 `a26ca8fbd9484b0fb33ee91cddfa06e66086016a4e6832f58af015d8123bc568` (HTML), `0db802758fbc7a9f94552fc5fcd79d1b0d0de340afd12483f379e34e3ca3faa3` (JS), and `8008cfae0196d0d74a55494de9e6bf16c454357ca52bededbc98e606db7e3dd7` (CSS).
- Live service worker precache includes `/index.html`, both emitted hashed boot assets, and static assets. The live cold-cache offline reload test initialized the workbench and forced cache-bypassing fetches of JS/CSS while offline successfully.
- A controlled production-build update simulation changed the worker cache from `metadata-receipt-shell-update-v1` to `metadata-receipt-shell-update-v2`; the update toast appeared, its Reload update button activated the waiting worker, reloaded the client, and removed the old cache.
- First-load browser requests went only to `https://metadata-change-receipt.sociobot.in`. Source review and CSP show the Sociobot billing API is contacted only for license verification/checkout; no analytics, metadata upload, third-party script, or font CDN exists. CSV data remains browser-local; optional recipes/license state use local storage and the local signing key uses IndexedDB, as disclosed at `/privacy`.
- Live headers include HSTS, CSP with `default-src 'self'` and narrowly scoped billing `connect-src`, `frame-ancestors 'none'`, `nosniff`, strict referrer policy, and disabled camera/microphone/geolocation. HTML and `sw.js` revalidate at 30 seconds; hashed JS/CSS are `public, max-age=31536000, immutable`.

## Accessibility, responsive behavior, and performance

- Desktop (1440×1000) and mobile (390×844) had no page-level horizontal overflow or console/page errors. The live page has one `<h1>`, one `<main>`, `lang="en"`, a title, landmarks, labels, live-result regions, and legal routes.
- Keyboard-only smoke: first Tab reaches “Skip to main content” with a visible 4px solid focus outline. Native file, select, form, button, details, and dialog controls are used. Reduced-motion mode yielded a near-zero (`1e-05s`) transition duration and no transform motion.
- Initial JS is 46,115 bytes / 15,354 gzip (under 200 KB); CSS is 18,754 bytes / 4,941 gzip (under 50 KB); no font files load; the mobile AVIF hero is 32,032 bytes (under 300 KB). The largest JPEG fallback is 287,477 bytes.
- No standalone Lighthouse executable was available in this container, so no Lighthouse score is claimed. The direct browser, axe, DOM, bundle, caching, and response-policy checks above cover the required Lighthouse-class basics.

## Defects

No open release defects found. No P0/P1/P2/P3 defects were recorded in this verification.

## Retest notes

If a future deployment changes the static host configuration, rerun live parity hashes, live `test:e2e`, and the cold-cache offline reload. Receipt verification depends on retaining the public verification file independently from the signed receipt, as the product explains.
