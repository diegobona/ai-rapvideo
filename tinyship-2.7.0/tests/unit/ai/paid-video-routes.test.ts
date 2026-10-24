import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Stripe from 'stripe';
import { DANCE_REFERENCE_KEYS } from '../../../config/danceReferences';
const state = vi.hoisted(() => ({ userId: 'owner', missingKey: '', signatureValid: true, recoveryAvailable: true, wake: vi.fn(async (_id: string) => {}) }));
vi.mock('@libs/auth/auth', () => ({
  auth: {
    api: {
      getSession: async () =>
        state.userId ? { user: { id: state.userId, isAnonymous: true } } : null,
    },
  },
}));
vi.mock('@libs/database', async () => ({
  ...(await import('../../helpers/video-d1')).testDatabase,
  getDialect: () => 'd1',
}));
vi.mock('@libs/database/schema', () => import('../../../libs/database/schema/sqlite'));
vi.mock('../../../config/videoPurchase', async importOriginal => ({ ...(await importOriginal<typeof import('../../../config/videoPurchase')>()), VIDEO_PAYMENT_REQUIRED: true }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/with-request-db', () => ({ withCfDb: (fn: unknown) => fn }));
vi.mock('cloudflare:workers', () => ({
  env: {
    R2_PUBLIC_URL: 'https://media.test', R2_BUCKET: { head: async (key: string) => key === state.missingKey ? null : ({ size: 1 }) },
    get PAID_VIDEO_RECOVERY() {
      return state.recoveryAvailable ? { getByName: () => ({ wake: state.wake }) } : undefined;
    },
  },
}));
vi.mock('../../../libs/ai/video', () => ({
  validateVideoGenerationOptions: vi.fn(),
  createVideoTask: vi.fn(async (options: { provider: string; model?: string }) => ({
    provider: options.provider,
    model: options.model || 'minimax-h3',
    providerTaskId: 'route_task',
  })),
  queryVideoTask: vi.fn(),
}));
vi.mock('../../../libs/payment/video-stripe', async (importOriginal) => {
  const original = await importOriginal<typeof import('../../../libs/payment/video-stripe')>();
  return { ...original, createVideoStripeClient: () => stripe };
});
const stripe = {
  prices: {
    retrieve: vi.fn(async () => ({
      active: true,
      livemode: false,
      unit_amount: 499,
      currency: 'usd',
      type: 'one_time',
      billing_scheme: 'per_unit',
    })),
  },
  checkout: {
    sessions: {
      list: vi.fn(async () => ({ data: [], has_more: false })),
      create: vi.fn(async () => ({ id: 'cs_owned', url: 'https://checkout.stripe.com/fake' })),
      retrieve: vi.fn(),
    },
  },
  refunds: { list: vi.fn(async () => ({ data: [], has_more: false })), create: vi.fn() },
  webhooks: {
    constructEventAsync: vi.fn(async (body: string) => {
      if (!state.signatureValid) throw new Error('bad signature');
      return JSON.parse(body);
    }),
  },
};
import { resetVideoDatabase, testDatabase } from '../../helpers/video-d1';
import * as purchases from '../../../libs/payment/video-purchases';
import { createVideoTask } from '../../../libs/ai/video';
import { reconcilePaidVideoPurchase } from '../../../libs/ai/paid-video';
import { Route as generate } from '../../../apps/tanstack-app/src/routes/api/video-generate/index';
import { Route as checkout } from '../../../apps/tanstack-app/src/routes/api/video-checkout/index';
import { Route as verify } from '../../../apps/tanstack-app/src/routes/api/video-checkout/verify';
import { Route as webhook } from '../../../apps/tanstack-app/src/routes/api/video-checkout/webhook';
const call = (
  route: unknown,
  path: string,
  body: unknown,
  headers?: Record<string, string>,
): Promise<Response> =>
  (route as any).server.handlers.POST({
    request: new Request(`http://localhost:7001${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
  });
function session(purchaseId: string) {
  return {
    id: 'cs_owned',
    mode: 'payment',
    status: 'complete',
    payment_status: 'paid',
    livemode: false,
    amount_total: 499,
    currency: 'usd',
    client_reference_id: purchaseId,
    payment_intent: 'pi_owned',
    metadata: { app: 'rumpelstiltskin-video-v1', purchaseId, userId: 'owner' },
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
  };
}
describe('paid dance HTTP contracts and isolated webhook', () => {
  beforeEach(() => {
    resetVideoDatabase();
    vi.clearAllMocks();
    state.userId = 'owner';
    state.missingKey = '';
    state.signatureValid = true;
    state.recoveryAvailable = true;
    state.wake.mockImplementation(async () => {});
    vi.stubEnv('APP_BASE_URL', 'http://localhost:7001');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake');
    vi.stubEnv('STRIPE_VIDEO_PRICE_ID', 'price_video');
    vi.stubEnv('STRIPE_VIDEO_WEBHOOK_SECRET', 'whsec_fake');
    vi.stubEnv('R2_PUBLIC_URL', 'https://media.test');
    vi.stubEnv('BETTER_AUTH_SECRET', 'test-secret-with-at-least-thirty-two-characters');
  });
  afterEach(() => vi.unstubAllEnvs());
  test('free prompt and template requests cannot call the provider', async () => {
    for (const input of [
      { prompt: 'free' },
      {
        danceTemplate: 'rumpelstiltskin-v2',
        dancerImageUrl: 'https://media.test/uploads/owner/a.jpg',
      },
    ])
      expect((await call(generate, '/api/video-generate/', input)).status).toBe(400);
    expect(createVideoTask).not.toHaveBeenCalled();
  });
  test('checkout requires session and same origin, validates owned photos, returns fixed contract', async () => {
    const input = { dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/' };
    state.userId = '';
    expect((await call(checkout, '/api/video-checkout/', input)).status).toBe(401);
    state.userId = 'owner';
    expect(
      (await call(checkout, '/api/video-checkout/', input, { origin: 'https://evil.test' })).status,
    ).toBe(403);
    expect(
      (
        await call(checkout, '/api/video-checkout/', {
          ...input,
          dancerImageUrl: 'https://media.test/uploads/different-user/a.jpg',
        })
      ).status,
    ).toBe(400);
    const response = await call(checkout, '/api/video-checkout/', input);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { purchaseId: expect.any(String), checkoutUrl: 'https://checkout.stripe.com/fake' },
    });
    expect(createVideoTask).not.toHaveBeenCalled();
  });
  test('persists custom instructions before checkout and uses that exact saved prompt after verified payment', async () => {
    const response = await call(checkout, '/api/video-checkout/', {
      dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/',
      customDescription: '更狡黠的笑容', quickTags: ['push-in', 'playful'], orientation: 'portrait',
      sceneImageUrl: 'https://media.test/uploads/owner/scene.jpg',
    });
    expect(response.status).toBe(200);
    const { data } = await response.json();
    const saved = (await purchases.getVideoPurchase(data.purchaseId, 'owner'))!;
    expect(saved.generationOptions.prompt).toContain('更狡黠的笑容');
    expect(saved.generationOptions.prompt).not.toContain('slow camera push-in');
    expect(saved.generationOptions.prompt).toContain('warm grin');
    expect(saved).toMatchObject({ amount: 499, currency: 'usd', state: 'pending' });
    expect(saved.generationOptions.duration).toBe(10);
    expect(saved.generationOptions).toMatchObject({ provider: 'autodl', model: 'minimax-h3', workflowId: 'minimax_h3_zm_u24', size: '768p竖' });
    expect(saved.generationOptions.referenceImageUrls).toEqual([
      'https://media.test/uploads/owner/a.jpg', `https://media.test/${DANCE_REFERENCE_KEYS.princess}`, `https://media.test/${DANCE_REFERENCE_KEYS.scene}`,
    ]);
    expect(saved.generationOptions.referenceVideoUrls).toBeUndefined();
    expect(saved.generationOptions.danceCustomization).toEqual({ customDescription: '更狡黠的笑容', quickTags: ['playful'] });
    expect((await call(generate, '/api/video-generate/', { purchaseId: saved.id })).status).toBe(402);
    expect(createVideoTask).not.toHaveBeenCalled();
    stripe.checkout.sessions.retrieve.mockResolvedValue(session(saved.id));
    const verified = await call(verify, '/api/video-checkout/verify', { sessionId: 'cs_owned' });
    expect(verified.status).toBe(200);
    const verifiedBody = await verified.json();
    expect(verifiedBody).toMatchObject({ data: { purchase: { orientation: 'portrait' } } });
    expect(verifiedBody.data.purchase).not.toHaveProperty('sceneImageUrl');
    expect(createVideoTask).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createVideoTask).mock.calls[0][0].prompt).toBe(saved.generationOptions.prompt);
    expect(vi.mocked(createVideoTask).mock.calls[0][0]).toEqual(saved.generationOptions);
    expect(vi.mocked(createVideoTask).mock.calls[0][0].referenceImageUrls).toEqual(saved.generationOptions.referenceImageUrls);
    expect(vi.mocked(createVideoTask).mock.calls[0][0].referenceVideoUrls).toEqual(saved.generationOptions.referenceVideoUrls);
  });

  test.each([
    { customDescription: 'x'.repeat(301) }, { customDescription: null },
    { quickTags: ['invented'] }, { quickTags: 'push-in' },
    { prompt: 'bypass the template' }, { duration: 60 }, { amount: 1 },
    { orientation: 'square' }, { orientation: null }, { orientation: 1 }, { size: '1080p竖' },
  ])('rejects invalid customization or output overrides before creating checkout: %j', async (extra) => {
    const response = await call(checkout, '/api/video-checkout/', {
      dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/', ...extra,
    });
    expect(response.status).toBe(400);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(createVideoTask).not.toHaveBeenCalled();
  });

  test.each([null, 'https://media.test/uploads/another-user/scene.jpg', 'https://elsewhere.test/scene.jpg', 'https://media.test/uploads/owner/missing-scene.jpg'])('obsolete scene %j is ignored and cannot affect a new fixed-source checkout', async sceneImageUrl => {
    state.missingKey = 'uploads/owner/missing-scene.jpg';
    const response = await call(checkout, '/api/video-checkout/', {
      dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/',
      sceneImageUrl,
    });
    expect(response.status).toBe(200);
    const saved = (await purchases.getVideoPurchase((await response.json()).data.purchaseId, 'owner'))!;
    expect(saved.generationOptions.referenceImageUrls).toEqual([
      'https://media.test/uploads/owner/a.jpg', `https://media.test/${DANCE_REFERENCE_KEYS.princess}`, `https://media.test/${DANCE_REFERENCE_KEYS.scene}`,
    ]);
    expect(saved.generationOptions.referenceVideoUrls).toBeUndefined();
    expect(saved.generationOptions.prompt).not.toContain(String(sceneImageUrl));
  });

  test('changing only an obsolete scene reuses the same fixed-source draft', async () => {
    stripe.checkout.sessions.create
      .mockResolvedValueOnce({ id: 'cs_scene1', url: 'https://checkout.stripe.com/scene1' })
      .mockResolvedValueOnce({ id: 'cs_scene2', url: 'https://checkout.stripe.com/scene2' });
    const input = { dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/' };
    const first = await call(checkout, '/api/video-checkout/', { ...input, sceneImageUrl: 'https://media.test/uploads/owner/one.jpg' });
    const second = await call(checkout, '/api/video-checkout/', { ...input, sceneImageUrl: 'https://media.test/uploads/owner/two.jpg' });
    expect(first.status).toBe(200); expect(second.status).toBe(200);
    const firstId = (await first.json()).data.purchaseId;
    const secondId = (await second.json()).data.purchaseId;
    expect(secondId).toBe(firstId);
    expect((await purchases.getVideoPurchase(firstId))!.generationOptions.referenceImageUrls).toEqual([
      'https://media.test/uploads/owner/a.jpg', `https://media.test/${DANCE_REFERENCE_KEYS.princess}`, `https://media.test/${DANCE_REFERENCE_KEYS.scene}`,
    ]);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
  });

  test('identical tag sets reuse one pending checkout and changed descriptions create a new draft', async () => {
    stripe.checkout.sessions.create
      .mockResolvedValueOnce({ id: 'cs_one', url: 'https://checkout.stripe.com/one' })
      .mockResolvedValueOnce({ id: 'cs_two', url: 'https://checkout.stripe.com/two' });
    const input = { dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/', customDescription: 'A red jacket' };
    const first = await call(checkout, '/api/video-checkout/', { ...input, quickTags: ['push-in', 'playful'] });
    const second = await call(checkout, '/api/video-checkout/', { ...input, quickTags: ['playful', 'push-in'] });
    expect(first.status).toBe(200); expect(second.status).toBe(200);
    const firstData = (await first.json()).data;
    expect((await second.json()).data.purchaseId).toBe(firstData.purchaseId);
    const changed = await call(checkout, '/api/video-checkout/', { ...input, customDescription: 'A blue jacket', quickTags: ['playful', 'push-in'] });
    expect(changed.status).toBe(200);
    expect((await changed.json()).data.purchaseId).not.toBe(firstData.purchaseId);
    expect((await purchases.getVideoPurchase(firstData.purchaseId))!.generationOptions.prompt).toContain('A red jacket');
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(2);
  });

  test('changing only the orientation creates a separate checkout draft', async () => {
    stripe.checkout.sessions.create
      .mockResolvedValueOnce({ id: 'cs_landscape', url: 'https://checkout.stripe.com/landscape' })
      .mockResolvedValueOnce({ id: 'cs_portrait', url: 'https://checkout.stripe.com/portrait' });
    const input = { dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/' };
    const landscape = await call(checkout, '/api/video-checkout/', input);
    const portrait = await call(checkout, '/api/video-checkout/', { ...input, orientation: 'portrait' });
    expect(landscape.status).toBe(200); expect(portrait.status).toBe(200);
    const landscapeId = (await landscape.json()).data.purchaseId;
    const portraitId = (await portrait.json()).data.purchaseId;
    expect(portraitId).not.toBe(landscapeId);
    expect((await purchases.getVideoPurchase(landscapeId))!.generationOptions).toMatchObject({ size: '768p横' });
    expect((await purchases.getVideoPurchase(portraitId))!.generationOptions).toMatchObject({ size: '768p竖' });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(2);
  });

  test('verified paid return auto-starts once and cross-owner verification cannot access purchase', async () => {
    const p = await purchases.createVideoPurchaseDraft(
      'owner',
      { provider: 'autodl', model: 'minimax-h3', prompt: 'fixed' },
      '/',
      'route',
    );
    await purchases.attachVideoCheckout(
      p.id,
      'owner',
      'cs_owned',
      'https://checkout.stripe.com/fake',
    );
    stripe.checkout.sessions.retrieve.mockResolvedValue(session(p.id));
    state.userId = 'different-user';
    expect(
      (await call(verify, '/api/video-checkout/verify', { sessionId: 'cs_owned' })).status,
    ).toBe(404);
    state.userId = 'owner';
    const response = await call(verify, '/api/video-checkout/verify', { sessionId: 'cs_owned' });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { purchase: { id: p.id, state: 'processing', taskId: expect.any(String) } },
    });
    await call(generate, '/api/video-generate/', { purchaseId: p.id });
    expect(createVideoTask).toHaveBeenCalledTimes(1);
  });
  test('webhook rejects a bad signature and ignores another application', async () => {
    state.signatureValid = false;
    expect(
      (
        await call(
          webhook,
          '/api/video-checkout/webhook',
          { type: 'checkout.session.completed', data: { object: {} } },
          { 'stripe-signature': 'bad' },
        )
      ).status,
    ).toBe(400);
    state.signatureValid = true;
    expect(
      (
        await call(
          webhook,
          '/api/video-checkout/webhook',
          {
            type: 'checkout.session.completed',
            data: { object: { metadata: { app: 'pixal3d' } } },
          },
          { 'stripe-signature': 'valid' },
        )
      ).status,
    ).toBe(200);
    expect(stripe.checkout.sessions.retrieve).not.toHaveBeenCalled();
    expect(createVideoTask).not.toHaveBeenCalled();
  });
  test('duplicate paid webhooks fulfill exactly once and return success for retries', async () => {
    const p = await purchases.createVideoPurchaseDraft(
      'owner',
      { provider: 'autodl', model: 'minimax-h3', prompt: 'fixed' },
      '/',
      'webhook',
    );
    await purchases.attachVideoCheckout(
      p.id,
      'owner',
      'cs_owned',
      'https://checkout.stripe.com/fake',
    );
    const s = session(p.id);
    stripe.checkout.sessions.retrieve.mockResolvedValue(s);
    const responses = await Promise.all(
      Array.from({ length: 4 }, () =>
        call(
          webhook,
          '/api/video-checkout/webhook',
          { type: 'checkout.session.completed', data: { object: s } },
          { 'stripe-signature': 'valid' },
        ),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual([200, 200, 200, 200]);
    expect(createVideoTask).toHaveBeenCalledTimes(1);
  });
  test('raw webhook verification accepts a real SDK signature and rejects a tampered body', async () => {
    const helper = new Stripe('sk_test_signature_only');
    const event = {
      id: 'evt_signature',
      livemode: false,
      type: 'checkout.session.completed',
      data: { object: { metadata: { app: 'another-app' } } },
    };
    const signature = await helper.webhooks.generateTestHeaderStringAsync({
      payload: JSON.stringify(event),
      secret: 'whsec_fake',
    });
    stripe.webhooks.constructEventAsync.mockImplementationOnce(
      helper.webhooks.constructEventAsync.bind(helper.webhooks) as never,
    );
    expect(
      (await call(webhook, '/api/video-checkout/webhook', event, { 'stripe-signature': signature }))
        .status,
    ).toBe(200);
    stripe.webhooks.constructEventAsync.mockImplementationOnce(
      helper.webhooks.constructEventAsync.bind(helper.webhooks) as never,
    );
    expect(
      (
        await call(
          webhook,
          '/api/video-checkout/webhook',
          { ...event, id: 'tampered' },
          { 'stripe-signature': signature },
        )
      ).status,
    ).toBe(400);
  });
  test('concurrent checkout requests share one draft and one Stripe idempotency key', async () => {
    const responses = await Promise.all(
      Array.from({ length: 8 }, () =>
        call(checkout, '/api/video-checkout/', {
          dancerImageUrl: 'https://media.test/uploads/owner/a.jpg',
          returnPath: '/',
        }),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual(Array(8).fill(200));
    const data = await Promise.all(responses.map((r) => r.json()));
    expect(new Set(data.map((r) => r.data.purchaseId)).size).toBe(1);
    expect(
      new Set(stripe.checkout.sessions.create.mock.calls.map((args) => args[1].idempotencyKey))
        .size,
    ).toBe(1);
  });
  test('durable handoff is awaited before creating a chargeable session and fails checkout closed', async () => {
    let release!: () => void;
    state.wake.mockImplementationOnce(() => new Promise<void>((resolve) => { release = resolve; }));
    const response = call(checkout, '/api/video-checkout/', {
      dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/',
    });
    await vi.waitFor(() => expect(state.wake).toHaveBeenCalledOnce());
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    release();
    expect((await response).status).toBe(200);
    state.wake.mockRejectedValueOnce(new Error('Durable Object unavailable'));
    expect((await call(checkout, '/api/video-checkout/', {
      dancerImageUrl: 'https://media.test/uploads/owner/b.jpg', returnPath: '/',
    })).status).toBe(503);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledOnce();
  });
  test('retry after a checkout DB save failure recovers the same chargeable Stripe session', async () => {
    const input = { dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/' };
    testDatabase.sqlite.exec(
      "CREATE TRIGGER reject_checkout BEFORE UPDATE OF checkout_session_id ON video_purchase BEGIN SELECT RAISE(ABORT, 'test checkout save unavailable'); END;",
    );
    try {
      expect((await call(checkout, '/api/video-checkout/', input)).status).toBe(503);
    } finally {
      testDatabase.sqlite.exec('DROP TRIGGER reject_checkout');
    }
    const response = await call(checkout, '/api/video-checkout/', input);
    expect(response.status).toBe(200);
    expect(stripe.checkout.sessions.create.mock.calls[0][1]).toEqual(
      stripe.checkout.sessions.create.mock.calls[1][1],
    );
    expect(testDatabase.sqlite.prepare('SELECT count(*) AS n FROM video_purchase').get()).toEqual({
      n: 1,
    });
  });
  test('a Worker without its recovery binding never creates a chargeable Checkout Session', async () => {
    state.recoveryAvailable = false;
    expect((await call(checkout, '/api/video-checkout/', {
      dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/',
    })).status).toBe(503);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(createVideoTask).not.toHaveBeenCalled();
  });
  test('manual pending, failed and partial refunds all revoke admission; full completion cannot regress', async () => {
    const p = await purchases.createVideoPurchaseDraft(
      'owner',
      { provider: 'autodl', model: 'minimax-h3', prompt: 'fixed' },
      '/',
      'manual-refund',
    );
    await purchases.attachVideoCheckout(
      p.id,
      'owner',
      'cs_owned',
      'https://checkout.stripe.com/fake',
    );
    await purchases.settleVideoPurchase(p.id, 'cs_owned', 'pi_owned');
    const notify = (type: string) =>
      call(
        webhook,
        '/api/video-checkout/webhook',
        {
          id: 'evt_refund',
          type,
          data: { object: { id: 're_manual', payment_intent: 'pi_owned' } },
        },
        { 'stripe-signature': 'valid' },
      );
    for (const [status, amount, expected] of [
      ['pending', 499, 'pending'],
      ['failed', 499, 'failed'],
      ['succeeded', 200, 'partial'],
    ] as const) {
      stripe.refunds.list.mockResolvedValueOnce({
        data: [{ id: 're_manual', payment_intent: 'pi_owned', status, amount }] as never[],
        has_more: false,
      });
      expect((await notify('refund.updated')).status).toBe(200);
      expect(await purchases.getVideoPurchase(p.id)).toMatchObject({
        state: 'refund_pending',
        refundStatus: expected,
      });
      expect((await call(generate, '/api/video-generate/', { purchaseId: p.id })).status).toBe(402);
    }
    stripe.refunds.list.mockResolvedValueOnce({
      data: [{ id: 're_full', status: 'succeeded', amount: 499 }] as never[],
      has_more: false,
    });
    await notify('charge.refunded');
    stripe.refunds.list.mockResolvedValueOnce({
      data: [{ id: 're_manual', status: 'pending', amount: 200 }] as never[],
      has_more: false,
    });
    await notify('refund.created');
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({
      state: 'refunded',
      refundedAmount: 499,
      refundStatus: 'succeeded',
    });
    expect(createVideoTask).not.toHaveBeenCalled();
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });
  test('payment validation failure never calls the provider and a verified processing outage is retryable', async () => {
    const p = await purchases.createVideoPurchaseDraft(
      'owner',
      { provider: 'autodl', model: 'minimax-h3', prompt: 'fixed' },
      '/',
      'bad-payment',
    );
    await purchases.attachVideoCheckout(
      p.id,
      'owner',
      'cs_owned',
      'https://checkout.stripe.com/fake',
    );
    const s = session(p.id);
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce({ ...s, amount_total: 1 });
    expect(
      (await call(verify, '/api/video-checkout/verify', { sessionId: 'cs_owned' })).status,
    ).toBeGreaterThanOrEqual(400);
    expect(createVideoTask).not.toHaveBeenCalled();
    stripe.checkout.sessions.retrieve.mockRejectedValueOnce(new Error('Stripe temporary outage'));
    expect(
      (
        await call(
          webhook,
          '/api/video-checkout/webhook',
          { id: 'evt_outage', type: 'checkout.session.completed', data: { object: s } },
          { 'stripe-signature': 'valid' },
        )
      ).status,
    ).toBe(503);
  });
  test('an authoritative empty session search safely replaces a near-expiry draft immediately', async () => {
    const input = { dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/' };
    stripe.checkout.sessions.create.mockRejectedValueOnce(new Error('first checkout unavailable'));
    expect((await call(checkout, '/api/video-checkout/', input)).status).toBe(503);
    const old = testDatabase.sqlite.prepare('SELECT id FROM video_purchase').get() as {
      id: string;
    };
    const then = Math.floor(Date.now() / 1000) - 35 * 60;
    testDatabase.sqlite
      .prepare('UPDATE video_purchase SET created_at=?,updated_at=? WHERE id=?')
      .run(then, then, old.id);
    const response = await call(checkout, '/api/video-checkout/', input);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.purchaseId).not.toBe(old.id);
    expect(state.wake.mock.calls.map(([id]) => id)).toContain(body.data.purchaseId);
    const newWake = state.wake.mock.calls.findIndex(([id]) => id === body.data.purchaseId);
    expect(state.wake.mock.invocationCallOrder[newWake]).toBeLessThan(
      stripe.checkout.sessions.create.mock.invocationCallOrder.at(-1)!,
    );
    expect(await purchases.getVideoPurchase(old.id)).toMatchObject({
      state: 'expired',
      checkoutSessionId: null,
    });
    expect(stripe.checkout.sessions.list).toHaveBeenCalledOnce();
  });
  test('minute-by-minute recovery does not prevent safe rotation of an unattached near-expiry draft', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    try {
      const input = { dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/' };
      stripe.checkout.sessions.create.mockRejectedValueOnce(new Error('first checkout unavailable'));
      expect((await call(checkout, '/api/video-checkout/', input)).status).toBe(503);
      const old = testDatabase.sqlite.prepare('SELECT id FROM video_purchase').get() as { id: string };
      const attemptedAt = Date.now();
      for (let minute = 1; minute <= 31; minute++) {
        vi.setSystemTime(attemptedAt + minute * 60_000);
        await reconcilePaidVideoPurchase(old.id, { stripe: stripe as never });
      }
      const response = await call(checkout, '/api/video-checkout/', input);
      expect(response.status).toBe(200);
      expect((await response.json()).data.purchaseId).not.toBe(old.id);
      expect(await purchases.getVideoPurchase(old.id)).toMatchObject({
        state: 'expired', checkoutSessionId: null,
      });
      expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(2);
      expect(createVideoTask).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  test('a failed recovery search never retires a draft or creates another checkout', async () => {
    const input = { dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/' };
    stripe.checkout.sessions.create.mockRejectedValueOnce(new Error('first checkout unavailable'));
    await call(checkout, '/api/video-checkout/', input);
    const then = Math.floor(Date.now() / 1000) - 35 * 60;
    testDatabase.sqlite
      .prepare('UPDATE video_purchase SET created_at=?,updated_at=?')
      .run(then, then);
    stripe.checkout.sessions.list.mockRejectedValueOnce(new Error('Stripe search unavailable'));
    expect((await call(checkout, '/api/video-checkout/', input)).status).toBe(503);
    expect(
      testDatabase.sqlite
        .prepare("SELECT count(*) AS n FROM video_purchase WHERE state='pending'")
        .get(),
    ).toEqual({ n: 1 });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledOnce();
  });
  test('a recent create attempt prevents retirement while its remote outcome may still be in flight', async () => {
    const input = { dancerImageUrl: 'https://media.test/uploads/owner/a.jpg', returnPath: '/' };
    stripe.checkout.sessions.create.mockRejectedValueOnce(new Error('first checkout unavailable'));
    await call(checkout, '/api/video-checkout/', input);
    testDatabase.sqlite
      .prepare('UPDATE video_purchase SET created_at=?')
      .run(Math.floor(Date.now() / 1000) - 35 * 60);
    expect((await call(checkout, '/api/video-checkout/', input)).status).toBe(409);
    expect(
      testDatabase.sqlite
        .prepare("SELECT count(*) AS n FROM video_purchase WHERE state='pending'")
        .get(),
    ).toEqual({ n: 1 });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledOnce();
  });
  test('resource_missing is terminal404 while genuine Stripe transport failure remains retryable503', async () => {
    stripe.checkout.sessions.retrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeInvalidRequestError({
        code: 'resource_missing',
        message: 'No such checkout session',
      }),
    );
    expect(
      (await call(verify, '/api/video-checkout/verify', { sessionId: 'cs_missing' })).status,
    ).toBe(404);
    stripe.checkout.sessions.retrieve.mockRejectedValueOnce(
      new Stripe.errors.StripeConnectionError({ message: 'Connection unavailable' }),
    );
    expect(
      (await call(verify, '/api/video-checkout/verify', { sessionId: 'cs_missing' })).status,
    ).toBe(503);
    expect(createVideoTask).not.toHaveBeenCalled();
  });
  test('genuine late settlement of an expired purchase persists a new recovery wake after payment', async () => {
    const p = await purchases.createVideoPurchaseDraft('owner',
      { provider: 'autodl', model: 'minimax-h3', prompt: 'fixed' }, '/', 'late-settlement');
    await purchases.attachVideoCheckout(p.id, 'owner', 'cs_owned', 'https://checkout.stripe.com/fake');
    await purchases.expireVideoPurchase(p.id, 'cs_owned');
    const observed: string[] = [];
    state.wake.mockImplementation(async () => {
      observed.push((await purchases.getVideoPurchase(p.id))!.state);
    });
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce(session(p.id));
    expect((await call(verify, '/api/video-checkout/verify', { sessionId: 'cs_owned' })).status).toBe(200);
    expect(observed).toContain('expired');
    expect(observed).toContain('paid');
    state.wake.mockImplementation(async () => {});
    expect(createVideoTask).toHaveBeenCalledOnce();
  });
  test('an owned unpaid return stays pending and an expired session has a terminal410 response', async () => {
    const p = await purchases.createVideoPurchaseDraft(
      'owner',
      { provider: 'autodl', model: 'minimax-h3', prompt: 'fixed' },
      '/',
      'unpaid-return',
    );
    await purchases.attachVideoCheckout(
      p.id,
      'owner',
      'cs_owned',
      'https://checkout.stripe.com/fake',
    );
    const s = session(p.id);
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      ...s,
      status: 'open',
      payment_status: 'unpaid',
    });
    const pending = await call(verify, '/api/video-checkout/verify', { sessionId: 'cs_owned' });
    expect(pending.status).toBe(200);
    expect(await pending.json()).toMatchObject({
      success: true,
      data: { purchase: { id: p.id, state: 'pending', taskId: null } },
    });
    stripe.checkout.sessions.retrieve.mockResolvedValueOnce({
      ...s,
      status: 'expired',
      payment_status: 'unpaid',
    });
    expect(
      (await call(verify, '/api/video-checkout/verify', { sessionId: 'cs_owned' })).status,
    ).toBe(410);
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({ state: 'expired' });
    expect(createVideoTask).not.toHaveBeenCalled();
  });
});
