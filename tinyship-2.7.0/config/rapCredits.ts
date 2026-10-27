/** A purchased rap credit is separate from the starter kit's promotional balance. */
export const rapCreditConfig = {
  amount: 890,
  currency: 'usd',
  appMarker: 'ai-rapvideo-credit-v1',
  interruptedStartMs: 30 * 60_000,
  checkoutLifetimeSeconds: 60 * 60,
  refundLeaseMs: 2 * 60_000,
} as const;

export type RapCreditStripeAccount = {
  accountId: string;
  secretKey: string;
  priceId: string;
  webhookSecret: string;
  live: boolean;
};

export function getRapCreditConfig() {
  const secretKey = process.env.STRIPE_RAP_CREDIT_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '';
  const priceId = process.env.STRIPE_RAP_CREDIT_PRICE_ID || '';
  const webhookSecret = process.env.STRIPE_RAP_CREDIT_WEBHOOK_SECRET || '';
  const accountId = process.env.STRIPE_RAP_CREDIT_ACCOUNT_ID || '';
  const base = new URL(process.env.APP_BASE_URL || 'https://ai-rapvideo.co');
  const live = /^(sk|rk)_live_/.test(secretKey);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  if (!/^(sk|rk)_(live|test)_/.test(secretKey) || !/^price_/.test(priceId)
    || !/^whsec_/.test(webhookSecret) || (!local && (!live || base.origin !== 'https://ai-rapvideo.co'))
    || (accountId && !/^acct_[A-Za-z0-9]+$/.test(accountId))
    || base.pathname !== '/' || base.search || base.hash || base.username || base.password) {
    throw new Error('Rap credit payments are not configured');
  }
  let legacy: unknown;
  try { legacy = JSON.parse(process.env.STRIPE_RAP_CREDIT_LEGACY_ACCOUNTS || '[]'); }
  catch { throw new Error('Rap credit legacy accounts are not configured'); }
  if (!Array.isArray(legacy) || legacy.length > 8 || (legacy.length && !accountId))
    throw new Error('Rap credit legacy accounts are not configured');
  const accountIds = new Set(accountId ? [accountId] : []);
  const secrets = new Set([secretKey]);
  const webhookSecrets = new Set([webhookSecret]);
  const legacyAccounts: RapCreditStripeAccount[] = legacy.map((value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value))
      throw new Error('Rap credit legacy accounts are not configured');
    const entry = value as Record<string, unknown>;
    if (typeof entry.accountId !== 'string' || !/^acct_[A-Za-z0-9]+$/.test(entry.accountId)
      || typeof entry.secretKey !== 'string' || !/^(sk|rk)_(live|test)_[A-Za-z0-9]+$/.test(entry.secretKey)
      || /^(sk|rk)_live_/.test(entry.secretKey) !== live
      || typeof entry.priceId !== 'string' || !/^price_[A-Za-z0-9]+$/.test(entry.priceId)
      || typeof entry.webhookSecret !== 'string' || !/^whsec_[A-Za-z0-9]+$/.test(entry.webhookSecret)
      || accountIds.has(entry.accountId) || secrets.has(entry.secretKey) || webhookSecrets.has(entry.webhookSecret))
      throw new Error('Rap credit legacy accounts are not configured');
    accountIds.add(entry.accountId);
    secrets.add(entry.secretKey);
    webhookSecrets.add(entry.webhookSecret);
    return { accountId: entry.accountId, secretKey: entry.secretKey, priceId: entry.priceId, webhookSecret: entry.webhookSecret, live };
  });
  return { ...rapCreditConfig, accountId, secretKey, priceId, webhookSecret, live, legacyAccounts, appBaseUrl: base.origin };
}

export function rapCreditPaymentsEnabled(): boolean {
  if (process.env.RAP_CREDIT_PAYMENTS_ENABLED !== 'true') return false;
  try { getRapCreditConfig(); return true; } catch { return false; }
}
