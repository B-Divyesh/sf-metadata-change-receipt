# Metadata Change Receipt

Metadata Change Receipt helps photographers and small archive managers plan and check metadata CSV changes.

It runs in the browser. The free workflow exports planned values, exceptions, and an ECDSA P-256 signed receipt.

## Try the isolated demo

Open [`/demo`](https://metadata-change-receipt.sociobot.in/demo), or select **Try it with sample data** on the first screen.

The demo loads five photo records. Its planned caption change produces four changed rows and one missing-filename exception.

Demo signing state is temporary. Demo labels use `demo:metadata-change-receipt:*` session storage and never read real product storage.

Use **Reset demo** to restore the sample. Use **Start for real** to discard demo state and load the empty workbench.

## What the free workflow does

- Reads exported CSV files without uploading their contents.
- Plans caption, date, keyword, and other IPTC-column changes.
- Leaves the selected source CSV unchanged and exports a separate planned CSV.
- Exports complete change and exception lists.
- Compares a later CSV and reports missing, duplicate, or mismatched rows.
- Signs receipt evidence with a private ECDSA P-256 key stored in browser IndexedDB.
- Verifies a signed receipt with its separately saved public verification file.
- Reloads the populated demo offline after its first visit.
- Represents every intended change exactly once in the included 10,000-row boundary test.

## Limits

The app does not edit photos or write embedded XMP or IPTC data. A CSV comparison proves records, not image-file changes.

Keep the public verification file outside the receipt folder. The key identifies one browser profile, not a person or trusted time.

## Plus

The free workflow includes signed receipts, public verification files, planned CSV files, and exception lists.

Plus costs USD $19 once for one person. It adds local recipes, receipt notes, and a separate JSON evidence export.

Purchase and license checks use the Sociobot billing API. A saved license check result is reused for up to one day.

## Run and verify

Use Node.js 22 or another current LTS release.

```sh
npm ci
npm test
npm run build
npm run test:claims
npm run preview -- --host 127.0.0.1
```

In another shell, run the production browser checks:

```sh
npm run test:e2e
A11Y_URL=http://127.0.0.1:4173 npm run test:a11y
```

Every public claim and its independent command is listed in [`.factory/claims.json`](.factory/claims.json).

## Deploy

Deploy the contents of `dist/` to the product’s static host. The factory owns DNS and deployment configuration.

## Privacy and terms

The product has no analytics or third-party runtime scripts. See [`/privacy`](https://metadata-change-receipt.sociobot.in/privacy) and [`/terms`](https://metadata-change-receipt.sociobot.in/terms).

Licensed under the [MIT License](LICENSE).
