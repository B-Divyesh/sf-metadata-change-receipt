# Metadata Change Receipt — verification 3 handoff

## Status

**FAIL — 1 P2 finding, 0 untested claims.** Do not treat a successful worker exit as a product PASS.

- Live URL: https://metadata-change-receipt.sociobot.in
- Implementation reviewed: `c32f6f72a10e75f05a7cd5879c2c58b7f7d7efb7`
- Documentation reviewed: `1058d96d7385c94217054259c38f82454e056e1c`
- Full report: `.factory/verification-3.md`

## What was verified

- Fresh phone and desktop first screens state the job, audience, first action, demo result, privacy, offline behavior, and price before scrolling.
- The one-click demo is populated, labeled, resettable, and isolated from seeded real recipes, licenses, verdicts, and signing keys.
- All 14 declared claim commands passed separately from a clean clone. The combined run also passed 14/14.
- Unit, build, local/live E2E, local/live axe, local/live route, offline, 10,000-row, invalid/recovery, link, legal, and designed-404 checks passed.
- The rebuilt root, JavaScript, and CSS match the live deployment byte for byte.
- Live Lighthouse scored 100 in Performance, Accessibility, Best Practices, and SEO.
- All seven findings recorded in the earlier verification and review reports remain fixed.

## Finding left for repair

Several mobile navigation links have clickable boxes smaller than the required 44×44 CSS pixels. At 390 px, this includes the 40 px-high header wordmark, the roughly 36 px-wide header Demo link, and footer links that are about 25 px high.

Increase their clickable padding or minimum dimensions while keeping at least 8 px between adjacent targets. Then rerun the phone touch-target measurement, live site and axe suites, and the full quality gates.

## How to verify

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

Live checks:

```sh
E2E_URL=https://metadata-change-receipt.sociobot.in npm run test:e2e
SITE_URL=https://metadata-change-receipt.sociobot.in SITE_EXPECT_404=1 npm run test:site
A11Y_URL=https://metadata-change-receipt.sociobot.in npm run test:a11y
```

## Evidence

- `/work/.evidence/qa-report.md`
- `/work/.evidence/qa-result.json`
- `/work/.evidence/claims-result.json`
- `/work/.evidence/verification-3/live-independent.json`
- `/work/.evidence/verification-3/ui-baseline.json`
- `/work/.evidence/verification-3/link-crawl.json`
- `/work/.evidence/verification-3/lighthouse-live.json`
- `/work/.evidence/verification-3/verify-url/verify.json`

No product code was changed during verification.
