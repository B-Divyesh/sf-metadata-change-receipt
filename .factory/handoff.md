# Metadata Change Receipt — repair handoff

## Release status

**PASS for the stated static, local-first product scope.** The five findings in `.factory/review-1.md` are resolved. The two earlier P1 findings remain fixed.

- Live URL: https://metadata-change-receipt.sociobot.in
- Base review SHA: `6123fb3492ea92253770ea5e03c43a177f62f1fc`
- Main demo/site implementation SHA: `70dc4c607757c63a8e6552711b30225e4335e806`
- Public contract documentation SHA: `d8dc837eba1896e692d9ce4d334ed7b74ab52097`
- Deployed implementation SHA: `c32f6f72a10e75f05a7cd5879c2c58b7f7d7efb7`
- Successful deployment: 2026-09-06, Azure Static Web Apps production slot for `sf-metadata-change-receipt`

The first deployment attempt rejected three trailing-slash aliases after normalizing them to duplicate routes. Commit `c32f6f7` removed those aliases. The next deployment succeeded, and the custom HTTPS origin served the new build.

## What changed

### Isolated demo

- `/demo` opens in one click with five photo records, four planned caption changes, and one missing-filename exception.
- A sticky **Demo — sample data, nothing is saved** banner provides **Reset demo** and **Start for real**.
- Demo signing keys live only in memory. Demo labels use `demo:metadata-change-receipt:*` session storage.
- Demo code does not read or write the real recipe, license, verdict, or signing-key stores.
- Reset drops the temporary key and restores the sample. Start for real clears the demo namespace without copying data.
- `.factory/demo.md` documents the entry point, sample, namespace, reset, and exit behavior.

### Claims and regression coverage

- `.factory/claims.json` declares 14 public claims.
- `scripts/claims.mjs` gives each claim one `@claim:<id>` outcome test in a fresh browser context.
- Coverage includes isolation, request privacy, offline reload, transformations, source preservation, all CSV exports, later-export exceptions, signatures, tamper rejection, persistent real keys, the live price, daily license caching, and paid deliverables.
- The 10,000-row browser fixture exports exactly 10,000 rows with 10,000 unique identities.

### Plain words and first screen

- The title names the job: **Plan and prove metadata CSV changes**.
- The next sentence names photographers and small archive managers.
- The first action is **Try it with sample data**, beside the real CSV action and a concrete result.
- Private processing, offline return, the free core, and the $19 one-time Plus price fit in the 390×844 first screen.
- Metaphor-led headings were replaced on the landing, Privacy, and Terms routes.
- `.factory/copy-audit.md` records the rendered copy, word counts, and terminology.

### Routes and discovery

- Added a product-styled `404.html` with return and demo links.
- Azure Static Web Apps returns that page with HTTP 404 for unknown paths.
- `/`, `/demo`, `/privacy`, and `/terms` have distinct titles, descriptions, canonical URLs, Open Graph tags, and Twitter tags.
- Added a 1200×630 social image composed from the original risograph art and a 180×180 apple-touch icon.
- The sitemap includes `/demo`; known routes have physical build outputs and explicit host rewrites.
- Internal navigation updates history, restores routes on back/forward, moves focus to the route `h1`, and announces the title.

### Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| Receipt used an unauthenticated digest | Fixed before this repair. Live ECDSA P-256 verification passes, and a modified payload fails. |
| Offline first reload missed hashed JS/CSS | Fixed before this repair. Live cold-cache offline reload passes from a fresh context. |
| Demo was not isolated | Fixed and covered by `@claim:demo-isolation`. |
| Claims registry was missing | Fixed with 14 declared, individually runnable claim commands. |
| First screen was not plain enough | Fixed and verified at 390×844 and 1440×1000. |
| Unknown paths returned the landing page with 200 | Fixed. The live unknown-path check returns the designed page with HTTP 404. |
| Canonical, social metadata, and apple icon were missing | Fixed on every public route and the 404 document. |

