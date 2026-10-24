import { afterEach, describe, expect, test, vi } from 'vitest';
import { getVideoPurchaseConfig } from '../../../config/videoPurchase';
import {
  createVideoCheckout,
  validateVideoCheckoutSession,
  validateOwnedVideoImage,
  videoCheckoutUrls,
} from '../../../libs/payment/video-stripe';
const cfg = {
  secretKey: 'sk_test_fake',
  priceId: 'price_video',
  webhookSecret: 'whsec_fake',
  appBaseUrl: 'http://localhost:7001',
  live: false,
};
const purchase = {
  id: 'vp_one',
  userId: 'owner',
  checkoutSessionId: 'cs_owned',
  amount: 499,
  currency: 'usd',
};
const session = () => ({
  id: 'cs_owned',
  mode: 'payment',
  payment_status: 'paid',
  status: 'complete',
  livemode: false,
  amount_total: 499,
  currency: 'usd',
  client_reference_id: 'vp_one',
  payment_intent: 'pi_owned',
  metadata: { app: 'rumpelstiltskin-video-v1', purchaseId: 'vp_one', userId: 'owner' },
  line_items: {
    has_more: false,
    data: [
      {
        quantity: 1,
        amount_total: 499,
        currency: 'usd',
        price: { id: 'price_video', unit_amount: 499, currency: 'usd', type: 'one_time' },
      },
    ],
  },
});
describe('fixed video Stripe and image validation', () => {
  afterEach(() => vi.unstubAllEnvs());
  test('production refuses absent or test configuration while localhost permits test mode', () => {
    vi.stubEnv('APP_BASE_URL', 'https://rumpelstiltskin-ai.co');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake');
    vi.stubEnv('STRIPE_VIDEO_PRICE_ID', 'price_video');
    vi.stubEnv('STRIPE_VIDEO_WEBHOOK_SECRET', 'whsec_fake');
    expect(() => getVideoPurchaseConfig()).toThrow();
    vi.stubEnv('APP_BASE_URL', 'http://localhost:7001');
    expect(getVideoPurchaseConfig()).toMatchObject({ amount: 499, currency: 'usd', live: false });
  });
  test('a paid session must match owner, purchase, app, fixed price, quantity, currency and session', () => {
    expect(validateVideoCheckoutSession(session() as never, purchase as never, cfg as never)).toBe(
      'pi_owned',
    );
    for (const overrides of [
      { id: 'cs_other' },
      { amount_total: 1 },
      { currency: 'eur' },
      { payment_status: 'unpaid' },
      { metadata: { app: 'other', purchaseId: 'vp_one', userId: 'owner' } },
      { client_reference_id: 'another' },
    ]) {
      expect(() =>
        validateVideoCheckoutSession(
          { ...session(), ...overrides } as never,
          purchase as never,
          cfg as never,
        ),
      ).toThrow();
    }
    const bad = session();
    bad.line_items.data[0].quantity = 2;
    expect(() =>
      validateVideoCheckoutSession(bad as never, purchase as never, cfg as never),
    ).toThrow();
  });
  test('return URLs allow only the three maker paths', () => {
    expect(videoCheckoutUrls('http://localhost:7001', '/').success_url).toContain(
      'checkout_session_id={CHECKOUT_SESSION_ID}#rap-maker',
    );
    for (const path of [
      'https://evil.test',
      '//evil.test',
      '/api/admin',
      '/?redirect=evil',
      '/../',
    ])
      expect(() => videoCheckoutUrls(cfg.appBaseUrl, path)).toThrow();
  });
  test('accepts only an owned image object at the exact R2 public origin', () => {
    expect(
      validateOwnedVideoImage(
        'https://media.test/uploads/owner/a.jpg',
        'owner',
        'https://media.test',
      ),
    ).toBe('uploads/owner/a.jpg');
    for (const url of [
      'https://media.test/uploads/other/a.jpg',
      'https://evil.test/uploads/owner/a.jpg',
      'https://media.test/uploads/owner/../a.jpg',
      'https://media.test/uploads/owner/a.jpg?x=1',
      'https://media.test/uploads/owner/%2e%2e/a.jpg',
      'https://media.test/uploads/owner/a.svg',
      'https://user@media.test/uploads/owner/a.jpg',
    ]) {
      expect(() => validateOwnedVideoImage(url, 'owner', 'https://media.test')).toThrow();
    }
  });
  test('checkout uses a stable key and an expiry safely above Stripe minimum thirty minutes', async () => {
    const create = vi.fn(async () => ({ id: 'cs_one', url: 'https://checkout.stripe.com/fake' }));
    const stripe = {
      prices: {
        retrieve: async () => ({
          active: true,
          livemode: false,
          unit_amount: 499,
          currency: 'usd',
          type: 'one_time',
          billing_scheme: 'per_unit',
        }),
      },
      checkout: { sessions: { create } },
    };
    const p = {
      ...purchase,
      checkoutSessionId: null,
      checkoutUrl: null,
      returnPath: '/',
      createdAt: new Date(Date.now() - 5000),
    };
    await createVideoCheckout(p as never, stripe as never, cfg as never);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        payment_method_types: ['card'],
        branding_settings: {
          display_name: 'AI Rap Video',
          background_color: '#faf9f4',
          button_color: '#304c3e',
        },
        adaptive_pricing: { enabled: false },
        line_items: [{ price: 'price_video', quantity: 1 }],
        expires_at: expect.any(Number),
      }),
      { idempotencyKey: 'video-checkout:vp_one' },
    );
    expect(
      create.mock.calls[0][0].expires_at - Math.floor(Date.now() / 1000),
    ).toBeGreaterThanOrEqual(30 * 60);
  });
});
