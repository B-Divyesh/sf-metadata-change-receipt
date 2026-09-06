import { receiptCanonicalJson, type ReceiptPayload } from './engine.ts';

const DB_NAME = 'metadata-change-receipt-keys';
const STORE_NAME = 'signing-keys';
const ACTIVE_KEY = 'active-v1';
const ALGORITHM = 'ECDSA-P256-SHA256';
let demoSigningKey: StoredSigningKey | null = null;

export interface VerificationMaterial {
  format: 'metadata-change-receipt-public-key/v1';
  algorithm: typeof ALGORITHM;
  keyId: string;
  createdAt: string;
  publicKeyJwk: JsonWebKey;
  provenance: string;
}

export interface SignedReceipt {
  format: 'metadata-change-receipt/v2';
  algorithm: typeof ALGORITHM;
  keyId: string;
  payload: ReceiptPayload;
  signature: string;
}

interface StoredSigningKey {
  id: string;
  createdAt: string;
  keyPair: CryptoKeyPair;
  material: VerificationMaterial;
}

function requireWebCrypto(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new Error('This browser cannot create a signing key. Use a current evergreen browser.');
  return globalThis.crypto.subtle;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('The local signing-key store could not be opened.'));
  });
}

async function readStoredKey(): Promise<StoredSigningKey | null> {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(ACTIVE_KEY);
      request.onsuccess = () => resolve((request.result as StoredSigningKey | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error('The local signing key could not be read.'));
    });
  } finally {
    database.close();
  }
}

async function writeStoredKey(key: StoredSigningKey): Promise<void> {
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('The signing key could not be saved locally.'));
      transaction.onabort = () => reject(transaction.error ?? new Error('The signing-key save was cancelled.'));
    });
  } finally {
    database.close();
  }
}

function normalPublicJwk(jwk: JsonWebKey): JsonWebKey {
  if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || typeof jwk.x !== 'string' || typeof jwk.y !== 'string') {
    throw new Error('The verification material does not contain a P-256 public key.');
  }
  return { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error('The signature is not valid base64url data.');
  const padded = `${value.replaceAll('-', '+').replaceAll('_', '/')}${'='.repeat((4 - value.length % 4) % 4)}`;
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function keyIdFor(jwk: JsonWebKey): Promise<string> {
  const digest = await requireWebCrypto().digest('SHA-256', new TextEncoder().encode(JSON.stringify(normalPublicJwk(jwk))));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function createStoredKey(): Promise<StoredSigningKey> {
  const subtle = requireWebCrypto();
  const keyPair = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']) as CryptoKeyPair;
  const material = await createVerificationMaterial(keyPair.publicKey);
  return { id: ACTIVE_KEY, createdAt: material.createdAt, keyPair, material };
}

export async function createVerificationMaterial(publicKey: CryptoKey, createdAt = new Date().toISOString()): Promise<VerificationMaterial> {
  const publicKeyJwk = normalPublicJwk(await requireWebCrypto().exportKey('jwk', publicKey));
  return {
    format: 'metadata-change-receipt-public-key/v1',
    algorithm: ALGORITHM,
    keyId: await keyIdFor(publicKeyJwk),
    createdAt,
    publicKeyJwk,
    provenance: 'Generated locally by this browser profile for Metadata Change Receipt. This key proves that a receipt was signed by the browser profile holding its private key. It is not a personal, organizational, legal, or timestamp identity claim. Save this public verification file separately from receipts before relying on it.'
  };
}

async function activeSigningKey(demo = false): Promise<StoredSigningKey> {
  if (demo) {
    demoSigningKey ??= await createStoredKey();
    return demoSigningKey;
  }
  const existing = await readStoredKey();
  if (existing?.keyPair?.privateKey && existing.material) return existing;
  const created = await createStoredKey();
  await writeStoredKey(created);
  return created;
}

export function resetDemoSigningKey(): void {
  demoSigningKey = null;
}

export async function getVerificationMaterial(demo = false): Promise<VerificationMaterial> {
  return (await activeSigningKey(demo)).material;
}

export async function signReceipt(payload: ReceiptPayload, demo = false): Promise<{ receipt: SignedReceipt; material: VerificationMaterial }> {
  const stored = await activeSigningKey(demo);
  return { material: stored.material, receipt: await signReceiptWithKey(payload, stored.keyPair.privateKey, stored.material) };
}

export async function signReceiptWithKey(payload: ReceiptPayload, privateKey: CryptoKey, material: VerificationMaterial): Promise<SignedReceipt> {
  const signature = await requireWebCrypto().sign({ name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(receiptCanonicalJson(payload)));
  return {
    format: 'metadata-change-receipt/v2',
    algorithm: ALGORITHM,
    keyId: material.keyId,
    payload,
    signature: bytesToBase64Url(new Uint8Array(signature))
  };
}

export async function verifySignedReceipt(receipt: SignedReceipt, material: VerificationMaterial): Promise<{ valid: boolean; reason: string }> {
  try {
    if (receipt?.format !== 'metadata-change-receipt/v2' || receipt.algorithm !== ALGORITHM) return { valid: false, reason: 'Unsupported receipt format or algorithm.' };
    if (material?.format !== 'metadata-change-receipt-public-key/v1' || material.algorithm !== ALGORITHM) return { valid: false, reason: 'Unsupported public verification file.' };
    const publicKey = normalPublicJwk(material.publicKeyJwk);
    const calculatedKeyId = await keyIdFor(publicKey);
    if (material.keyId !== calculatedKeyId || receipt.keyId !== calculatedKeyId) return { valid: false, reason: 'The receipt and independently supplied public verification file do not match.' };
    const key = await requireWebCrypto().importKey('jwk', publicKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const signature = base64UrlToBytes(receipt.signature);
    const valid = await requireWebCrypto().verify({ name: 'ECDSA', hash: 'SHA-256' }, key, signature as unknown as BufferSource, new TextEncoder().encode(receiptCanonicalJson(receipt.payload)));
    return valid ? { valid: true, reason: 'Signature is valid for this exact receipt and public verification file.' } : { valid: false, reason: 'Signature mismatch: the receipt payload or signature was changed.' };
  } catch (error) {
    return { valid: false, reason: error instanceof Error ? error.message : 'The receipt could not be verified.' };
  }
}
