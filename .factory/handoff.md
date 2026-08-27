# Metadata Change Receipt — repair handoff

## Release status: READY FOR STANDARD STATIC DEPLOY

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
