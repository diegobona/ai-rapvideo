import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { aiVideoConfig, getVideoDurationsForProvider, getVideoSizesForProvider } from '../../../config/aiVideo';
import { calculateVideoCreditCost, createVideoTask, queryVideoTask } from '../../../libs/ai/video';
import type { VideoGenerationOptions } from '../../../libs/ai/types';

const provider = 'autodl' as const;
const options: VideoGenerationOptions = {
  provider,
  prompt: 'The person performs a cheerful original side-step dance',
  firstFrameUrl: 'https://media.example/person.webp',
  audioUrl: 'https://media.example/dance.wav',
  duration: 10,
  size: '768p竖',
};

function mockResponse(data: unknown, status = 200) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(data), { status }));
}

describe('AutoDL multi-image MiniMax H3 video', () => {
  beforeEach(() => {
    vi.stubEnv('AUTODL_API_KEY', 'test-raw-token');
    vi.stubEnv('AUTODL_VIDEO_WORKFLOW_ID', 'test-workflow');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test('uses the upgraded image workflow catalog while retaining the historical credit mapping', () => {
    expect(aiVideoConfig.defaultProvider).toBe('autodl');
    expect(calculateVideoCreditCost({ provider })).toBe(40);
    expect(getVideoSizesForProvider(provider).map(size => size.value)).toContain('768p竖');
    expect(aiVideoConfig.autodl.defaultResolution).toBe('768p横');
    expect(aiVideoConfig.autodl.maxDuration).toBe(15);
    expect(getVideoDurationsForProvider(provider)).toEqual([5, 10]);
    expect(getVideoSizesForProvider(provider).map(size => size.value)).not.toContain('1080p横');
  });

  test('submits only the verified image-and-prompt workflow fields using raw Authorization', async () => {
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'remote-task', status: 'QUEUED' } });
    vi.stubGlobal('fetch', fetch);

    expect(await createVideoTask(options)).toEqual({ provider: 'autodl', model: 'minimax-h3', providerTaskId: 'remote-task' });
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://autodl.art/api/v1/comfyui/comfyui_workflow/test-workflow');
    expect(init.headers.Authorization).toBe('test-raw-token');
    expect(JSON.parse(init.body)).toEqual({
      resolution: '768p竖',
      ref_image_0: options.firstFrameUrl,
      prompt: options.prompt,
      duration: 10,
    });
  });

  test('maps the dancer, princess and scene in order to the three reference fields', async () => {
    const referenceImageUrls = [
      'https://media.example/dancer.png',
      'https://media.example/princess.png',
      'https://media.example/scene.webp',
    ];
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'multi-image-task' } });
    vi.stubGlobal('fetch', fetch);

    await createVideoTask({ ...options, referenceImageUrls, size: undefined });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      prompt: options.prompt,
      duration: 10,
      resolution: '768p横',
      ref_image_0: referenceImageUrls[0],
      ref_image_1: referenceImageUrls[1],
      ref_image_2: referenceImageUrls[2],
    });
  });

  test.each([1, 9])('supports the documented boundary of %i ordered reference images', async count => {
    const referenceImageUrls = Array.from({ length: count }, (_, index) => `https://media.example/ref-${index}.png`);
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'multi-image-task' } });
    vi.stubGlobal('fetch', fetch);

    await createVideoTask({ ...options, firstFrameUrl: undefined, referenceImageUrls });
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(Object.keys(body).filter(key => key.startsWith('ref_image_'))).toHaveLength(count);
    referenceImageUrls.forEach((url, index) => expect(body[`ref_image_${index}`]).toBe(url));
  });

  test('rejects malformed reference arrays and duration above ten before any upstream call', async () => {
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'never-created' } });
    vi.stubGlobal('fetch', fetch);
    const invalidReferences = [
      [],
      Array.from({ length: 10 }, (_, index) => `https://media.example/${index}.png`),
      ['https://media.example/dancer.png', 'data:image/png;base64,abc'],
      ['https://media.example/dancer.png', ''],
      'https://media.example/dancer.png',
    ];
    for (const referenceImageUrls of invalidReferences) {
      await expect(createVideoTask({ ...options, referenceImageUrls } as VideoGenerationOptions)).rejects.toThrow('referenceImageUrls');
    }
    await expect(createVideoTask({ ...options, duration: 11 })).rejects.toThrow('between 1 and 10');
    await expect(createVideoTask({ ...options, duration: 9.5 })).rejects.toThrow('between 1 and 10');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('rejects incomplete configuration or media before any upstream call', async () => {
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'never-created' } });
    vi.stubGlobal('fetch', fetch);
    vi.stubEnv('AUTODL_API_KEY', '');
    await expect(createVideoTask(options)).rejects.toThrow('AUTODL_API_KEY');
    vi.stubEnv('AUTODL_API_KEY', 'test-raw-token');
    await expect(createVideoTask({ ...options, prompt: '' })).rejects.toThrow('prompt');
    await expect(createVideoTask({ ...options, firstFrameUrl: 'data:image/png;base64,abc' })).rejects.toThrow('firstFrameUrl');
    await expect(createVideoTask({ ...options, size: '720x1280' })).rejects.toThrow('resolution');
    await expect(createVideoTask({ ...options, duration: 16 })).rejects.toThrow('duration');
    expect(fetch).not.toHaveBeenCalled();
  });

  test('uses the verified workflow by default and rejects a different model for credit safety', async () => {
    vi.stubEnv('AUTODL_VIDEO_WORKFLOW_ID', '');
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'remote-task' } });
    vi.stubGlobal('fetch', fetch);
    await createVideoTask(options);
    expect(fetch.mock.calls[0][0]).toBe('https://autodl.art/api/v1/comfyui/comfyui_workflow/minimax_h3_lightx2v_v5');
    expect(() => calculateVideoCreditCost({ provider, model: 'unpriced-model' })).toThrow('Unsupported AutoDL video model');
  });

  test('freezes the upgraded workflow despite a stale environment and accepts its seed/duration boundaries', async () => {
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'upgraded-task' } });
    vi.stubGlobal('fetch', fetch);
    await createVideoTask({ ...options, workflowId: 'minimax_h3_zm_u24', duration: 15, seed: 0 });
    expect(fetch.mock.calls[0][0]).toBe('https://autodl.art/api/v1/comfyui/comfyui_workflow/minimax_h3_zm_u24');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ duration: 15, seed: 0, resolution: '768p竖' });
    expect(JSON.parse(fetch.mock.calls[0][1].body)).not.toHaveProperty('audio_url');
  });

  test('rejects unsupported upgraded resolutions and any reference video before submitting', async () => {
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'never-created' } });
    vi.stubGlobal('fetch', fetch);
    await expect(createVideoTask({ ...options, workflowId: 'minimax_h3_zm_u24', size: '1080p横' })).rejects.toThrow('resolution');
    await expect(createVideoTask({ ...options, workflowId: 'minimax_h3_zm_u24', referenceVideoUrls: ['https://media.example/ref.mp4'] })).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });

  test('keeps legacy resolution support for historical tasks without a frozen workflow', async () => {
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'old-task' } });
    vi.stubGlobal('fetch', fetch);
    await createVideoTask({ ...options, size: '1080p横' });
    expect(fetch.mock.calls[0][0]).toBe('https://autodl.art/api/v1/comfyui/comfyui_workflow/test-workflow');
    expect(JSON.parse(fetch.mock.calls[0][1].body).resolution).toBe('1080p横');
  });

  test('queries queued or running tasks without depending on workflow configuration', async () => {
    vi.stubEnv('AUTODL_VIDEO_WORKFLOW_ID', '');
    const fetch = mockResponse({ code: 'Success', data: { task_id: 'remote-task', status: 'RUNNING' } });
    vi.stubGlobal('fetch', fetch);
    expect(await queryVideoTask(provider, 'minimax-h3', 'remote-task')).toEqual({ status: 'processing' });
    expect(fetch.mock.calls[0][0]).toBe('https://autodl.art/api/v1/comfyui/comfyui_workflow/result/remote-task');
  });

  test.each(['SUCCESS', 'completed'])('maps %s to the documented video result and excludes unrelated URLs', async status => {
    vi.stubGlobal('fetch', mockResponse({ code: 'Success', data: {
      status,
      duration: 120,
      results: [
        { url: 'https://media.example/thumbnail.png', type: 'image', file_type: 'png' },
        { url: 'https://media.example/result.mp4?token=short-lived', type: 'video', file_type: 'mp4', output_type: 'output' },
      ],
    } }));
    expect(await queryVideoTask(provider, 'minimax-h3', 'remote-task')).toEqual({
      status: 'succeeded',
      result: { provider: 'autodl', model: 'minimax-h3', videoUrl: 'https://media.example/result.mp4?token=short-lived' },
    });
  });

  test('returns terminal failure for failed tasks and completed tasks without a video', async () => {
    vi.stubGlobal('fetch', mockResponse({ code: 'Success', data: { status: 'FAILED', message: 'Reference image rejected' } }));
    expect(await queryVideoTask(provider, 'minimax-h3', 'remote-task')).toEqual({ status: 'failed', errorMessage: 'Reference image rejected' });
    vi.stubGlobal('fetch', mockResponse({ code: 'Success', data: { status: 'SUCCESS', results: [{ url: 'javascript:alert(1)', type: 'video' }] } }));
    expect(await queryVideoTask(provider, 'minimax-h3', 'remote-task')).toEqual({ status: 'failed', errorMessage: 'AutoDL completed the task without a valid video URL' });
  });

  test('rejects API and HTTP errors instead of reporting successful creation', async () => {
    vi.stubGlobal('fetch', mockResponse({ code: 'InvalidToken', msg: 'Token expired' }));
    await expect(createVideoTask(options)).rejects.toThrow('Token expired');
    vi.stubGlobal('fetch', mockResponse({ code: 'Success' }, 429));
    await expect(createVideoTask(options)).rejects.toThrow('429');
  });
});
