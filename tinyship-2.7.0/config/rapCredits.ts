/** A purchased rap credit is separate from the starter kit's promotional balance. */
export const rapCreditConfig = {
  amount: 890,
  currency: 'usd',
  appMarker: 'ai-rapvideo-credit-v1',
  interruptedStartMs: 30 * 60_000,
  checkoutLifetimeSeconds: 60 * 60,
  refundLeaseMs: 2 * 60_000,
} as const;

export function getRapCreditConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const priceId = process.env.STRIPE_RAP_CREDIT_PRICE_ID || '';
  const webhookSecret = process.env.STRIPE_RAP_CREDIT_WEBHOOK_SECRET || '';
  const base = new URL(process.env.APP_BASE_URL || 'https://ai-rapvideo.co');
  const live = /^(sk|rk)_live_/.test(secretKey);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (!/^(sk|rk)_(live|test)_/.test(secretKey) || !/^price_/.test(priceId)
    || !/^whsec_/.test(webhookSecret) || (!local && (!live || base.origin !== 'https://ai-rapvideo.co'))
    || base.pathname !== '/' || base.search || base.hash || base.username || base.password) {
    throw new Error('Rap credit payments are not configured');
  }
  return { ...rapCreditConfig, secretKey, priceId, webhookSecret, live, appBaseUrl: base.origin };
}

export function rapCreditPaymentsEnabled(): boolean {
  if (process.env.RAP_CREDIT_PAYMENTS_ENABLED !== 'true') return false;
  try { getRapCreditConfig(); return true; } catch { return false; }
}
