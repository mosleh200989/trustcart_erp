export type PendingReferralAttribution = {
  code: string;
  channel?: string;
  capturedAt: string;
};

const STORAGE_KEY = 'trustcart_pending_referral';

function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setPendingReferralAttribution(input: {
  code: string;
  channel?: string;
}): void {
  if (typeof window === 'undefined') return;

  const code = (input.code ?? '').toString().trim();
  if (!code) return;

  const payload: PendingReferralAttribution = {
    code,
    channel: input.channel?.toString().trim() || undefined,
    capturedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

export function getPendingReferralAttribution(): PendingReferralAttribution | null {
  if (typeof window === 'undefined') return null;
  return safeJsonParse<PendingReferralAttribution>(window.localStorage.getItem(STORAGE_KEY));
}

export function clearPendingReferralAttribution(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
}
