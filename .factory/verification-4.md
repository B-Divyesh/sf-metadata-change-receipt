# Plan and verify metadata CSV change receipts — verification 4

**Verdict: FAIL — 1 P2 finding, 0 untested claims. Do not declare this product PASS.**

**Job:** plan metadata CSV changes, check a later export, and keep a signed before-and-after receipt without uploading photo metadata.

**Audience:** photographers and small archive managers who need to audit batch metadata work.

**First action before scrolling:** **Try it with sample data**. It opens five populated records with four planned changes and one exception.

## Candidate and live version

- Implementation reviewed: `b45d0fd58b215a2b27b81304a601b5e5fc823887`.
- Documentation reviewed: `bbd46eec6214e1c89c318bef77fe4e22d5e6e7af`.
- The only later change is the repair handoff.
- Live URL: https://metadata-change-receipt.sociobot.in
- A clean rebuild matched the live root, JavaScript, and CSS byte for byte.

| File | SHA-256 |
| --- | --- |
| `index.html` | `79627b5334fe8fc7537d78b6e574c7ce059867ce96d35b4e9ce7b1006e560eb6` |
| `assets/index-DD-bn7OS.js` | `3dead364c23af9b1c1559c8958c596b7ba18befdbeb88772a83a34fb27e7bec7` |
| `assets/index-Bd2Z7j_A.css` | `179f088274c24d286de8e207cd2e369744004d1ec4d0e084c143b95ceae28553` |

## Finding

### P2 — The documented combined claim command fails from a clean checkout

`npm run test:claims`, documented in the README and repair handoff, failed on two consecutive runs from the clean checkout. Its `demo-isolation` case seeds `sb_license:metadata-change-receipt` with `real-license-sentinel`, selects **Start for real**, and then allows the real-mode page to verify that fake token. The local preview origin is not allowed by the production billing endpoint, so Chromium reports a CORS error and `scripts/claims.mjs:376` rejects the non-empty console-error list.

All 14 exact commands declared in `.factory/claims.json` passed individually. The isolated demo also passed an independent live sentinel check, and the deployed origin receives a valid CORS response from the license endpoint. This is a test-harness and documented-verification defect, not a failure of the live metadata workflow. It still makes the documented aggregate check unreliable and contradicts the prior handoff statement that the combined run passes.

Repair the claim harness without changing product behavior. The isolation case can intercept the expected license check, clear the fake license before entering real mode, or otherwise make the transition deterministic. Then prove both the combined command and all 14 exact commands from a clean checkout.

Evidence:

- `/work/.evidence/verification-4/claims-combined.log`
- `/work/.evidence/verification-4/claims-combined-rerun.log`
- `/work/.evidence/verification-4/claims/`
- `/work/.evidence/verification-4/license-fake-headers.txt`

## Navigation repair

The verification-3 finding is fixed on the live deployment.

- Every visible header and footer link measured at least 44×44 CSS px on `/`, `/demo`, `/privacy`, `/terms`, and `/404.html` at 320, 390, and 1440 px.
- Minimum measured target width and height were both exactly 44 px.
- Minimum phone separation was 8 px; minimum desktop separation was 24 px.
- Every header and footer target was reached by Tab on phone and desktop with a visible 4 px focus outline.
- No checked route overflowed horizontally. The 200% text check also had no horizontal page overflow.

Evidence: `/work/.evidence/verification-4/live-navigation-geometry.json` and `/work/.evidence/verification-4/live-site-rerun.log`.

## First screen and demo

Fresh 390×844 phone and 1440×1000 desktop contexts showed the job, audience, primary action, and the action result before scrolling. Both also presented the three plain facts about browser-local processing, offline return, and the free/$19 price.

One click opened `/demo`. The sample showed four changed rows, zero already matching, zero outside the rule, and one exception. The first row changed `IMG_1042.CR3` from “Heron at the west pond” to “Archive review complete.” The sticky **Demo — sample data, nothing is saved** label remained visible after scrolling to the footer.

After changing the sample rule, **Reset demo** restored four changes, one exception, and the original rule. Seeded real recipe, license, verdict, and signing-key records were unchanged. Demo activity contacted only the product origin.

Evidence:

- `/work/.evidence/verification-4/live-first-demo.json`
- `/work/.evidence/verification-4/live-phone-first-screen.png`
- `/work/.evidence/verification-4/live-desktop-first-screen.png`
- `/work/.evidence/verification-4/live-phone-demo-footer.png`

## Claim results

Each exact command in `.factory/claims.json` was run separately after `npm ci`. All 14 passed, and every public reliance claim found on the live pages and in the README has a declared test. Untested claim count: 0.

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

The public checkout returned a 303 to a hosted Dodo checkout whose page showed USD $19.00 and one-time pricing. No purchase was made and no credential was used.

