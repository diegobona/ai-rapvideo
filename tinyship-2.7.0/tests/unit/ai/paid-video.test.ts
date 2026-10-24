import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
vi.mock('@libs/database', async () => ({
  ...(await import('../../helpers/video-d1')).testDatabase,
  getDialect: () => 'd1',
}));
vi.mock('@libs/database/schema', () => import('../../../libs/database/schema/sqlite'));
vi.mock('../../../libs/ai/video', () => ({ createVideoTask: vi.fn(), queryVideoTask: vi.fn() }));
import { resetVideoDatabase, testDatabase } from '../../helpers/video-d1';
import * as purchases from '../../../libs/payment/video-purchases';
import { createVideoTask, queryVideoTask } from '../../../libs/ai/video';
import {
  startPaidVideoPurchase,
  refreshPaidVideoPurchase,
  reconcilePaidVideoPurchases,
  PaidVideoInputMissing,
  publicPaidVideoPurchase,
} from '../../../libs/ai/paid-video';
import { refundPaidVideoPurchase } from '../../../libs/payment/video-stripe';
import { createVideoTaskRecord } from '../../../libs/ai/video-task-store';
import { buildDancePrompt } from '../../../apps/tanstack-app/src/lib/dance-prompt';
import { readSavedDanceCustomization } from '../../../libs/ai/dance-customization';
import { compshareQueryVideoTask } from '../../../libs/ai/compshare-video';
import type { VideoGenerationOptions } from '../../../libs/ai/types';
const options = {
  provider: 'autodl' as const,
  model: 'minimax-h3',
  prompt: 'fixed',
  referenceImageUrls: ['https://media.test/uploads/owner/a.jpg'],
};
let refunds: { id: string; amount: number; status: string }[] = [];
const stripe = {
  refunds: {
    list: vi.fn(async () => ({ data: refunds, has_more: false })),
    create: vi.fn(async (args: { amount: number }) => {
      const refund = { id: 're_one', amount: args.amount, status: 'succeeded' };
      refunds.push(refund);
      return refund;
    }),
  },
  checkout: {
    sessions: { list: vi.fn(async () => ({ data: [], has_more: false })), retrieve: vi.fn() },
  },
};
const deps = { stripe: stripe as never, validateInputs: async () => {} };
async function paid(savedOptions: VideoGenerationOptions = options) {
  const p = await purchases.createVideoPurchaseDraft('owner', savedOptions, '/', crypto.randomUUID());
  await purchases.attachVideoCheckout(
    p.id,
    'owner',
    `cs_${p.id.replaceAll('-', '')}`,
    'https://checkout.stripe.com/fake',
  );
  await purchases.settleVideoPurchase(p.id, `cs_${p.id.replaceAll('-', '')}`, `pi_${p.id}`);
  return p;
}
describe('paid provider admission, recovery and refunds', () => {
  beforeEach(() => {
    resetVideoDatabase();
    vi.clearAllMocks();
    refunds = [];
    vi.mocked(createVideoTask).mockResolvedValue({
      provider: 'autodl',
      model: 'minimax-h3',
      providerTaskId: 'provider_one',
    });
    vi.stubEnv('APP_BASE_URL', 'http://localhost:7001');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk_test_fake');
    vi.stubEnv('STRIPE_VIDEO_PRICE_ID', 'price_video');
    vi.stubEnv('STRIPE_VIDEO_WEBHOOK_SECRET', 'whsec_fake');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });
  test('owner presentation retains uploaded references and creator inputs while hiding the full generation prompt', async () => {
    const saved = { ...options, referenceImageUrls: ['https://media.test/uploads/owner/dancer.jpg', 'https://media.test/uploads/owner/princess.jpg', 'https://media.test/uploads/owner/scene.jpg'], danceCustomization: { customDescription: 'A red coat', quickTags: ['playful' as const] } };
    const p = await purchases.createVideoPurchaseDraft('owner', saved, '/', crypto.randomUUID());
    const visible = await publicPaidVideoPurchase(p);
    expect(visible).toMatchObject({ dancerImageUrl: saved.referenceImageUrls[0], princessImageUrl: saved.referenceImageUrls[1], sceneImageUrl: saved.referenceImageUrls[2], customDescription: 'A red coat', quickTags: ['playful'] });
    expect(visible).not.toHaveProperty('prompt');
    expect(visible).not.toHaveProperty('generationOptions');
  });
  test('expired managed results hide media without refunding or restarting a delivered order', async () => {
    const p = await paid();
    await startPaidVideoPurchase(p.id, 'owner', deps);
    vi.mocked(queryVideoTask).mockResolvedValue({ status: 'succeeded', result: {
      provider: 'autodl', model: 'minimax-h3', videoUrl: 'https://media.test/generated-videos/owner/finished.mp4',
      storageKey: 'generated-videos/owner/finished.mp4', expiresAt: Date.now() - 1,
    } });
    const completed = await refreshPaidVideoPurchase(p.id, 'owner', deps);
    const visible = await publicPaidVideoPurchase(completed);
    expect(visible.state).toBe('expired');
    expect(visible.result).toBeUndefined();
    expect(visible).not.toHaveProperty('dancerImageUrl');
    expect((await purchases.getVideoPurchase(p.id))!.state).toBe('succeeded');
    expect(createVideoTask).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });
  test.each([false, true])('historical prompt metadata recovers only creator inputs (motion: %s)', referenceVideo => {
    const prompt = buildDancePrompt({ customDescription: 'A red coat', quickTags: ['playful', 'push-in'], referenceVideo });
    expect(readSavedDanceCustomization({ prompt })).toEqual({ customDescription: 'A red coat', quickTags: ['playful', 'push-in'] });
    expect(readSavedDanceCustomization({ prompt: buildDancePrompt({ referenceVideo }) })).toEqual({ customDescription: '', quickTags: [] });
  });
  test('unpaid, forged, cross-owner and refunded purchases never start a provider job', async () => {
    const draft = await purchases.createVideoPurchaseDraft('owner', options, '/', 'draft');
    await expect(startPaidVideoPurchase(draft.id, 'owner', deps)).rejects.toMatchObject({
      status: 402,
    });
    await expect(startPaidVideoPurchase('fake', 'owner', deps)).rejects.toMatchObject({
      status: 404,
    });
    const p = await paid();
    await expect(startPaidVideoPurchase(p.id, 'different-user', deps)).rejects.toMatchObject({
      status: 404,
    });
    await purchases.requestVideoRefund(p.id, 'failed');
    await expect(startPaidVideoPurchase(p.id, 'owner', deps)).rejects.toMatchObject({
      status: 402,
    });
    expect(createVideoTask).not.toHaveBeenCalled();
  });
  test('concurrent paid requests start exactly one provider job without credit grants', async () => {
    const p = await paid();
    await Promise.all(
      Array.from({ length: 12 }, () => startPaidVideoPurchase(p.id, 'owner', deps)),
    );
    expect(createVideoTask).toHaveBeenCalledTimes(1);
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({ state: 'processing' });
    expect(
      testDatabase.sqlite.prepare('SELECT count(*) AS n FROM credit_transaction').get(),
    ).toEqual({ n: 0 });
  });
  test('confirmed failure queues and completes one full Stripe refund across repeated polls', async () => {
    const p = await paid();
    await startPaidVideoPurchase(p.id, 'owner', deps);
    vi.mocked(queryVideoTask).mockResolvedValue({
      status: 'failed',
      errorMessage: 'Provider failed',
    });
    await Promise.all(
      Array.from({ length: 8 }, () => refreshPaidVideoPurchase(p.id, 'owner', deps)),
    );
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({
      state: 'refunded',
      refundedAmount: 499,
    });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create.mock.calls[0][0]).toMatchObject({ amount: 499 });
  });
  test('transient provider polling errors leave paid processing entitlement intact', async () => {
    const p = await paid();
    await startPaidVideoPurchase(p.id, 'owner', deps);
    vi.mocked(queryVideoTask).mockRejectedValue(new Error('temporary unavailable'));
    expect(await refreshPaidVideoPurchase(p.id, 'owner', deps)).toMatchObject({
      state: 'processing',
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });
  test('an actual Compshare blocked payload refunds once during closed-browser recovery', async () => {
    vi.stubEnv('COMPSHARE_API_KEY', 'sk-ml-unit-fixture');
    const transport = vi.spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({
      task: { id: 'cp_blocked', status: 'blocked', error: { code: 'generation_failed', message: 'Realistic videos of political figures are disallowed. Internal private details.' } },
    }));
    const p = await paid({ ...options, provider: 'compshare', model: 'MiniMax-H3' });
    vi.mocked(createVideoTask).mockResolvedValue({ provider: 'compshare', model: 'MiniMax-H3', providerTaskId: 'cp_blocked' });
    await startPaidVideoPurchase(p.id, 'owner', deps);
    vi.mocked(queryVideoTask).mockImplementation((_, model, id) => compshareQueryVideoTask(model, id));
    await reconcilePaidVideoPurchases(deps);
    await refreshPaidVideoPurchase(p.id, 'owner', deps);
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({ state: 'refunded', refundedAmount: 499 });
    const visible = await publicPaidVideoPurchase((await purchases.getVideoPurchase(p.id))!);
    expect(visible).toMatchObject({ state: 'refunded', refundStatus: 'succeeded', failureReason: 'political_figure_not_allowed' });
    expect(JSON.stringify(visible)).not.toContain('Internal private details');
    expect(stripe.refunds.create).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ amount: 499 }), expect.anything());
    expect(createVideoTask).toHaveBeenCalledOnce();
    expect(transport).toHaveBeenCalledOnce();
  });
  test('recovers a task persisted before its purchase update without resubmitting', async () => {
    const p = await paid();
    await purchases.claimVideoPurchase(p.id, 'owner');
    const task = await createVideoTaskRecord({
      purchaseId: p.id,
      userId: 'owner',
      provider: 'autodl',
      model: 'minimax-h3',
      providerTaskId: 'recovered',
      creditCost: 0,
    });
    vi.mocked(queryVideoTask).mockResolvedValue({ status: 'processing' });
    expect(await refreshPaidVideoPurchase(p.id, 'owner', deps)).toMatchObject({
      state: 'processing',
      taskId: task.id,
    });
    expect(createVideoTask).not.toHaveBeenCalled();
  });
  test('closed-browser reconciliation starts paid work and refunds stale interrupted starts, never resubmits', async () => {
    const p = await paid();
    testDatabase.sqlite
      .prepare('UPDATE video_purchase SET updated_at=? WHERE id=?')
      .run(Math.floor(Date.now() / 1000) - 3600, p.id);
    await reconcilePaidVideoPurchases(deps);
    expect(createVideoTask).toHaveBeenCalledTimes(1);
    const interrupted = await paid();
    await purchases.claimVideoPurchase(interrupted.id, 'owner');
    testDatabase.sqlite
      .prepare('UPDATE video_purchase SET updated_at=? WHERE id=?')
      .run(Math.floor(Date.now() / 1000) - 3600, interrupted.id);
    vi.mocked(queryVideoTask).mockResolvedValue({ status: 'processing' });
    await reconcilePaidVideoPurchases(deps);
    expect(await purchases.getVideoPurchase(interrupted.id)).toMatchObject({ state: 'refunded' });
    expect(createVideoTask).toHaveBeenCalledTimes(1);
  });
  test('successful video cannot generate again on the same payment', async () => {
    const p = await paid();
    await startPaidVideoPurchase(p.id, 'owner', deps);
    vi.mocked(queryVideoTask).mockResolvedValue({
      status: 'succeeded',
      result: { provider: 'autodl', model: 'minimax-h3', videoUrl: 'https://media.test/video.mp4' },
    });
    expect(await refreshPaidVideoPurchase(p.id, 'owner', deps)).toMatchObject({
      state: 'succeeded',
    });
    await startPaidVideoPurchase(p.id, 'owner', deps);
    expect(createVideoTask).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });
  test('a confirmed missing photo after payment refunds before provider submission', async () => {
    const p = await paid();
    expect(
      await startPaidVideoPurchase(p.id, 'owner', {
        ...deps,
        validateInputs: async () => {
          throw new PaidVideoInputMissing('Missing');
        },
      }),
    ).toMatchObject({ state: 'refunded' });
    expect(createVideoTask).not.toHaveBeenCalled();
  });
  test('a lost refund write or old idempotency key recovers the existing full Stripe refund', async () => {
    const p = await paid();
    await purchases.requestVideoRefund(p.id, 'failure');
    refunds = [{ id: 're_prior', amount: 499, status: 'succeeded' }];
    expect(await refundPaidVideoPurchase(p.id, stripe as never)).toMatchObject({
      state: 'refunded',
    });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });
  test('a partial refund and a failed top-up retry only the unpaid remainder', async () => {
    const p = await paid();
    await purchases.requestVideoRefund(p.id, 'failure');
    refunds = [
      { id: 're_failed', amount: 299, status: 'failed' },
      { id: 're_partial', amount: 200, status: 'succeeded' },
    ];
    expect(await refundPaidVideoPurchase(p.id, stripe as never)).toMatchObject({
      state: 'refunded',
      refundedAmount: 499,
    });
    expect(stripe.refunds.create).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 299 }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining(':1:299') }),
    );
  });
  test('replaying an old failed refund snapshot never advances the same retry twice', async () => {
    const p = await paid();
    await purchases.requestVideoRefund(p.id, 'failure');
    await purchases.recordVideoRefund(p.id, { id: 're_old', status: 'failed', amount: 0 });
    await purchases.advanceFailedVideoRefund(p.id, 're_old');
    await purchases.recordVideoRefund(p.id, { id: 're_old', status: 'failed', amount: 0 });
    await purchases.advanceFailedVideoRefund(p.id, 're_old');
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({ refundAttempt: 1 });
  });
  test('overlapping reconciliation remains bounded to ten purchases and one start per payment', async () => {
    const ids = await Promise.all(Array.from({ length: 13 }, paid));
    for (const p of ids)
      testDatabase.sqlite
        .prepare('UPDATE video_purchase SET updated_at=? WHERE id=?')
        .run(Math.floor(Date.now() / 1000) - 3600, p.id);
    vi.mocked(createVideoTask).mockImplementation(async () => ({
      provider: 'autodl',
      model: 'minimax-h3',
      providerTaskId: crypto.randomUUID(),
    }));
    await Promise.all([reconcilePaidVideoPurchases(deps), reconcilePaidVideoPurchases(deps)]);
    expect(createVideoTask).toHaveBeenCalledTimes(10);
    expect(
      testDatabase.sqlite
        .prepare("SELECT count(*) AS n FROM video_purchase WHERE state='paid'")
        .get(),
    ).toEqual({ n: 3 });
  });
  test('cron recovers a paid Stripe session lost before the checkout DB save', async () => {
    const p = await purchases.createVideoPurchaseDraft('owner', options, '/', 'lost-checkout');
    const session = {
      id: 'cs_lost',
      mode: 'payment',
      status: 'complete',
      payment_status: 'paid',
      livemode: false,
      amount_total: 499,
      currency: 'usd',
      client_reference_id: p.id,
      payment_intent: 'pi_lost',
      metadata: { app: 'rumpelstiltskin-video-v1', purchaseId: p.id, userId: 'owner' },
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
    stripe.checkout.sessions.list.mockResolvedValueOnce({
      data: [session] as never[],
      has_more: false,
    });
    stripe.checkout.sessions.retrieve.mockResolvedValue(session);
    testDatabase.sqlite
      .prepare('UPDATE video_purchase SET updated_at=? WHERE id=?')
      .run(Math.floor(Date.now() / 1000) - 3600, p.id);
    await reconcilePaidVideoPurchases(deps);
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({
      checkoutSessionId: 'cs_lost',
      state: 'processing',
    });
    expect(createVideoTask).toHaveBeenCalledTimes(1);
  });
  test('a steady slow paid queue cannot starve refunds in consecutive cron slots', async () => {
    await paid();
    await paid();
    const refund = await paid();
    await purchases.requestVideoRefund(refund.id, 'technical failure');
    testDatabase.sqlite
      .prepare('UPDATE video_purchase SET updated_at=?')
      .run(Math.floor(Date.now() / 1000) - 3600);
    let now = Math.ceil(Date.now() / (25 * 60_000)) * 25 * 60_000;
    vi.spyOn(Date, 'now').mockImplementation(() => now);
    vi.mocked(createVideoTask).mockImplementation(async () => {
      now += 46_000;
      return { provider: 'autodl', model: 'minimax-h3', providerTaskId: crypto.randomUUID() };
    });
    vi.mocked(queryVideoTask).mockResolvedValue({ status: 'processing' });
    await reconcilePaidVideoPurchases(deps);
    expect(await purchases.getVideoPurchase(refund.id)).toMatchObject({ state: 'refund_pending' });
    now = Math.floor(now / (5 * 60_000)) * 5 * 60_000 + 5 * 60_000;
    await reconcilePaidVideoPurchases(deps);
    expect(await purchases.getVideoPurchase(refund.id)).toMatchObject({ state: 'refunded' });
  });
  test('validation consuming the cron budget safely defers an unsubmitted claim without a refund',async()=>{
    const p=await paid();let now=Date.now();const deadline=now+45_000;
    vi.spyOn(Date,'now').mockImplementation(()=>now);
    expect(await startPaidVideoPurchase(p.id,'owner',{...deps,deadline,validateInputs:async()=>{now+=20_000;}})).toMatchObject({state:'paid',taskId:null});
    expect(createVideoTask).not.toHaveBeenCalled();expect(stripe.refunds.create).not.toHaveBeenCalled();
    await startPaidVideoPurchase(p.id,'owner',deps);
    expect(createVideoTask).toHaveBeenCalledOnce();
    expect(await purchases.getVideoPurchase(p.id)).toMatchObject({state:'processing'});
  });
});
