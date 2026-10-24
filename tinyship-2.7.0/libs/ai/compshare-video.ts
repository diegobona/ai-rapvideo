import { aiVideoConfig } from '../../config/aiVideo';
import type { VideoFailureReason } from '../../config/videoFailure';
import { getApiKey } from './config';
import type { VideoGenerationOptions, VideoGenerationResult } from './types';

const cfg = aiVideoConfig.compshare;
type JsonObject = Record<string, unknown>;
type Content = { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string }; role: 'reference_image' | 'first_frame' | 'last_frame' }
  | { type: 'video_url'; video_url: { url: string }; role: 'reference_video' };

function object(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : undefined;
}

function contentFailure(task: JsonObject): VideoFailureReason | undefined {
  const message = object(task.error)?.message;
  if (typeof message === 'string') {
    if (/political figures?|政治人物/i.test(message)) return 'political_figure_not_allowed';
    if (/public figures?|celebrit(?:y|ies)|公众人物|名人/i.test(message)) return 'public_figure_not_allowed';
  }
  if (task.status === 'blocked') return 'content_rejected';
}

function mediaUrl(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error('A public media URL is required');
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.hash) {
    throw new Error('Media must use public HTTP(S) URLs');
  }
  return url.href;
}

function apiKey(): string {
  const key = getApiKey('compshare').trim();
  if (!key.startsWith('sk-ml-') || /\s/.test(key)) {
    throw new Error('Compshare API key is not configured. Set COMPSHARE_API_KEY.');
  }
  return key;
}

export function isCompshareVideoConfigured(): boolean {
  try { apiKey(); return true; } catch { return false; }
}

/** Converts the retained AutoDL template notation to Compshare's documented labels. */
export function compsharePrompt(prompt: string): string {
  return prompt.replace(/@Image(\d+)\b/g, '<Picture $1>')
    .replace(/@Video(\d+)\b/g, '<Video $1>')
    .replace(/@Subject(\d+)\b/g, '<Subject $1>');
}

function references(values: unknown, limit: number): string[] {
  if (values === undefined) return [];
  if (!Array.isArray(values) || values.length > limit) throw new Error('Too many reference media');
  return values.map(mediaUrl);
}

/** Only documented fields are emitted; the caller owns photo order and prompt intent. */
export function buildCompshareVideoRequest(options: VideoGenerationOptions) {
  const model = options.model ?? aiVideoConfig.defaultModels.compshare;
  if (model !== aiVideoConfig.defaultModels.compshare) throw new Error('Unsupported Compshare video model');
  const prompt = compsharePrompt(typeof options.prompt === 'string' ? options.prompt.trim() : '');
  if (!prompt || prompt.length > cfg.maxPromptLength) throw new Error('Invalid Compshare video prompt');
  const images = references(options.referenceImageUrls, cfg.maxReferenceImages);
  const videos = references(options.referenceVideoUrls, cfg.maxReferenceVideos);
  if (images.length + videos.length > cfg.maxReferenceMedia) throw new Error('Too many reference media');
  if ((images.length || videos.length) && (options.firstFrameUrl !== undefined || options.lastFrameUrl !== undefined)) {
    throw new Error('Frame inputs cannot be combined with reference media');
  }
  const duration = options.duration ?? aiVideoConfig.defaults.duration;
  if (!Number.isInteger(duration) || duration < 4 || duration > 30) throw new Error('Compshare duration must be 4–30 seconds');
  const resolution = options.size ?? cfg.defaultResolution;
  if (!aiVideoConfig.compshareSizes.some(value => value.value === resolution)) throw new Error('Unsupported Compshare resolution');
  const ratio = options.aspectRatio ?? '16:9';
  if (!['adaptive', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'].includes(ratio)) throw new Error('Unsupported Compshare ratio');
  if (options.seed !== undefined) throw new Error('Compshare seed is not exposed by this integration');
  if (options.idempotencyKey !== undefined && !/^[A-Za-z0-9_.:-]{1,128}$/.test(options.idempotencyKey)) throw new Error('Invalid submission key');
  const content: Content[] = [{ type: 'text', text: prompt }];
  for (const url of images) content.push({ type: 'image_url', image_url: { url }, role: 'reference_image' });
  for (const url of videos) content.push({ type: 'video_url', video_url: { url }, role: 'reference_video' });
  if (options.firstFrameUrl !== undefined) content.push({ type: 'image_url', image_url: { url: mediaUrl(options.firstFrameUrl) }, role: 'first_frame' });
  if (options.lastFrameUrl !== undefined) content.push({ type: 'image_url', image_url: { url: mediaUrl(options.lastFrameUrl) }, role: 'last_frame' });
  return { model, content, resolution, duration, ratio, use_context_ir: false, mute_audio: false, aigc_watermark: options.watermark ?? false };
}

export function validateCompshareVideoOptions(options: VideoGenerationOptions): void {
  apiKey();
  buildCompshareVideoRequest(options);
}

async function request(path: string, body?: ReturnType<typeof buildCompshareVideoRequest>, idempotencyKey?: string): Promise<JsonObject> {
  const response = await fetch(`${cfg.apiBase}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(body ? { 'Idempotency-Key': idempotencyKey ?? crypto.randomUUID() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
    // Workers rejects redirect: 'error' before sending the request. Manual
    // redirects plus the non-2xx check below also keep credentials on this host.
    redirect: 'manual',
  });
  if (!response.ok) throw new Error(`Compshare API HTTP error: ${response.status}`);
  const data = object(await response.json());
  if (!data || data.type === 'error' || (data.RetCode !== undefined && data.RetCode !== 0)) {
    throw new Error('Compshare API returned an invalid response');
  }
  return data;
}

export async function compshareCreateVideoTask(options: VideoGenerationOptions): Promise<string> {
  const body = buildCompshareVideoRequest(options);
  const data = await request('video_generation', body, options.idempotencyKey);
  if (typeof data.task_id !== 'string' || !data.task_id.trim()) throw new Error('Compshare API did not return a task_id');
  return data.task_id;
}

export async function compshareQueryVideoTask(model: string, taskId: string): Promise<{
  status: 'processing' | 'succeeded' | 'failed'; result?: VideoGenerationResult; errorMessage?: string;
}> {
  const data = await request(`query/video_generation/${encodeURIComponent(taskId)}`);
  const task = object(data.task);
  if (!task || task.id !== taskId) throw new Error('Compshare API returned an invalid task');
  // Observed on the live API before generation, although omitted from its status table.
  if (task.status === 'queued' || task.status === 'running' || task.status === 'moderating') return { status: 'processing' };
  // The live API uses this terminal state for rejected content, even though
  // its published status table currently omits it. It must reach refunds.
  const failureReason = contentFailure(task);
  if (task.status === 'blocked') return { status: 'failed', errorMessage: failureReason };
  if (task.status === 'failed' || task.status === 'cancelled') {
    return { status: 'failed', errorMessage: failureReason ?? (task.status === 'cancelled' ? 'Video generation was cancelled' : 'Video generation failed') };
  }
  if (task.status !== 'succeeded') throw new Error('Compshare API returned an unknown task status');
  const videoUrl = mediaUrl(object(task.content)?.url);
  return { status: 'succeeded', result: { videoUrl, provider: 'compshare', model, ...(typeof task.duration === 'number' ? { duration: task.duration } : {}) } };
}
