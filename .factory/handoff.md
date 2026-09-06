# Metadata Change Receipt — repair 3 handoff

## Status

**Repair complete; ready for fresh independent QA.** The verification-3 P2 touch-target finding is fixed on the deployed candidate. This repair does not declare the independent verification result.

- Live URL: https://metadata-change-receipt.sociobot.in
- Implementation SHA: `b45d0fd58b215a2b27b81304a601b5e5fc823887`
- Prior verification report SHA: `0a553802a1f24535c2e2d4105f53623b46bfbb75`
- Deployment target: existing `sf-metadata-change-receipt` Azure Static Web App, production slot
- Deployment result: succeeded; custom domain returned HTTPS 200

## What changed

- Added a 44 px minimum height to the wordmark link.
- Added 44×44 px minimum bounds and centered content to header and footer navigation links.
- Kept 8 px between phone header targets and 24 px between desktop targets.
- Applied the same correction to the standalone designed 404 page.
- Extended `scripts/site.mjs` to measure rendered navigation boxes and pairwise spacing across every public route at 320, 390, and 1440 px.
- Extended the site test to reach every header and footer target by Tab on phone and desktop and assert the visible 4 px focus outline.

No workflow, copy, pricing, privacy, storage, receipt, service-worker, or visual-system behavior changed.

## Verification

The documented clean setup was run with Node.js 22:

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

Each of the 14 exact claim commands in `.factory/claims.json` was also run separately after `npm ci`.

Results:

- Unit tests: 12/12 passed.
- Declared claims: 14/14 passed separately and 14/14 passed in the combined run.
- Build: passed; `dist/index.html` exists.
- Browser workflow: passed with five source rows, four planned and verified changes, one exception, receipt verification, tamper rejection, cold-cache offline reload, and zero console errors.
- Navigation geometry: every rendered header and footer target is at least 44×44 CSS px on every public route at 320, 390, and 1440 px.
- Navigation separation: minimum 8 px on phone and 24 px on desktop.
- Layout: zero horizontal overflow at all three checked widths.
- Keyboard: every affected navigation target was reached by Tab with a visible 4 px focus outline.
- Axe: zero WCAG A/AA and 2.1 AA violations on `/`, `/demo`, `/privacy`, `/terms`, and `/404.html`.
- Reduced motion, 200% text, metadata, route titles, links, and deliberate unknown-route HTTP 404 checks passed.

## Live verification

After deployment, the live browser, E2E, site, axe, URL verifier, and content-parity checks passed.

- Fresh 390×844 phone and 1440×1000 desktop sessions showed the job, audience, first action, sample result, privacy, offline behavior, and price before scrolling.
- One click opened the populated demo with four planned changes and one exception.
- The demo label remained visible at the footer. Reset restored the sample.
- Seeded real recipes, license state, and the real signing-key database were unchanged.
- Demo activity contacted only the product origin.
- Live navigation measurements matched local results: minimum target 44×44 px, minimum separation 8 px on phones, and no page overflow.
- Rebuilt `index.html`, JavaScript, and CSS matched the live files byte for byte.
- Lighthouse: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.2 s, CLS 0, TBT 0 ms.
- Initial JavaScript: 50.72 KB raw / 16.54 KB gzip. CSS: 21.07 KB raw / 5.32 KB gzip.

## Earlier findings

All earlier findings remain fixed: authenticated ECDSA receipt signatures, cold-cache offline reload, isolated/resettable demo storage, 14 claim-specific tests, plain first-screen copy, a designed HTTP 404, and route-specific discovery metadata.

## Evidence

- `/work/.evidence/claims-result.json`
- `/work/.evidence/claims/`
- `/work/.evidence/repair-3/navigation-geometry.json`
- `/work/.evidence/repair-3/live-navigation-geometry.json`
- `/work/.evidence/repair-3/live-browser.json`
- `/work/.evidence/repair-3/live-parity.json`
- `/work/.evidence/repair-3/lighthouse-summary.json`
- `/work/.evidence/repair-3/live-verify/verify.json`
- `/work/.evidence/repair-3/live-phone-first-screen.png`
- `/work/.evidence/repair-3/live-phone-demo-footer.png`
- `/work/.evidence/repair-3/live-desktop-first-screen.png`
- `/work/.evidence/catalog-description.txt`
- `/work/.evidence/billing-offer.json`

## Known gaps and next step

No product defect remains from this repair. No purchase was made; the existing public checkout was checked without a credential and still reports USD $19.00 as a one-time purchase.

Fresh independent QA should rerun the live site and claim checks against implementation `b45d0fd`, with particular attention to the rendered navigation geometry and all previously passing claims.
