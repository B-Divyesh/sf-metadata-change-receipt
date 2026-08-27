const SLUG = 'metadata-change-receipt';
const API_BASE = 'https://api.sociobot.in/api/v1';
const LICENSE_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const DAY = 86_400_000;

interface CachedVerdict {
  valid: boolean;
  checkedAt: number;
  reason: string;
}

export interface LicenseState {
  token: string;
  unlocked: boolean;
  checking: boolean;
  reason: string;
}

export const checkoutUrl = `${API_BASE}/products/${SLUG}/checkout`;

function loadVerdict(): CachedVerdict | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? 'null') as CachedVerdict | null;
    return parsed && typeof parsed.valid === 'boolean' ? parsed : null;
  } catch {
    return null;
  }
}

export function captureReturnedLicense(): void {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('license')?.trim();
  if (!token) return;
  localStorage.setItem(LICENSE_KEY, token);
  localStorage.removeItem(VERDICT_KEY);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function getLicenseState(): LicenseState {
  const token = localStorage.getItem(LICENSE_KEY) ?? '';
  const cached = loadVerdict();
  return {
    token,
    unlocked: Boolean(token && cached?.valid),
    checking: false,
    reason: cached?.reason ?? ''
  };
}

export function saveLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export async function verifyLicense(force = false): Promise<LicenseState> {
  const token = localStorage.getItem(LICENSE_KEY) ?? '';
  const cached = loadVerdict();
  if (!token) return { token: '', unlocked: false, checking: false, reason: '' };
  if (!force && cached && Date.now() - cached.checkedAt < DAY) {
    return { token, unlocked: cached.valid, checking: false, reason: cached.reason };
  }
  try {
    const response = await fetch(`${API_BASE}/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('verification unavailable');
    const data = (await response.json()) as { valid?: boolean; reason?: string };
    const verdict: CachedVerdict = { valid: data.valid === true, checkedAt: Date.now(), reason: data.reason ?? 'invalid' };
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return { token, unlocked: verdict.valid, checking: false, reason: verdict.reason };
  } catch {
    return { token, unlocked: Boolean(cached?.valid), checking: false, reason: cached?.reason ?? 'offline' };
  }
}
