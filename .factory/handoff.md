# Metadata Change Receipt — handoff

## Shipped

- Complete local-first CSV audit workflow: drag/select source, sample data, field and identity selection, five transformation modes, optional exact-match scope, first-100 preview with all-row exports, and clear empty/loading/error/offline states.
- Deterministic exception handling for blank and duplicate identities, extra CSV cells, invalid dates, absent verification assets, duplicate verification identities, and mismatched values.
- Optional post-edit CSV reconciliation with verified/mismatch counts.
- Downloads for the planned metadata CSV, full change ledger, exceptions CSV (including an empty header-only file), and a print-friendly HTML receipt.
- Receipt SHA-256 seal over canonical JSON embedded in the HTML. Copy clearly distinguishes tamper evidence from proof of authorship and CSV evidence from proof that embedded XMP/IPTC was written.
- $19 one-time Plus tier through the Sociobot billing contract: checkout link, return-token capture, local token storage, daily verification cache, offline cached unlock, restore field, inactive-license notice, and no gating of core exports or accessibility. Plus adds saved local recipes, receipt notes, and JSON evidence.
- Responsive 390px layout, keyboard-operable native controls, designed focus states, reduced-motion handling, legal routes, offline service worker, manifest, security headers, robots/sitemap, and no analytics/CDN/runtime third parties.
- Original risograph hero art in AVIF, WebP, and JPEG at 768/1536 widths. Mobile AVIF is 32 KB; mobile WebP is 48 KB; all shipped hero variants are within the 300 KB budget. Source/prompt provenance is in `assets/src/receipt-worktable.png.json` and `.factory/design.md`.

## Verification

Run from a clean clone:

```sh
npm install
npm test
npm run build
```

Output is `dist/` with `dist/index.html` at its root.

Completed locally on 2026-08-27:

- `npm test`: 9/9 tests pass, including a 10,000-row fixture with 10,000 unique receipt entries.
- `npm run build`: passes TypeScript strict checks and Vite build.
- Production bundle: 37.6 KB JavaScript / 13.1 KB gzip; 17.8 KB CSS / 4.8 KB gzip; no web fonts.
- `npm run test:e2e` against production preview: five source rows, four planned edits, four verified values, one surfaced exception, signed receipt and exception CSV inspected, offline status exercised, paid return-token unlock mocked and verified, zero console errors.
- `npm run test:a11y`: zero axe WCAG 2 A/AA and 2.1 AA violations on the sample-populated workbench, `/privacy`, and `/terms` at 390×844.
- `/opt/fleet/lib/verify-url.sh`: title present, `lang=en`, one h1, main landmark present, no missing alt text, no unlabeled buttons, zero console/page errors; desktop and 390px screenshots reviewed.
- Lighthouse 12.8.2 mobile production preview: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1.4 s, total blocking time 0 ms, CLS 0.

Local audit artifacts were intentionally excluded from git under `.factory/evidence*/`.

## Known boundaries

- The app processes one transformation rule at a time. Multi-rule jobs should export the planned CSV and use it as the next source, keeping each receipt narrow and inspectable.
- CSV input is capped at 25 MB to avoid exhausting memory on smaller phones. The 10,000-row target is covered comfortably.
- Date shifting intentionally accepts date strings beginning with `YYYY-MM-DD` or EXIF-style `YYYY:MM:DD`; ambiguous locale dates become exceptions.
- Receipt sealing is an unkeyed SHA-256 integrity digest, not a legal digital signature or proof of operator identity.
- The production Sociobot billing product must be registered by the factory; no product ID or secret is embedded here.
- Browser support targets current evergreen browsers with Web Crypto, dialog, and service worker support.

## Suggested next steps

1. Register the production billing product and exercise checkout/return/revocation against the deployed origin.
2. Run the same Lighthouse and end-to-end scripts against the final HTTPS URL after deployment.
3. Consider a multi-rule receipt format only after observing real archive workflows; avoid weakening the one-rule/one-proof mental model prematurely.
