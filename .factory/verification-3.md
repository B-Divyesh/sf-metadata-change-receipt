# Verify metadata CSV change receipts — verification 3

**Verdict: FAIL — 1 P2 finding, 0 untested claims. Do not declare this product PASS.**

**Job:** plan metadata CSV changes, check a later export, and keep a signed before-and-after receipt without uploading photo metadata.

**Audience:** photographers and small archive managers who need to audit batch metadata work.

**First action before scrolling:** **Try it with sample data**. It opens five populated records with four planned changes and one exception.

## Candidate and live version

- Implementation reviewed: `c32f6f72a10e75f05a7cd5879c2c58b7f7d7efb7`.
- Documentation reviewed: `1058d96d7385c94217054259c38f82454e056e1c`.
- The only change between those commits is `.factory/handoff.md`.
- Live URL: https://metadata-change-receipt.sociobot.in
- A clean rebuild matched the live root, JavaScript, and CSS byte for byte.

| File | SHA-256 |
| --- | --- |
| `index.html` | `92520047af810da7e95b2f96663cb49f6c3f6691a91fb3fc12fb6a665040fabf` |
| `assets/index-DFlzNRKf.js` | `3dead364c23af9b1c1559c8958c596b7ba18befdbeb88772a83a34fb27e7bec7` |
| `assets/index-Dsy6Gw_Z.css` | `ca951f8275175ea8d2aefe52ad54be97a9ce4318908f77f32f164a2e94185a65` |

## Finding

### P2 — Several mobile navigation targets are smaller than 44×44 px

At a fresh 390×844 viewport, several visible links do not meet the attached accessibility and design contracts, which require touch targets of at least 44×44 CSS pixels.

- Header wordmark: about 200×40 px.
- Header **Demo** link: about 36×44 px.
- Footer **Demo**, **Privacy**, and **Terms** links: about 43×25, 52×25, and 44×25 px.

The links remain keyboard-operable and axe reports no WCAG A/AA violations. This is still a contract defect for people who need larger touch targets. Increase the clickable padding or minimum dimensions without reducing the visible spacing between targets.

Evidence: `/work/.evidence/verification-3/ui-baseline.json`.

## First-screen and demo checks

Fresh 390×844 phone and 1440×1000 desktop contexts showed the following before scrolling:

- Job: **Plan and prove metadata CSV changes**.
- Audience: photographers and small archive managers.
- First action: **Try it with sample data**.
- Result note: five sample records and four planned edits.
- Facts: browser-local CSV handling, offline return, free core, and $19 one-time Plus price.

Both viewports had no page-level horizontal overflow. The phone demo opened in one click, showed four planned changes and one exception, and kept **Demo — sample data, nothing is saved** visible with **Reset demo** and **Start for real** controls.

The reset restored `[4 planned, 0 unchanged, 0 verified, 1 exception]`. Seeded real recipe, license, and verdict values remained unchanged, and the demo did not create the real signing-key IndexedDB database.

Evidence:

- `/work/.evidence/verification-3/live-phone-first-screen.png`
- `/work/.evidence/verification-3/live-desktop-first-screen.png`
- `/work/.evidence/verification-3/live-phone-demo.png`
- `/work/.evidence/verification-3/live-independent.json`

## Claim results

Each exact command in `.factory/claims.json` was run separately from a clean clone after `npm ci`. The consolidated command was also run. All 14 passed; no declared or public reliance claim was left untested.

| Claim | Result |
| --- | --- |
| `@claim:demo-isolation` | PASS |
| `@claim:local-private-flow` | PASS |
| `@claim:offline-reload` | PASS |
| `@claim:field-transformations` | PASS |
| `@claim:source-unchanged` | PASS |
| `@claim:exact-once-10000` | PASS |
| `@claim:csv-exports` | PASS |
| `@claim:verification-exceptions` | PASS |
| `@claim:signed-receipt` | PASS |
| `@claim:tamper-detection` | PASS |
| `@claim:local-signing-key` | PASS |
| `@claim:plus-price` | PASS |
| `@claim:daily-license-check` | PASS |
| `@claim:plus-deliverables` | PASS |

The live public checkout still reports a USD $19.00 one-time purchase. No purchase was made and no credential was used.

