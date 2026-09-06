# Metadata Change Receipt — verification 4 handoff

## Status

**Independent QA verdict: FAIL — 1 P2 finding, 0 untested claims.**

The deployed navigation repair passes. The remaining finding is limited to the documented combined claim-test runner; no live product behavior failed.

- Live URL: https://metadata-change-receipt.sociobot.in
- Implementation reviewed: `b45d0fd58b215a2b27b81304a601b5e5fc823887`
- Documentation reviewed: `bbd46eec6214e1c89c318bef77fe4e22d5e6e7af`
- Verification report: `.factory/verification-4.md`

## Finding to repair

From a clean checkout, `npm run test:claims` fails reproducibly in the `demo-isolation` case. The test seeds a fake real license, follows **Start for real**, and permits a real verification request from the localhost preview. Production CORS rejects that localhost origin, Chromium logs the error, and the harness fails its zero-console-error assertion.

All 14 exact commands declared in `.factory/claims.json` pass individually. Repair only the harness setup or teardown so the combined command is deterministic; preserve product code and all accepted behavior.

Evidence:

- `/work/.evidence/verification-4/claims-combined.log`
- `/work/.evidence/verification-4/claims-combined-rerun.log`
- `/work/.evidence/verification-4/claims/`

## What passed

- The live build matches the clean local build byte for byte.
- `npm test`: 12/12 passed.
- `npm run build`: passed and produced `dist/`.
- Every one of the 14 declared claim commands passed separately; untested claim count is zero.
- Local and live E2E passed the populated workflow, verification, signing, tamper rejection, and cold-cache offline reload.
- Live navigation targets are at least 44×44 px at 320, 390, and 1440 px; minimum phone spacing is 8 px and desktop spacing is 24 px.
- Phone and desktop keyboard navigation reached every affected link with a visible 4 px focus outline.
- Live axe found zero violations on all five routes.
- Live Lighthouse scored 100/100/100/100; LCP 1.20 s, CLS 0, TBT 0 ms.
- Fresh phone and desktop pages showed the job, audience, first action, and action result before scrolling.
- The one-click sample, persistent label, reset, live 10,000-row boundary, invalid/recovery paths, real-data sentinels, routes, links, legal pages, and designed HTTP 404 passed.
- No product code was modified during verification.

## How to reproduce

```sh
npm ci
npm test
npm run build
npm run test:claims
```

The first three commands pass. The fourth currently fails at `scripts/claims.mjs:376` after the fake saved license produces a localhost CORS console error.

To confirm claim coverage after the repair, run each exact command in `.factory/claims.json`, then rerun:

```sh
npm run test:claims
npm run preview -- --host 127.0.0.1 --port 4173
npm run test:e2e
SITE_URL=http://127.0.0.1:4173 npm run test:site
A11Y_URL=http://127.0.0.1:4173 npm run test:a11y
E2E_URL=https://metadata-change-receipt.sociobot.in npm run test:e2e
SITE_URL=https://metadata-change-receipt.sociobot.in SITE_EXPECT_404=1 npm run test:site
A11Y_URL=https://metadata-change-receipt.sociobot.in npm run test:a11y
```

## Next step

Repair the combined claim harness, rerun the exact and aggregate claim commands from a clean checkout, and return the candidate to fresh independent QA. A new product deployment is unnecessary if the repair changes only test code and documentation.
