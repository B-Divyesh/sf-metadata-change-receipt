# Demo sandbox

## Entry point

- Local: `http://127.0.0.1:4173/demo`
- Live: `https://metadata-change-receipt.sociobot.in/demo`

The first-screen action **Try it with sample data** opens this route in one click.

## Sample

The demo loads `sample-bird-survey.csv` with five realistic photo records. It starts with a caption rule set to `Archive review complete`.

The populated result has four planned changes and one exception. The exception is a record without a filename.

Visitors can change the rule, load another CSV, compare a later CSV, export files, sign a receipt, and verify that receipt.

## Isolation

The demo never reads or writes these real stores:

- IndexedDB: `metadata-change-receipt-keys`
- local storage: `metadata-receipt:recipes`
- local storage: `sb_license:metadata-change-receipt` and its verdict

The temporary signing key lives only in JavaScript memory. Demo labels use the session-storage prefix `demo:metadata-change-receipt:`.

**Reset demo** clears every key with that prefix, drops the temporary signing key, and restores the original five rows.

**Start for real** clears the demo namespace before opening the empty workbench. It does not copy sample data into real storage.

The claim test `@claim:demo-isolation` seeds real storage sentinels, signs and resets a demo receipt, then proves those sentinels remain unchanged.
