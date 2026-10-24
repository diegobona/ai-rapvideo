import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
const state = vi.hoisted(() => ({ userId: 'owner', missingKey: '', requirePayment: false }));
vi.mock('@libs/auth/auth', () => ({ auth: { api: { getSession: async () => state.userId ? { user: { id: state.userId, isAnonymous: true } } : null } } }));
vi.mock('@libs/database', async () => ({ ...(await import('../../helpers/video-d1')).testDatabase, getDialect: () => 'd1' }));
vi.mock('@libs/database/schema', () => import('../../../libs/database/schema/sqlite'));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@/lib/with-request-db', () => ({ withCfDb: (fn: unknown) => fn }));
vi.mock('@/lib/paid-video-recovery', () => ({ schedulePaidVideoRecovery: vi.fn(async () => {}) }));
vi.mock('cloudflare:workers', () => ({ env: { R2_PUBLIC_URL: 'https://media.test', R2_BUCKET: { head: async (key: string) => key === state.missingKey ? null : ({ size: 1 }) } } }));
vi.mock('../../../config/videoPurchase', async importOriginal => ({ ...(await importOriginal<typeof import('../../../config/videoPurchase')>()), get VIDEO_PAYMENT_REQUIRED() { return state.requirePayment; } }));
vi.mock('../../../libs/ai/video', () => ({ validateVideoGenerationOptions: vi.fn(), createVideoTask: vi.fn(), queryVideoTask: vi.fn() }));
vi.mock('../../../libs/payment/video-stripe', async importOriginal => ({ ...(await importOriginal<typeof import('../../../libs/payment/video-stripe')>()), createVideoStripeClient: vi.fn(() => { throw Error('Temporary free route must not use Stripe'); }) }));
import { resetVideoDatabase, testDatabase } from '../../helpers/video-d1';
import { Route as generate } from '../../../apps/tanstack-app/src/routes/api/video-generate/index';
import { Route as checkout } from '../../../apps/tanstack-app/src/routes/api/video-checkout/index';
import { Route as status } from '../../../apps/tanstack-app/src/routes/api/video-generate/status';
import { createVideoTask, queryVideoTask, validateVideoGenerationOptions } from '../../../libs/ai/video';
import { createVideoStripeClient } from '../../../libs/payment/video-stripe';
import * as purchases from '../../../libs/payment/video-purchases';
import { schedulePaidVideoRecovery } from '../../../apps/tanstack-app/src/lib/paid-video-recovery';