No earlier minor findings were recorded. The repair also added route focus, 200% text-size, reduced-motion, and metadata regression checks.

## Verification

Run from a clean dependency install:

```sh
npm ci
npm test
npm run build
npm run test:claims
npm run preview -- --host 127.0.0.1
npm run test:e2e
npm run test:site
A11Y_URL=http://127.0.0.1:4173 npm run test:a11y
```

Results:

- `npm ci`: pass, 0 reported vulnerabilities.
- `npm test`: pass, 12/12 unit tests.
- `npm run build`: pass; `dist/index.html` exists.
- Initial JS: 50.72 KB raw, 16.54 KB gzip. CSS: 20.89 KB raw, 5.30 KB gzip. No font download.
- Mobile hero AVIF: 32.03 KB. Social image: 187.44 KB.
- Every one of the 14 commands in `.factory/claims.json` was run individually and passed.
- Consolidated `npm run test:claims`: 14/14 passed.
- Local production E2E: pass with 0 console errors.
- Local route/keyboard/reduced-motion/200%-text check: pass across five routes.
- Local Playwright axe: 0 WCAG A/AA and 2.1 AA violations across five routes.
- Static Web Apps emulator: known routes return 200; an unknown route returns the designed 404 with status 404.
- Local Lighthouse mobile: Performance 99, Accessibility 100, Best Practices 100, SEO 100; LCP 1.9 s, CLS 0, TBT 0 ms.

Live production results:

- Factory URL verifier: title/lang/main/alt/button checks passed; 0 console errors.
- HTTPS status: root, demo, privacy, terms, robots, sitemap, social image, and apple icon return 200.
- Unknown HTTPS path: deliberate 404 with the designed page and return links.
- Live E2E: 5 rows, 4 planned changes, 4 verified changes, 1 exception, signed receipt, tamper rejection, offline reload, and paid-license return handling passed.
- Live axe: 0 violations across root, demo, privacy, terms, and the 404 document.
- Live site test: route metadata, canonical URLs, keyboard focus, back navigation, reduced motion, 200% text, and 404 behavior passed.
- Fresh 390×844 and 1440×1000 contexts showed the job, audience, primary action, and three facts before scrolling.
- The live phone entered the demo in one click, showed `[4, 0, 0, 1]`, reset successfully, and preserved seeded real-storage sentinels.
- Live Lighthouse mobile: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.6 s, CLS 0, TBT 0 ms.
- Live root HTML, hashed JS, and hashed CSS match the rebuilt candidate byte for byte.

## Evidence

- `/work/.evidence/claims-result.json`
- `/work/.evidence/claims/*.png`
- `/work/.evidence/live-verify/verify.json`
- `/work/.evidence/live-phone-first-screen.png`
- `/work/.evidence/live-desktop-first-screen.png`
- `/work/.evidence/live-demo-phone.png`
- `/work/.evidence/live-first-screen.json`
- `/work/.evidence/lighthouse.json`
- `/work/.evidence/lighthouse-live.json`
- `/work/.evidence/catalog-description.txt`
- `/work/.evidence/billing-offer.json`

## Billing

The existing public offer remains intact: Metadata Change Receipt Plus, USD $19.00, one-time purchase. The live checkout reported `one_time_price` and 1900 minor units.

Plus still provides local saved recipes, receipt notes, and a separate JSON evidence export. The free signed receipt, public verification file, planned CSV, and exceptions stay free.

The checkout and verification integration depends on the Sociobot billing API. A real purchase was not made and no credential was invented. The valid-license UI path is covered with a recorded API response; the live public checkout and exact price were checked separately.

## Known limits

- The product proves CSV plans and comparisons. It does not prove pixels or embedded XMP/IPTC were written.
- A receipt signature identifies control of a browser-held key, not a person, organization, legal signer, or trusted time.
- Users must keep the public verification file separately if they want independent verification later.
- Lighthouse lab data reports TBT, not field INP. No INP claim is made.
- This is a static product. Backend tenant isolation, restart persistence, health probes, and 429 handling do not apply.
