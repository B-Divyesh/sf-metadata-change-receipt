# Metadata Change Receipt

[Metadata Change Receipt](https://metadata-change-receipt.sociobot.in) is a local-first audit utility for photographers and small archives. It turns an exported metadata CSV plus one explicit transformation into a row-by-row before/after receipt, a planned CSV, and a complete exception list. A second post-edit CSV can be reconciled against the plan.

It is an evidence layer around Lightroom, ExifTool, Immich, PhotoPrism, or a spreadsheet—not a photo organizer. It never uploads CSV contents and never writes image files or XMP/IPTC metadata.

## What it does

- Parses quoted, multiline CSV files up to 25 MB entirely in the browser.
- Applies exact value, find/replace, keyword append, text prepend, and date-shift rules.
- Scopes a rule with an optional exact-match condition.
- Isolates blank/duplicate identifiers, malformed dates, structural row problems, missing assets, and mismatched post-edit values.
- Exports the complete planned CSV, change ledger, exceptions CSV, and a human-readable HTML receipt.
- Seals the receipt with SHA-256 over embedded canonical JSON evidence. This is tamper-evident, not an identity signature.
- Works offline after the first production visit.

The free workflow includes every core CSV export at any supported row count. The optional $19 one-time Plus license adds local recipe saving, receipt notes, and JSON evidence export through the Sociobot billing API.

## CSV expectations

The first row must contain unique, nonblank column names. Choose a stable, unique identity column such as filename, full path, asset ID, or UUID. For strongest verification, export the same identity and edited field after your external metadata job and load it in step 3.

CSV comparison proves what exports contain. It does **not** prove that pixels or embedded XMP/IPTC blocks were written; keep backups and test the external writer separately.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:5173`.

## Test and build

```sh
npm test
npm run build
```

The exact production build command is `npm run build`. It produces a static deploy in `./dist` with `dist/index.html` at the root.

For browser checks, run `npm run preview` in one terminal, then:

```sh
npm run test:e2e
A11Y_URL=http://127.0.0.1:4173 npm run test:a11y
```

`CHROMIUM_PATH` can override the browser executable used by those scripts.

## Deployment

Deploy the contents of `dist/` to Azure Static Web Apps. `public/staticwebapp.config.json` supplies SPA route fallback, cache policy, and security headers. The factory owns DNS, billing registration, and deployment.

## Privacy and legal

The app has no analytics, third-party fonts, runtime CDN scripts, or metadata uploads. License tokens and optional saved recipes use browser local storage. See the in-app [`/privacy`](https://metadata-change-receipt.sociobot.in/privacy) and [`/terms`](https://metadata-change-receipt.sociobot.in/terms) pages.

The original risograph hero asset, prompt, and provenance live in `assets/src/`; the complete product-specific visual system is in `.factory/design.md`. Product scope is recorded in `.factory/brief.json`.

## License

MIT. See `LICENSE`.