Evidence: `/work/.evidence/claims-result.json` and `/work/.evidence/claims/*.png`.

## Functional and recovery checks

- Normal demo flow: five source rows, four planned changes, four verified changes, one exception, signed receipt verification, and tamper rejection passed.
- Invalid extension: a `.txt` file produced clear CSV guidance.
- Invalid CSV: an unclosed quoted field produced a specific recovery message.
- Recovery: replacing the invalid file completed a caption plan without reloading.
- Boundary: a 10,000-row CSV produced 10,000 downloaded changes with 10,000 unique identities in 1,464 ms on the live phone context.
- Empty state: the rule controls begin disabled and the page explains that a preview creates the receipt.
- Offline: a fresh service-worker-controlled demo reloaded from its cached shell while offline and kept the populated sample.
- Update handling: the build generates a content-derived service-worker cache version. No public automatic-update claim is made.

## Accessibility, privacy, routes, and links

- Live and local axe checks found 0 WCAG A/AA and 2.1 AA violations across `/`, `/demo`, `/privacy`, `/terms`, and `/404.html`.
- `lang="en"`, one `h1`, one `main`, labels, landmarks, alternative text, and route titles passed.
- The first Tab stop is the skip link with a visible 4 px focus outline. All 28 visible demo controls were reached once in a keyboard loop with no trap.
- The license dialog moved focus inside itself and closed with Escape.
- Reduced motion set transitions to `0.01ms`. The site test passed at 200% text size.
- Demo planning, reset, invalid-file, recovery, and 10,000-row activity contacted only the product origin.
- Privacy and Terms returned 200 and had distinct titles. Internal crawling checked 20 route links with no broken link.
- An unknown live path returned the designed page with HTTP 404 and working return links. This expected 404 is not a defect.
- Security headers include CSP, `frame-ancestors 'none'`, HSTS, `nosniff`, a strict referrer policy, and disabled camera, microphone, and geolocation.
- This is a static product. Backend tenant isolation, restart persistence, health probes, SQLite persistence, and 429 handling do not apply.
- The deterministic audit workflow does not need an AI step; adding one would weaken the stated local, repeatable transformation job.

## Build and performance results

From the clean checkout:

```sh
npm ci
npm test
npm run build
npm run test:claims
npm run preview -- --host 127.0.0.1
npm run test:e2e
SITE_URL=http://127.0.0.1:4173 npm run test:site
A11Y_URL=http://127.0.0.1:4173 npm run test:a11y
```

- `npm ci`: PASS, 0 reported vulnerabilities.
- `npm test`: PASS, 12/12 tests.
- `npm run build`: PASS; `dist/index.html` exists.
- Initial JavaScript: 50.72 KB raw, 16.54 KB gzip.
- CSS: 20.89 KB raw, 5.30 KB gzip.
- Mobile hero AVIF: 32.03 KB. No downloaded fonts.
- Local and live E2E, site, and axe suites: PASS.
- Live URL verifier: PASS with no console errors.
- Live Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.2 s, CLS 0, TBT 0 ms.

Evidence:

- `/work/.evidence/verification-3/verify-url/verify.json`
- `/work/.evidence/verification-3/link-crawl.json`
- `/work/.evidence/verification-3/lighthouse-live.json`

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Receipt was an unauthenticated digest | Fixed. ECDSA P-256 verification passes and changed payloads fail. |
| Offline reload omitted built JS and CSS | Fixed. Cold-cache offline reload passes on live and local. |
| Demo used real product storage | Fixed. Live sentinel and IndexedDB checks prove isolation and reset behavior. |
| Claim registry and claim-specific tests were missing | Fixed. Fourteen declared commands pass separately and together. |
| First screen did not state the job, audience, action, and facts plainly | Fixed on fresh phone and desktop contexts. |
| Unknown paths returned the landing page with 200 | Fixed. Unknown live paths return the designed 404 document with status 404. |
| Canonical, social, Twitter, and touch-icon metadata were missing | Fixed across public routes. The social image is 1200×630 and the touch icon is 180×180. |

No earlier minor findings were recorded.

## Result

**FAIL — 1 finding and 0 untested claims.** The product job and all declared claims work, and every earlier finding is resolved. The current candidate still fails the explicit 44×44 mobile touch-target requirement, so PASS is not allowed.