const input = { rapTemplate: 'rap-duo-v1', personOneImageUrl: 'https://media.test/uploads/owner/a.jpg', personTwoImageUrl: 'https://media.test/uploads/owner/b.jpg', scene: 'hotel-lobby', topic: 'Weekend plans', lyrics: { language: 'en', lines: ['We light up the night', 'Our friendship shines so bright', 'We step into the light', 'Together we take our flight'] } };
const post = (route: unknown, body: unknown, headers: Record<string, string> = {}) => (route as any).server.handlers.POST({ request: new Request('http://localhost:7001/api/video-generate/', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }) }) as Promise<Response>;
const get = (route: unknown, path: string) => (route as any).server.handlers.GET({ request: new Request(`http://localhost:7001${path}`) }) as Promise<Response>;
describe('temporary direct HTTP flow', () => {
  beforeEach(() => {
    resetVideoDatabase(); vi.clearAllMocks(); state.userId = 'owner'; state.missingKey = ''; state.requirePayment = false;
    vi.stubEnv('R2_PUBLIC_URL', 'https://media.test'); vi.stubEnv('BETTER_AUTH_SECRET', 'a-temporary-route-secret-of-at-least-thirty-two-characters');
    vi.mocked(createVideoTask).mockResolvedValue({ provider: 'autodl', model: 'minimax-h3', providerTaskId: 'direct-provider' });
    vi.mocked(queryVideoTask).mockResolvedValue({ status: 'processing' });
    vi.mocked(validateVideoGenerationOptions).mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  test('starts directly with server options, no Stripe, no payment rows or credit consumption', async () => {
    const response = await post(generate, input);
    expect(response.status).toBe(200);
    const { data } = await response.json();
    expect(data).toMatchObject({ taskId: expect.any(String), status: 'processing' });
    expect(createVideoTask).toHaveBeenCalledTimes(1);
    expect(vi.mocked(createVideoTask).mock.calls[0][0]).toMatchObject({ provider: 'autodl', workflowId: 'minimax_h3_803', duration: 12, size: '768p竖(768*1376)', referenceImageUrls: [input.personOneImageUrl, input.personTwoImageUrl] });
    expect(createVideoStripeClient).not.toHaveBeenCalled();
    expect(testDatabase.sqlite.prepare('SELECT COUNT(*) AS count FROM video_purchase').get()).toEqual({ count: 0 });
    expect(testDatabase.sqlite.prepare('SELECT COUNT(*) AS count FROM credit_transaction').get()).toEqual({ count: 0 });
    const owned = await get(generate, '/api/video-generate/');
    expect(await owned.json()).toMatchObject({ data: { directTaskId: data.taskId, purchase: null, storageKey: expect.any(String) } });
    expect((await get(status, `/api/video-generate/status?taskId=${data.taskId}`)).status).toBe(200);
    state.userId = 'different-user';
    expect((await get(status, `/api/video-generate/status?taskId=${data.taskId}`)).status).toBe(404);
  });

  test.each([
    { prompt: 'raw override' }, { ...input, personOneImageUrl: 'https://media.test/uploads/different-user/a.jpg' },
    { ...input, personTwoImageUrl: 'https://media.test/uploads/different-user/b.jpg' },
    { ...input, personTwoImageUrl: undefined }, { ...input, personTwoImageUrl: input.personOneImageUrl },
    { ...input, topic: 'x'.repeat(241) }, { ...input, scene: 'unknown' },
    { ...input, provider: 'compshare' }, { ...input, workflowId: 'other' }, { ...input, duration: 60 },
  ])('rejects invalid or unauthorized direct input %j before submission', async body => {
    expect((await post(generate, body)).status).toBe(400);
    expect(createVideoTask).not.toHaveBeenCalled();
  });

  test('auth, origin, stored-input checks and temporary payment flag are enforced', async () => {
    state.userId = '';
    expect((await post(generate, input)).status).toBe(401);
    state.userId = 'owner';
    expect((await post(generate, input, { origin: 'https://elsewhere.test' })).status).toBe(403);
    state.missingKey = 'uploads/owner/a.jpg';
    expect((await post(generate, input)).status).toBe(400);
    state.missingKey = ''; state.requirePayment = true;
    expect((await post(generate, input)).status).toBe(400);
    expect(createVideoTask).not.toHaveBeenCalled();
  });

  test('stale clients cannot create a new Stripe checkout while payment is disabled', async () => {
    const response = await post(checkout, { dancerImageUrl: input.personOneImageUrl, returnPath: '/' });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: 'video_payment_disabled' });
    expect(createVideoStripeClient).not.toHaveBeenCalled();
  });

  test('an old unpaid pending purchase does not block the temporary direct flow', async () => {
    const purchase = await purchases.createVideoPurchaseDraft('owner', { provider: 'autodl', model: 'minimax-h3', prompt: 'old', referenceImageUrls: [input.personOneImageUrl] }, '/', 'old-pending');
    expect(await (await get(generate, '/api/video-generate/')).json()).toMatchObject({ data: { purchase: null } });
    expect((await post(generate, { purchaseId: purchase.id })).status).toBe(402);
    expect((await post(generate, input)).status).toBe(200);
  });

  test.each(['paid', 'starting', 'processing', 'refund_pending'])('keeps an old %s purchase visible for recovery while checkout is disabled', async purchaseState => {
    const purchase = await purchases.createVideoPurchaseDraft('owner', { provider: 'autodl', model: 'minimax-h3', prompt: 'old' }, '/', `old-${purchaseState}`);
    testDatabase.sqlite.prepare('UPDATE video_purchase SET state = ? WHERE id = ?').run(purchaseState, purchase.id);
    expect(await (await get(generate, '/api/video-generate/')).json()).toMatchObject({ data: { purchase: { id: purchase.id, state: purchaseState } } });
    expect(schedulePaidVideoRecovery).toHaveBeenCalledWith(purchase.id);
    expect(createVideoStripeClient).not.toHaveBeenCalled();
  });

  test('returns a safe unavailable error before submission when provider configuration is missing', async () => {
    vi.mocked(validateVideoGenerationOptions).mockImplementation(() => { throw Error('AUTODL_API_KEY private upstream detail'); });
    const response = await post(generate, input);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'video_service_unavailable' });
    expect(createVideoTask).not.toHaveBeenCalled();
  });

  test('does not expose raw provider failures while polling a direct task', async () => {
    const { data } = await (await post(generate, input)).json();
    vi.mocked(queryVideoTask).mockResolvedValue({ status: 'failed', errorMessage: 'private provider payload and credential' });
    const response = await get(status, `/api/video-generate/status?taskId=${data.taskId}`);
    expect(await response.json()).toMatchObject({ data: { status: 'failed', error: 'video_generation_failed' } });
  });

  test.each(['succeeded', 'failed'] as const)('refresh keeps a %s direct task downloadable without blocking a new run', async taskStatus => {
    const { data } = await (await post(generate, input)).json();
    vi.mocked(queryVideoTask).mockResolvedValue(taskStatus === 'succeeded'
      ? { status: taskStatus, result: { videoUrl: 'https://media.test/output.mp4', provider: 'autodl', model: 'minimax-h3' } }
      : { status: taskStatus, errorMessage: 'input could not be processed' });
    const refreshed = await (await get(generate, '/api/video-generate/')).json();
    expect(refreshed.data.directTaskId).toBe(taskStatus === 'succeeded' ? data.taskId : undefined);
    expect(await (await get(status, `/api/video-generate/status?taskId=${data.taskId}`)).json()).toMatchObject({ data: { taskId: data.taskId, status: taskStatus } });
    vi.mocked(createVideoTask).mockResolvedValue({ provider: 'autodl', model: 'minimax-h3', providerTaskId: 'next-direct-provider' });
    const next = await (await post(generate, input)).json();
    expect(next.data.taskId).not.toBe(data.taskId);
    expect(createVideoTask).toHaveBeenCalledTimes(2);
  });
});
