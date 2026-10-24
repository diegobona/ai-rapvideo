/** New homepage generations are free; historical paid orders remain recoverable. */
export const VIDEO_PAYMENT_REQUIRED = false;

/** Fixed per-video price; never accept an amount or price identifier from the browser. */
export const videoPurchaseConfig = {
  amount: 499,
  currency: 'usd',
  productLabel: 'AI Rap Video',
  checkoutBranding: {
    display_name: 'AI Rap Video',
    background_color: '#faf9f4',
    button_color: '#304c3e',
  },
  appMarker: 'rumpelstiltskin-video-v1',
  checkoutLifetimeSeconds: 60 * 60,
  interruptedStartMs: 30 * 60 * 1000,
  refundLeaseMs: 2 * 60 * 1000,
  batchSize: 10,
} as const;

export function getVideoPurchaseConfig() {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const priceId = process.env.STRIPE_VIDEO_PRICE_ID || '';
  const webhookSecret = process.env.STRIPE_VIDEO_WEBHOOK_SECRET || '';
  const appBaseUrl = process.env.APP_BASE_URL || '';
  let base: URL;
  try {
    base = new URL(appBaseUrl);
  } catch {
    throw new Error('Video payments are not configured');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname);
  const live = /^(sk|rk)_live_/.test(secretKey);
  if (
    !/^(sk|rk)_(test|live)_/.test(secretKey) ||
    !/^price_/.test(priceId) ||
    !/^whsec_/.test(webhookSecret) ||
    (!local && (!live || base.protocol !== 'https:')) ||
    base.username ||
    base.password ||
    base.pathname !== '/' ||
    base.search ||
    base.hash
  ) {
    throw new Error('Video payments are not configured');
  }
  return {
    ...videoPurchaseConfig,
    secretKey,
    priceId,
    webhookSecret,
    appBaseUrl: base.origin,
    live,
  };
}
export function isVideoPaymentConfigured() {
  try {
    getVideoPurchaseConfig();
    return true;
  } catch {
    return false;
  }
}
