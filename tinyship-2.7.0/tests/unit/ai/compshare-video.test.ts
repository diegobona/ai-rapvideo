import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { buildCompshareVideoRequest, compshareCreateVideoTask, compshareQueryVideoTask, isCompshareVideoConfigured } from '../../../libs/ai/compshare-video';
import { createVideoTask, queryVideoTask, validateVideoGenerationOptions } from '../../../libs/ai/video';
import type { VideoGenerationOptions } from '../../../libs/ai/types';

const options: VideoGenerationOptions = {
  provider: 'compshare', model: 'MiniMax-H3', prompt: '@Subject1 from @Image1 dances while @Subject2 from @Image2 watches, in @Image3. Follow @Video1.',
  referenceImageUrls: ['https://media.test/dancer.png', 'https://media.test/princess.png', 'https://media.test/scene.png'],
  referenceVideoUrls: ['https://media.test/motion.mp4'], duration: 10, size: '768P', aspectRatio: '9:16', idempotencyKey: 'dance-purchase-one',
};

describe('Compshare native video adapter', () => {
  beforeEach(() => vi.stubEnv('COMPSHARE_API_KEY', 'sk-ml-unit-fixture'));
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  test('submits ordered image/video references with the documented labels, roles and stable payment key', async () => {
    const transport = vi.fn(async () => Response.json({ task_id: 'cp-task' }));
    vi.stubGlobal('fetch', transport);
    await expect(createVideoTask(options)).resolves.toEqual({ provider: 'compshare', model: 'MiniMax-H3', providerTaskId: 'cp-task' });
    expect(transport).toHaveBeenCalledTimes(1);
    expect(transport.mock.calls[0][0]).toBe('https://cp.compshare.cn/minimax/v2/video_generation');
    const init = transport.mock.calls[0][1];
    expect(init.headers).toMatchObject({ Authorization: 'Bearer sk-ml-unit-fixture', 'Idempotency-Key': 'dance-purchase-one' });
    expect(init.redirect).toBe('manual');
    expect(JSON.parse(init.body as string)).toEqual({
      model: 'MiniMax-H3', duration: 10, resolution: '768P', ratio: '9:16', use_context_ir: false, mute_audio: false, aigc_watermark: false,
      content: [
        { type: 'text', text: '<Subject 1> from <Picture 1> dances while <Subject 2> from <Picture 2> watches, in <Picture 3>. Follow <Video 1>.' },
        ...options.referenceImageUrls!.map(url => ({ type: 'image_url', image_url: { url }, role: 'reference_image' })),
        { type: 'video_url', video_url: { url: options.referenceVideoUrls![0] }, role: 'reference_video' },
      ],
    });
  });

  test('missing credentials block validation before any chargeable request', async () => {
    vi.stubEnv('COMPSHARE_API_KEY', '');
    const transport = vi.fn(); vi.stubGlobal('fetch', transport);
    expect(isCompshareVideoConfigured()).toBe(false);
    expect(() => validateVideoGenerationOptions(options)).toThrow('COMPSHARE_API_KEY');
    await expect(compshareCreateVideoTask(options)).rejects.toThrow('COMPSHARE_API_KEY');
    expect(transport).not.toHaveBeenCalled();
  });

  test.each([
    { model: 'wrong' }, { size: '768p' }, { aspectRatio: 'tall' }, { duration: 3 }, { duration: 31 },
    { referenceVideoUrls: ['file:///tmp/clip.mp4'] }, { referenceVideoUrls: Array(4).fill('https://media.test/a.mp4') },
    { referenceImageUrls: Array(10).fill('https://media.test/a.png') },
    { firstFrameUrl: 'https://media.test/first.png' }, { prompt: 'x'.repeat(7001) },
    { idempotencyKey: 'bad\nkey' },
  ])('rejects malformed provider options before network submission: %j', async extra => {
    const transport = vi.fn(); vi.stubGlobal('fetch', transport);
    await expect(compshareCreateVideoTask({ ...options, ...extra })).rejects.toThrow();
    expect(transport).not.toHaveBeenCalled();
  });

  test('the image-only default and explicit first-frame mode remain distinct', () => {
    const imageOnly = buildCompshareVideoRequest({ ...options, referenceVideoUrls: undefined });
    expect(imageOnly.content.filter(item => item.type === 'image_url').map(item => item.role)).toEqual(Array(3).fill('reference_image'));
    const frame = buildCompshareVideoRequest({ ...options, referenceImageUrls: undefined, referenceVideoUrls: undefined, firstFrameUrl: 'https://media.test/first.png' });
    expect(frame.content[1]).toMatchObject({ role: 'first_frame' });
  });

  test.each(['queued', 'running', 'moderating'])('treats %s as processing and queries only the requested task', async status => {
    const transport = vi.fn(async () => Response.json({ task: { id: 'task/a', status } }));
    vi.stubGlobal('fetch', transport);
    await expect(queryVideoTask('compshare', 'MiniMax-H3', 'task/a')).resolves.toEqual({ status: 'processing' });
    expect(transport.mock.calls[0][0]).toBe('https://cp.compshare.cn/minimax/v2/query/video_generation/task%2Fa');
    expect(transport.mock.calls[0][1].method).toBe('GET');
  });

  test('maps the documented success response and preserves the provider identity for later downloads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ task: { id: 'cp-one', status: 'succeeded', duration: 10, content: { url: 'https://media.test/result.mp4' } } })));
    await expect(compshareQueryVideoTask('MiniMax-H3', 'cp-one')).resolves.toEqual({ status: 'succeeded', result: { provider: 'compshare', model: 'MiniMax-H3', duration: 10, videoUrl: 'https://media.test/result.mp4' } });
  });

  test.each(['failed', 'cancelled', 'blocked'])('maps terminal state %s for the existing cash-refund path', async status => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ task: { id: 'cp-one', status } })));
    await expect(compshareQueryVideoTask('MiniMax-H3', 'cp-one')).resolves.toMatchObject({ status: 'failed' });
  });

  test('a blocked response ends processing without exposing provider moderation details to the browser', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ task: {
      id: 'cp-one', status: 'blocked', error: { code: 'generation_failed', message: 'Private provider moderation details' },
    } })));
    await expect(compshareQueryVideoTask('MiniMax-H3', 'cp-one')).resolves.toEqual({
      status: 'failed', errorMessage: 'content_rejected',
    });
  });

  test.each([
    ['blocked', 'Realistic synthetic media depicting real, identifiable political figures is disallowed.', 'political_figure_not_allowed'],
    ['failed', 'The request features the likenesses of identifiable public figures.', 'public_figure_not_allowed'],
  ])('retains an actionable reason for %s without publishing the raw provider response', async (status, message, reason) => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json({ task: { id: 'cp-one', status, error: { message } } })));
    await expect(compshareQueryVideoTask('MiniMax-H3', 'cp-one')).resolves.toEqual({ status: 'failed', errorMessage: reason });
  });

  test.each([
    { task: { id: 'someone-else', status: 'succeeded', content: { url: 'https://media.test/private.mp4' } } },
    { task: { id: 'cp-one', status: 'unknown' } },
    { task: { id: 'cp-one', status: 'succeeded', content: {} } },
    { RetCode: 8039, Message: 'job not found' },
  ])('keeps ambiguous responses retryable instead of declaring a successful or failed video: %j', async body => {
    vi.stubGlobal('fetch', vi.fn(async () => Response.json(body)));
    await expect(compshareQueryVideoTask('MiniMax-H3', 'cp-one')).rejects.toThrow();
  });

  test('an HTTP outage never retries or silently submits to AutoDL', async () => {
    const transport = vi.fn(async () => new Response('provider diagnostic', { status: 503 }));
    vi.stubGlobal('fetch', transport);
    await expect(createVideoTask(options)).rejects.toThrow('HTTP error: 503');
    expect(transport).toHaveBeenCalledTimes(1);
  });

  test('rejects a redirect without forwarding credentials or following another host', async () => {
    const transport = vi.fn(async () => new Response(null, { status: 302, headers: { Location: 'https://other.test/' } }));
    vi.stubGlobal('fetch', transport);
    await expect(createVideoTask(options)).rejects.toThrow('HTTP error: 302');
    expect(transport).toHaveBeenCalledOnce();
    expect(transport.mock.calls[0][1].redirect).toBe('manual');
  });
});
