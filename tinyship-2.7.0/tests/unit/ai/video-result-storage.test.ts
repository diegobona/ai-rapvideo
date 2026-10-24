import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MEDIA_RETENTION_MS } from '../../../config/mediaRetention';
import {
  createManagedVideoResultStorage,
  VideoResultExpiredError,
} from '../../../libs/ai/video-result-storage';
import type { VideoTaskRecord } from '../../../libs/ai/video-task-store';
import type { VideoGenerationResult } from '../../../libs/ai/types';

const state = vi.hoisted(() => ({
  task: undefined as VideoTaskRecord | undefined,
  query: vi.fn(),
  save: vi.fn(),
  fail: vi.fn(),
  refund: vi.fn(),
}));
vi.mock('../../../libs/ai/video', () => ({ queryVideoTask: state.query }));
vi.mock('../../../libs/ai/video-task-store', () => ({
  getVideoTaskRecord: async () => state.task,
  markVideoTaskSucceeded: state.save,
  markVideoTaskFailed: state.fail,
  refundFailedVideoTask: state.refund,
}));
import { refreshVideoTask } from '../../../libs/ai/video-task-status';

const source = 'https://cg-comfyui-prod.tos-cn-beijing.volces.com/comfyui/outputs/video.mp4?signature=private';
const providerResult: VideoGenerationResult = {
  provider: 'autodl', model: 'minimax-h3', duration: 10, videoUrl: source,
  coverImageUrl: 'https://provider.example/cover.jpg',
};
function task(): VideoTaskRecord {
  return { id: 'task_1', userId: 'owner', provider: 'autodl', model: 'minimax-h3',
    providerTaskId: 'provider-task', creditCost: 0, status: 'processing', refunded: false,
    createdAt: Date.now(), updatedAt: Date.now() };
}
function mp4(headers: HeadersInit = {}) {
  return new Response(new Uint8Array([0, 0, 0, 1]), {
    headers: { 'Content-Type': 'video/mp4', 'Content-Length': '4', ...headers },
  });
}
function storage() {
  const object = { uploaded: new Date(Date.now() - 1000), size: 4 };
  const bucket = { head: vi.fn(async () => null as typeof object | null), put: vi.fn(async () => object as typeof object | null) };
  const fetchVideo = vi.fn<typeof fetch>(async () => mp4());
  const store = createManagedVideoResultStorage({ bucket, publicUrl: 'https://media.example/', fetch: fetchVideo });
  return { object, bucket, fetchVideo, store };
}
beforeEach(() => {
  vi.clearAllMocks();
  state.task = task();
  state.query.mockResolvedValue({ status: 'succeeded', result: providerResult });
  state.save.mockImplementation(async (_id, _owner, result) => ({ ...state.task!, status: 'succeeded', result }));
  state.fail.mockImplementation(async (_id, _owner, errorMessage) => ({ ...state.task!, status: 'failed', errorMessage }));
});

