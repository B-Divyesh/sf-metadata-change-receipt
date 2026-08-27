import { webcrypto } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
import type { ReceiptPayload } from './engine.ts';
import { createVerificationMaterial, signReceiptWithKey, verifySignedReceipt } from './trust.ts';

beforeAll(() => {
  if (!globalThis.crypto) Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
});

const payload = (): ReceiptPayload => ({
  version: 1,
  issuedAt: '2026-08-27T00:00:00.000Z',
  sourceName: 'archive.csv',
  sourceRows: 1,
  rule: { identityField: 'filename', targetField: 'caption', operation: 'set', value: 'audited', find: '', days: 0, conditionField: '', conditionValue: '' },
  changes: [{ rowNumber: 2, identity: 'a.jpg', field: 'caption', before: 'old', after: 'audited' }],
  exceptions: [],
  verification: null,
  note: ''
});

describe('receipt signing trust model', () => {
  it('verifies a signature only against its separately supplied public material', async () => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']) as CryptoKeyPair;
    const material = await createVerificationMaterial(pair.publicKey, '2026-08-27T00:00:00.000Z');
    const receipt = await signReceiptWithKey(payload(), pair.privateKey, material);
    await expect(verifySignedReceipt(receipt, material)).resolves.toMatchObject({ valid: true });
    expect(material.keyId).toMatch(/^[A-Za-z0-9_-]{40,}$/);
    expect(material.provenance).toMatch(/browser profile/i);
  });

  it('rejects an edited receipt even when its original signature remains attached', async () => {
    const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']) as CryptoKeyPair;
    const material = await createVerificationMaterial(pair.publicKey);
    const receipt = await signReceiptWithKey(payload(), pair.privateKey, material);
    receipt.payload.changes[0]!.after = 'silently rewritten';
    await expect(verifySignedReceipt(receipt, material)).resolves.toMatchObject({ valid: false, reason: expect.stringMatching(/mismatch/i) });
  });

  it('rejects a public key substituted after issuance', async () => {
    const signer = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']) as CryptoKeyPair;
    const other = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']) as CryptoKeyPair;
    const material = await createVerificationMaterial(signer.publicKey);
    const receipt = await signReceiptWithKey(payload(), signer.privateKey, material);
    const replacedMaterial = await createVerificationMaterial(other.publicKey);
    await expect(verifySignedReceipt(receipt, replacedMaterial)).resolves.toMatchObject({ valid: false, reason: expect.stringMatching(/do not match/i) });
  });
});
