import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
// Exercise historical paid contracts independently of the temporary public free mode.
vi.mock('../../../config/videoPurchase', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../config/videoPurchase')>()),
  VIDEO_PAYMENT_REQUIRED: true,
}));
const state = vi.hoisted(() => ({ userId: 'owner' }));
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
  isD1Dialect: () => true,
}));
vi.mock('@libs/database/schema', () => import('../../../libs/database/schema/sqlite'));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/with-request-db', () => ({ withCfDb: (fn: unknown) => fn }));
vi.mock('@/lib/paid-video-recovery', () => ({ schedulePaidVideoRecovery: vi.fn(async () => {}) }));
vi.mock('../../../libs/payment/video-stripe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../libs/payment/video-stripe')>()),
  createVideoStripeClient: () => stripe,
}));
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
};
import { resetVideoDatabase } from '../../helpers/video-d1';
import { creditService } from '@libs/credits';
import { createVideoTaskRecord } from '../../../libs/ai/video-task-store';
import * as purchases from '../../../libs/payment/video-purchases';
import { Route as generateRoute } from '../../../apps/tanstack-app/src/routes/api/video-generate/index';
import { Route as statusRoute } from '../../../apps/tanstack-app/src/routes/api/video-generate/status';
import { createDanceVideoOptions } from '../../../apps/tanstack-app/src/lib/dance-template';
import { buildDancePrompt } from '../../../apps/tanstack-app/src/lib/dance-prompt';
import type { VideoGenerationOptions } from '../../../libs/ai/types';
const POST = (body: unknown): Promise<Response> =>
  (generateRoute as any).server.handlers.POST({
    request: new Request('https://app.example/api/video-generate/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
const GET = (query: string): Promise<Response> =>
  (statusRoute as any).server.handlers.GET({
    request: new Request(`https://app.example/api/video-generate/status?${query}`),
  });
async function paid(generationOptions: VideoGenerationOptions = {
  provider: 'autodl', model: 'minimax-h3', prompt: 'fixed server prompt',
  referenceImageUrls: ['https://media.example/uploads/owner/a.jpg'], duration: 10, size: '768p横',
}) {
  const p = await purchases.createVideoPurchaseDraft(
    'owner',
    generationOptions,
    '/',
    'api',
  );
  await purchases.attachVideoCheckout(
    p.id,
    'owner',
    'cs_owned',
    'https://checkout.stripe.com/fake',
  );
  await purchases.settleVideoPurchase(p.id, 'cs_owned', 'pi_owned');
  return p;
}
describe('AutoDL paid video route and legacy task access', () => {
  beforeEach(() => {
    resetVideoDatabase();
    vi.clearAllMocks();
    state.userId = 'owner';
    refunds = [];
    vi.stubEnv('AUTODL_API_KEY', 'fake-provider-token');
    vi.stubEnv('COMPSHARE_API_KEY', 'sk-ml-provider-fixture');
    vi.stubEnv('R2_PUBLIC_URL', 'https://media.example');
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });
  test('requires a session and rejects the old free/credit prompt body', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    state.userId = '';
    expect((await POST({ purchaseId: 'fake' })).status).toBe(401);
    state.userId = 'owner';
    expect(
      (
        await POST({
          provider: 'autodl',
          prompt: 'free',
          firstFrameUrl: 'https://media.example/a.jpg',
        })
      ).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
    expect(await creditService.getBalance('owner')).toBe(80);
  });
  test('unpaid purchases cannot be replaced with an existing credit balance', async () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    const p = await purchases.createVideoPurchaseDraft(
      'owner',
      { provider: 'autodl', prompt: 'fixed' },
      '/',
      'unpaid',
    );
    expect((await POST({ purchaseId: p.id })).status).toBe(402);
    expect(fetch).not.toHaveBeenCalled();
  });
  test('concurrent paid calls submit the real fixed provider payload once', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ code: 'Success', data: { task_id: 'paid-provider', status: 'QUEUED' } }),
        ),
    );
    vi.stubGlobal('fetch', fetch);
    const p = await paid();
    const responses = await Promise.all(
      Array.from({ length: 8 }, () => POST({ purchaseId: p.id })),
    );
    expect(responses.map((r) => r.status)).toEqual(Array(8).fill(200));
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetch.mock.calls[0][1].body as string)).toMatchObject({
      prompt: 'fixed server prompt',
      ref_image_0: 'https://media.example/uploads/owner/a.jpg',
      duration: 10,
      resolution: '768p横',
    });
    expect(await creditService.getTransactions('owner')).toHaveLength(0);
  });
  test.each([
    ['landscape', '768p横'], ['portrait', '768p竖'],
  ])('the actual AutoDL request uses %s and retains paid custom instructions', async (orientation, resolution) => {
    const fetch = vi.fn(async () => Response.json({ code: 'Success', data: { task_id: 'custom-provider', status: 'QUEUED' } }));
    vi.stubGlobal('fetch', fetch);
    const options: VideoGenerationOptions = {
      provider: 'autodl', model: 'minimax-h3', size: resolution, duration: 10,
      prompt: buildDancePrompt({ customDescription: '红色外套，保留眼镜', quickTags: ['playful', 'film-grain', 'push-in'], sceneImageUrl: 'https://media.example/uploads/owner/beach.png' }),
      referenceImageUrls: ['https://media.example/uploads/owner/a.jpg', 'https://media.example/uploads/owner/princess.png', 'https://media.example/uploads/owner/beach.png'],
    };
    // Historical saved AutoDL options retain their original provider/canvas.
    const purchase = await paid({ ...options, provider: 'autodl', model: 'minimax-h3', size: resolution });
    expect((await POST({ purchaseId: purchase.id })).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetch.mock.calls[0][1].body as string);
    expect(payload.prompt).toBe(options.prompt);
    for (const text of ['红色外套，保留眼镜', 'playful, amused surprise', 'pronounced 35mm film grain', 'slow camera push-in']) expect(payload.prompt).toContain(text);
    expect(payload.prompt).not.toContain('No zooms, no handheld shake');
    expect(payload).toMatchObject({ duration: 10, resolution, ref_image_0: 'https://media.example/uploads/owner/a.jpg' });
    expect(payload.ref_image_1).toBe('https://media.example/uploads/owner/princess.png');
    expect(payload.ref_image_2).toBe('https://media.example/uploads/owner/beach.png');
    expect(payload.prompt).toContain('Use @Image3 as the creator-selected environment');
    expect(payload.prompt).not.toContain('Strictly preserve the compact straw-corner environment');
  });

  test('uncertain submission failures are never retried and remain recoverable', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const p = await paid();
    const response = await POST({ purchaseId: p.id });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { purchase: { state: 'starting' } } });
    await POST({ purchaseId: p.id });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await creditService.getBalance('owner')).toBe(80);
  });

  test.each([
    { orientation: 'landscape', resolution: '768p横', customPrincess: false },
    { orientation: 'portrait', resolution: '768p竖', customPrincess: false },
    { orientation: 'landscape', resolution: '768p横', customPrincess: true },
    { orientation: 'portrait', resolution: '768p竖', customPrincess: true },
  ])('paid image-only AutoDL $orientation request freezes workflow and references (custom princess: $customPrincess)', async ({ orientation, resolution, customPrincess }) => {
    vi.stubEnv('AUTODL_VIDEO_WORKFLOW_ID', 'unrelated-env-workflow');
    vi.stubEnv('COMPSHARE_REFERENCE_VIDEO_URL', 'https://media.example/references/ignored-motion.mp4');
    const fetch = vi.fn(async (_url: string, init: RequestInit) => init.method === 'POST'
      ? Response.json({ code: 'Success', data: { task_id: 'image-autodl-paid', status: 'QUEUED' } })
      : Response.json({ code: 'Success', data: { status: 'SUCCESS', results: ['https://media.example/finished.mp4'] } }));
    vi.stubGlobal('fetch', fetch);
    const options = createDanceVideoOptions({ danceTemplate: 'rumpelstiltskin-v2', dancerImageUrl: 'https://media.example/uploads/owner/a.jpg',
      ...(customPrincess ? { princessImageUrl: 'https://media.example/uploads/owner/princess.png' } : {}),
      sceneImageUrl: 'https://media.example/uploads/owner/ignored-scene.png', orientation, customDescription: '喜悦表情', quickTags: ['push-in', 'film-grain', 'playful'],
      referenceVideoUrls: ['https://attacker.test/other.mp4'], workflowId: 'client-workflow' }, 'https://media.example');
    const purchase = await paid(options);
    expect(purchase).toMatchObject({ amount: 499, currency: 'usd' });
    expect(purchase.generationOptions).toMatchObject({ provider: 'autodl', model: 'minimax-h3', workflowId: 'minimax_h3_zm_u24', size: resolution, duration: 10 });
    const savedPrompt = purchase.generationOptions.prompt;
    vi.stubEnv('AUTODL_VIDEO_WORKFLOW_ID', 'changed-after-payment');
    vi.stubEnv('COMPSHARE_REFERENCE_VIDEO_URL', 'https://media.example/references/changed-later.mp4');
    expect((await POST({ purchaseId: purchase.id })).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe('https://autodl.art/api/v1/comfyui/comfyui_workflow/minimax_h3_zm_u24');
    const payload = JSON.parse(fetch.mock.calls[0][1].body as string);
    expect(payload).toEqual({
      prompt: savedPrompt, duration: 10, resolution,
      ref_image_0: 'https://media.example/uploads/owner/a.jpg',
      ref_image_1: customPrincess ? 'https://media.example/uploads/owner/princess.png' : 'https://media.example/references/rumpelstiltskin-v2/princess-default-v2.png',
      ref_image_2: 'https://media.example/references/rumpelstiltskin-v2/barn-scene.png',
    });
    expect(Object.keys(payload).some(key => /video|first_frame|last_frame/i.test(key))).toBe(false);
    expect(payload.prompt).toMatch(/@Image1[^.\n]*dancer/i);
    expect(payload.prompt).toMatch(/@Image2[^.\n]*princess/i);
    expect(payload.prompt).toMatch(/@Image3[^.\n]*(?:scene|environment)/i);
    expect(payload.prompt).not.toMatch(/@Video\d+\b|video editing|edited version|source actor|face[- ]swap|deepfake/i);
    expect(payload.prompt).toMatch(/4\s*(?:[–-]|to)\s*6[^.\n]*(?:steps|weight transfers)/i);
    expect(payload.prompt).toMatch(/DYNAMIC FACIAL PERFORMANCE/);
    for (const feature of [/blink/i, /eyebrow/i, /\blips?\b/i, /\bjaw\b/i, /\bgaze\b/i]) expect(payload.prompt).toMatch(feature);
    expect(payload.prompt).toMatch(/(?:no|never|do not)[^.\n]*(?:uploaded[- ]photo|photo insert)/i);
    expect(payload.prompt).toContain('喜悦表情');
    expect(payload.prompt).toContain('warm grin');
    expect(payload.prompt).not.toMatch(/slow camera push-in|pronounced 35mm film grain/);
    expect((await purchases.getVideoPurchase(purchase.id))!.generationOptions.prompt).toBe(savedPrompt);
    await POST({ purchaseId: purchase.id });
    expect(fetch).toHaveBeenCalledTimes(1);
    const complete = await GET('purchaseId=' + purchase.id);
    expect(await complete.json()).toMatchObject({ data: { purchase: { state: 'succeeded', orientation, result: { provider: 'autodl', videoUrl: 'https://media.example/finished.mp4' } } } });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  test('historical paid Compshare orders retain their saved video reference and prompt after configuration changes', async () => {
    const historicalPrompt = 'Historical saved prompt: @Image1 dances in @Image3 using motion from @Video1.';
    const historicalVideoUrl = 'https://media.example/references/historical-motion.mp4';
    const historicalOptions: VideoGenerationOptions = {
      provider: 'compshare', model: 'MiniMax-H3', prompt: historicalPrompt,
      referenceImageUrls: ['https://media.example/uploads/owner/a.jpg', 'https://media.example/references/rumpelstiltskin-v2/princess-default-v2.png', 'https://media.example/uploads/owner/scene.png'],
      referenceVideoUrls: [historicalVideoUrl], duration: 10, size: '768P', aspectRatio: '9:16',
    };
    const purchase = await paid(historicalOptions);
    vi.stubEnv('COMPSHARE_REFERENCE_VIDEO_URL', 'https://media.example/references/changed-later.mp4');
    const fetch = vi.fn(async (_url: string, init: RequestInit) => init.method === 'POST'
      ? Response.json({ task_id: 'historical-compshare-paid' })
      : Response.json({ task: { id: 'historical-compshare-paid', status: 'succeeded', duration: 10, content: { url: 'https://media.example/historical-finished.mp4' } } }));
    vi.stubGlobal('fetch', fetch);
    expect((await POST({ purchaseId: purchase.id })).status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetch.mock.calls[0][1].body as string);
    expect(payload.content[0]).toEqual({ type: 'text', text: 'Historical saved prompt: <Picture 1> dances in <Picture 3> using motion from <Video 1>.' });
    expect(payload.content.find((item: any) => item.role === 'reference_video')).toEqual({ type: 'video_url', video_url: { url: historicalVideoUrl }, role: 'reference_video' });
    expect(payload.content.filter((item: any) => item.role === 'reference_image').map((item: any) => item.image_url.url)).toEqual(historicalOptions.referenceImageUrls);
    expect((await purchases.getVideoPurchase(purchase.id))!.generationOptions.prompt).toBe(historicalPrompt);
    expect(fetch.mock.calls[0][1].headers).toMatchObject({ 'Idempotency-Key': `dance-${purchase.id}` });
    await POST({ purchaseId: purchase.id });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(await (await GET(`purchaseId=${purchase.id}`)).json()).toMatchObject({ data: { purchase: { state: 'succeeded', orientation: 'portrait', result: { provider: 'compshare', videoUrl: 'https://media.example/historical-finished.mp4' } } } });
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  test('terminal Compshare failure uses the existing full cash-refund path', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(Response.json({ task_id: 'cp-fail' }))
      .mockResolvedValueOnce(Response.json({ task: { id: 'cp-fail', status: 'failed' } })));
    const options: VideoGenerationOptions = {
      provider: 'compshare', model: 'MiniMax-H3', prompt: 'Historical saved Compshare request',
      referenceImageUrls: ['https://media.example/uploads/owner/a.jpg'], duration: 10, size: '768P', aspectRatio: '16:9',
    };
    const purchase = await paid(options);
    await POST({ purchaseId: purchase.id });
    const response = await GET(`purchaseId=${purchase.id}`);
    expect(await response.json()).toMatchObject({ data: { purchase: { state: 'refunded', refundStatus: 'succeeded' } } });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(stripe.refunds.create.mock.calls[0][0]).toMatchObject({ amount: 499 });
  });
  test('terminal paid failure makes a full cash refund without credit changes', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              code: 'Success',
              data: { task_id: 'paid-failure', status: 'QUEUED' },
            }),
          ),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({ code: 'Success', data: { status: 'FAILED', message: 'Failed' } }),
          ),
        ),
    );
    const p = await paid();
    await POST({ purchaseId: p.id });
    const response = await GET(`purchaseId=${p.id}`);
    expect(await response.json()).toMatchObject({
      success: true,
      data: { purchase: { id: p.id, state: 'refunded', refundStatus: 'succeeded' } },
    });
    expect(stripe.refunds.create).toHaveBeenCalledTimes(1);
    expect(await creditService.getBalance('owner')).toBe(80);
  });
  test('legacy taskId status stays owner scoped and returns a completed video', async () => {
    const task = await createVideoTaskRecord({
      userId: 'owner',
      provider: 'autodl',
      model: 'minimax-h3',
      providerTaskId: 'legacy',
      creditCost: 0,
    });
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            code: 'Success',
            data: {
              status: 'completed',
              results: [
                { type: 'video', file_type: 'mp4', url: 'https://media.example/legacy.mp4' },
              ],
            },
          }),
        ),
    );
    vi.stubGlobal('fetch', fetch);
    state.userId = 'different-user';
    expect((await GET(`taskId=${task.id}`)).status).toBe(404);
    expect(fetch).not.toHaveBeenCalled();
    state.userId = 'owner';
    expect(await (await GET(`taskId=${task.id}`)).json()).toMatchObject({
      success: true,
      data: {
        taskId: task.id,
        status: 'succeeded',
        result: { videoUrl: 'https://media.example/legacy.mp4' },
      },
    });
  });
  test('a legacy credit-backed task still refunds its original charge once', async () => {
    const charged = await creditService.consumeCredits({ userId: 'owner', amount: 40 });
    const task = await createVideoTaskRecord({
      userId: 'owner',
      provider: 'autodl',
      model: 'minimax-h3',
      providerTaskId: 'legacy-failed',
      creditCost: 40,
      consumeTransactionId: charged.transactionId,
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ code: 'Success', data: { status: 'FAILED', message: 'Failed' } }),
          ),
      ),
    );
    await GET(`taskId=${task.id}`);
    await GET(`taskId=${task.id}`);
    expect(await creditService.getBalance('owner')).toBe(80);
    expect(await creditService.getTransactions('owner', { type: 'refund' })).toHaveLength(1);
  });
});