describe('managed generated-video storage', () => {
  test('streams the exact fetch body, preserves provider details, and drops remote cover', async () => {
    const { object, bucket, fetchVideo, store } = storage();
    const response = mp4();
    fetchVideo.mockResolvedValue(response);
    const result = await store(task(), providerResult);
    expect(result).toEqual({ provider: 'autodl', model: 'minimax-h3', duration: 10,
      videoUrl: 'https://media.example/generated-videos/owner/task_1.mp4',
      storageKey: 'generated-videos/owner/task_1.mp4', expiresAt: object.uploaded.getTime() + MEDIA_RETENTION_MS });
    expect(bucket.put).toHaveBeenCalledWith('generated-videos/owner/task_1.mp4', response.body, {
      onlyIf: { etagDoesNotMatch: '*' }, httpMetadata: { contentType: 'video/mp4', cacheControl: 'private, no-store' },
    });
    expect(fetchVideo).toHaveBeenCalledWith(source, expect.objectContaining({ redirect: 'manual' }));
  });

  test('HEAD reuse does not fetch again or extend the original expiry', async () => {
    const { object, bucket, fetchVideo, store } = storage();
    bucket.head.mockResolvedValue(object);
    const result = await store(task(), providerResult);
    expect(result.expiresAt).toBe(object.uploaded.getTime() + MEDIA_RETENTION_MS);
    expect(fetchVideo).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
  });

  test('concurrent conditional-put loser uses the winner’s original upload time', async () => {
    const { object, bucket, store } = storage();
    bucket.head.mockResolvedValueOnce(null).mockResolvedValueOnce(object);
    bucket.put.mockResolvedValue(null);
    expect((await store(task(), providerResult)).expiresAt).toBe(object.uploaded.getTime() + MEDIA_RETENTION_MS);
    expect(bucket.put).toHaveBeenCalledTimes(1);
  });

  test('expired or deleted old outputs are never re-created from upstream', async () => {
    const { bucket, fetchVideo, store } = storage();
    bucket.head.mockResolvedValueOnce({ size: 4, uploaded: new Date(Date.now() - MEDIA_RETENTION_MS) });
    await expect(store(task(), providerResult)).rejects.toBeInstanceOf(VideoResultExpiredError);
    await expect(store({ ...task(), createdAt: Date.now() - MEDIA_RETENTION_MS }, providerResult)).rejects.toBeInstanceOf(VideoResultExpiredError);
    expect(fetchVideo).not.toHaveBeenCalled();
    expect(bucket.put).not.toHaveBeenCalled();
  });

  test.each([
    'https://evil.example/comfyui/outputs/video.mp4',
    'https://cg-comfyui-prod.tos-cn-beijing.volces.com@127.0.0.1/comfyui/outputs/video.mp4',
    'https://cg-comfyui-prod.tos-cn-beijing.volces.com/comfyui/outputs/../private.mp4',
    'https://cg-comfyui-prod.tos-cn-beijing.volces.com/comfyui/outputs/%2e%2e/private.mp4',
    'https://cg-comfyui-prod.tos-cn-beijing.volces.com/comfyui/outputs/video.mp4#fragment',
  ])('rejects untrusted/ambiguous output URL %s before network access', async (videoUrl) => {
    const { fetchVideo, store } = storage();
    await expect(store(task(), { ...providerResult, videoUrl })).rejects.toThrow('Untrusted');
    expect(fetchVideo).not.toHaveBeenCalled();
  });

  test.each([
    { 'Content-Length': '' }, { 'Content-Length': '536870913' },
    { 'Content-Type': 'text/html' }, { 'Content-Encoding': 'gzip' },
  ])('rejects unsupported or unbounded video responses %j', async (headers) => {
    const { bucket, fetchVideo, store } = storage();
    fetchVideo.mockResolvedValue(mp4(headers));
    await expect(store(task(), providerResult)).rejects.toThrow('bounded MP4');
    expect(bucket.put).not.toHaveBeenCalled();
  });

  test('never follows redirects', async () => {
    const { bucket, fetchVideo, store } = storage();
    fetchVideo.mockResolvedValue(new Response(null, { status: 302, headers: { Location: 'http://127.0.0.1/private' } }));
    await expect(store(task(), providerResult)).rejects.toThrow('bounded MP4');
    expect(bucket.put).not.toHaveBeenCalled();
  });

  test('handles the active Compshare output host and keeps other providers compatible', async () => {
    const { store, fetchVideo } = storage();
    const compshare = { ...providerResult, provider: 'compshare' as const,
      videoUrl: 'https://compshare-files.cn-wlcb.ufileos.com/media/prod/video.mp4' };
    expect((await store({ ...task(), provider: 'compshare' }, compshare)).provider).toBe('compshare');
    fetchVideo.mockClear();
    const generic = { ...providerResult, provider: 'aliyun' as const };
    expect(await store({ ...task(), provider: 'aliyun' }, generic)).toBe(generic);
    expect(fetchVideo).not.toHaveBeenCalled();
  });
});

describe('task completion only after managed delivery', () => {
  test('stores the managed URL before marking succeeded', async () => {
    const { store } = storage();
    const completed = await refreshVideoTask('task_1', 'owner', { resultStorage: store });
    expect(completed?.result?.videoUrl).toBe('https://media.example/generated-videos/owner/task_1.mp4');
    expect(state.save).toHaveBeenCalledWith('task_1', 'owner', completed?.result);
  });

  test('copy transport failure leaves the task processing for a browser or alarm retry', async () => {
    const { store, bucket } = storage();
    bucket.put.mockRejectedValue(new Error('R2 temporary outage'));
    await expect(refreshVideoTask('task_1', 'owner', { resultStorage: store })).rejects.toThrow('R2 temporary outage');
    expect(state.task?.status).toBe('processing');
    expect(state.save).not.toHaveBeenCalled();
    expect(state.fail).not.toHaveBeenCalled();
  });

  test('expired undelivered tasks fail through the existing refund path', async () => {
    const { store } = storage();
    state.task = { ...task(), createdAt: Date.now() - MEDIA_RETENTION_MS, creditCost: 40 };
    state.refund.mockResolvedValue({ ...state.task, status: 'failed', refunded: true });
    expect((await refreshVideoTask('task_1', 'owner', { resultStorage: store }))?.refunded).toBe(true);
    expect(state.save).not.toHaveBeenCalled();
    expect(state.fail).toHaveBeenCalledWith('task_1', 'owner', 'Generated video is no longer available');
    expect(state.refund).toHaveBeenCalledWith('task_1', 'owner');
  });

  test('historical completed tasks and generic no-storage callers retain existing results', async () => {
    const store = vi.fn();
    state.task = { ...task(), status: 'succeeded', result: providerResult };
    expect((await refreshVideoTask('task_1', 'owner', { resultStorage: store }))?.result).toBe(providerResult);
    expect(store).not.toHaveBeenCalled();
    expect(state.query).not.toHaveBeenCalled();
    state.task = task();
    expect((await refreshVideoTask('task_1', 'owner'))?.result).toBe(providerResult);
  });
});