## Functional and recovery checks

- Normal flow: five rows, four planned and verified changes, one exception, signed receipt verification, and changed-payload rejection passed locally and live.
- Wrong extension: a `.txt` file produced clear CSV-selection guidance.
- Malformed CSV: an unclosed quoted field produced a specific recovery message.
- Recovery: a valid replacement file produced two planned changes without reloading.
- Boundary: the live phone context produced 10,000 downloaded changes with 10,000 unique identities in 427 ms.
- Empty state: controls begin disabled and explain that a preview creates the receipt.
- Offline: a fresh service-worker-controlled demo reloaded its populated sample from the cache with the HTTP cache unavailable.
- Update path: the generated service worker uses a content-derived cache version and exposes a reload action when a waiting worker exists. No automatic-update claim is made.

Evidence: `/work/.evidence/verification-4/live-invalid-boundary.json`, `/work/.evidence/verification-4/local-e2e.log`, and `/work/.evidence/verification-4/live-e2e.log`.

## Accessibility, privacy, routes, and performance

- Live axe found zero WCAG A/AA and 2.1 AA violations on `/`, `/demo`, `/privacy`, `/terms`, and `/404.html`.
- The worker URL verifier found a title, `lang="en"`, one `h1`, one `main`, complete image alternatives, labeled buttons, and zero console errors.
- The first Tab stop is the skip link. SPA navigation moves focus to the new `h1`; back navigation restores route focus.
- The license dialog focuses its token field, closes with Escape, returns focus to its opener, and announces its empty-token error.
- Reduced motion disables visible transition movement. The deliberate single paper-light theme is documented in `.factory/design.md`.
- Demo planning, reset, malformed-file recovery, and the 10,000-row path contacted only the product origin.
- Privacy and Terms returned 200 with distinct titles. Fourteen discovered links were checked; internal links passed, the mail link was explicit, and checkout redirected as intended.
- An unknown path returned the designed 404 page with HTTP 404 and working return links. This expected response is not a defect.
- Security headers include CSP, response-header `frame-ancestors 'none'`, HSTS, `nosniff`, strict referrer policy, and disabled camera, microphone, and geolocation.
- Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.20 s, CLS 0, TBT 0 ms.
- Initial JavaScript: 50.72 KB raw / 16.54 KB gzip. CSS: 21.07 KB raw / 5.32 KB gzip. No font download is used.
- This is a static product. Backend tenant isolation, restart persistence, health, SQLite, and 429 checks do not apply.
- The deterministic audit job does not benefit from adding an AI step; it would weaken local repeatability.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Receipt was an unauthenticated digest | Fixed. ECDSA P-256 verification passes and changed payloads fail. |
| Offline reload omitted built JS and CSS | Fixed. Cold-cache offline reload passes locally and live. |
| Demo used real product storage | Fixed. Live seeded local-storage and IndexedDB records remained unchanged. |
| Claim registry and claim-specific tests were missing | Fixed. Fourteen declared commands pass individually; the new aggregate-runner defect is reported above. |
| First screen did not state the job, audience, action, and facts plainly | Fixed in fresh phone and desktop contexts. |
| Unknown paths returned the landing page with 200 | Fixed. Unknown paths return the designed 404 document with status 404. |
| Canonical, social, Twitter, and touch-icon metadata were missing | Fixed across public routes. |
| Mobile navigation targets were smaller than 44×44 px | Fixed. Minimum live target size is 44×44 px with at least 8 px separation. |

No earlier minor findings were recorded.

## Commands run

```sh
npm ci
npm test
npm run build
# Every exact test command from .factory/claims.json
npm run test:claims
npm run preview -- --host 127.0.0.1 --port 4173
npm run test:e2e
SITE_URL=http://127.0.0.1:4173 npm run test:site
A11Y_URL=http://127.0.0.1:4173 npm run test:a11y
E2E_URL=https://metadata-change-receipt.sociobot.in npm run test:e2e
SITE_URL=https://metadata-change-receipt.sociobot.in SITE_EXPECT_404=1 npm run test:site
A11Y_URL=https://metadata-change-receipt.sociobot.in npm run test:a11y
/opt/fleet/lib/verify-url.sh https://metadata-change-receipt.sociobot.in /work/.evidence/verification-4/verify-url
```

`npm ci`, `npm test` (12/12), `npm run build`, every exact claim command, local/live E2E, local/live site checks, local/live axe, and the URL verifier passed. The documented aggregate `npm run test:claims` command failed as described above.

## Result

**FAIL — 1 P2 finding and 0 untested claims.** The live navigation repair and product behavior pass, but the documented combined claim runner must pass reliably before this candidate can receive a zero-finding verdict.
