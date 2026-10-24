import { aiVideoConfig } from '../../config/aiVideo';
import { RAP_VIDEO_MODE, RAP_VIDEO_RESOLUTION, RAP_VIDEO_WORKFLOW_ID } from '../../config/rapVideo';
import { getApiKey } from './config';
import type { VideoGenerationOptions, VideoGenerationResult } from './types';

// Workflow input_rules and output_example verified through the official public
// GET /api/v1/comfyui/workflows/{id} endpoints (current and legacy workflows).
const API_BASE = 'https://autodl.art/api/v1/comfyui/comfyui_workflow';

type JsonObject = Record<string, unknown>;
type AutodlRequest = {
  prompt: string;
  ref_image_0: string;
  duration: number;
  resolution: string;
  seed?: number;
  mode?: typeof RAP_VIDEO_MODE;
} & Partial<Record<`ref_image_${number}` | `ref_audio_${number}`, string>>;

function asObject(value: unknown): JsonObject | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as JsonObject
    : undefined;
}

function httpUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  try {
    const url = new URL(value.trim());
    if ((url.protocol === 'https:' || url.protocol === 'http:') && !url.username && !url.password) {
      return url.href;
    }
  } catch {
    // Relative URLs and data URLs cannot be fetched by the provider.
  }
  return undefined;
}

function getAutodlConfiguration(frozenWorkflowId?: string) {
  const apiKey = getApiKey('autodl').trim();
  if (!apiKey) throw new Error('AutoDL API key is not configured. Set AUTODL_API_KEY.');
  // New requests freeze their workflow explicitly. Orders without this field
  // retain the historical workflow selection rather than following the new default.
  const workflowId = frozenWorkflowId ?? (process.env.AUTODL_VIDEO_WORKFLOW_ID?.trim() || aiVideoConfig.autodl.legacyWorkflowId);
  if (!/^[a-zA-Z0-9_.-]+$/.test(workflowId)) {
    throw new Error('AUTODL_VIDEO_WORKFLOW_ID must be a workflow identifier, not a URL');
  }
  return { apiKey, workflowId };
}

/** Server-only readiness check. Return this boolean through a server function. */
export function isAutodlVideoConfigured(): boolean {
  try {
    getAutodlConfiguration();
    return true;
  } catch {
    return false;
  }
}

function referenceImageUrls(options: VideoGenerationOptions): string[] {
  if (options.referenceImageUrls === undefined) {
    const firstFrameUrl = httpUrl(options.firstFrameUrl);
    if (!firstFrameUrl) throw new Error('AutoDL requires public HTTP(S) referenceImageUrls or firstFrameUrl');
    return [firstFrameUrl];
  }
  const references = options.referenceImageUrls;
  if (!Array.isArray(references) || references.length < 1 || references.length > aiVideoConfig.autodl.maxReferenceImages) {
    throw new Error(`AutoDL referenceImageUrls must contain 1–${aiVideoConfig.autodl.maxReferenceImages} images`);
  }
  return Array.from(references, (value, index) => {
    const url = httpUrl(value);
    if (!url) throw new Error(`AutoDL referenceImageUrls[${index}] must be a public HTTP(S) URL`);
    return url;
  });
}

function buildRequest(options: VideoGenerationOptions, workflowId: string): AutodlRequest {
  if (options.model && options.model !== aiVideoConfig.defaultModels.autodl) {
    throw new Error(`Unsupported AutoDL video model: ${options.model}`);
  }
  const prompt = typeof options.prompt === 'string' ? options.prompt.trim() : '';
  if (!prompt || prompt.length > 20000) throw new Error('AutoDL prompt must contain 1–20000 characters');
  const images = referenceImageUrls(options);
  if (options.referenceVideoUrls?.length) throw new Error('AutoDL image workflow does not accept reference videos');
  const upgraded = workflowId === aiVideoConfig.autodl.workflowId;
  const rap = workflowId === RAP_VIDEO_WORKFLOW_ID;
  const maxDuration = upgraded || rap ? 15 : aiVideoConfig.autodl.legacyMaxDuration;
  const duration = options.duration ?? aiVideoConfig.defaults.duration;
  if (!Number.isInteger(duration) || duration < 1 || duration > maxDuration) {
    throw new Error(`AutoDL duration must be an integer between 1 and ${maxDuration} seconds`);
  }
  const resolution = options.size ?? (rap ? RAP_VIDEO_RESOLUTION : aiVideoConfig.autodl.defaultResolution);
  const sizes = upgraded ? aiVideoConfig.autodlSizes : aiVideoConfig.autodlLegacySizes;
  // 803 uses explicit dimension labels, unlike both historical H3 workflows.
  // This product freezes one verified portrait output and high-quality mode.
  if (rap ? resolution !== RAP_VIDEO_RESOLUTION : !sizes.some(size => size.value === resolution)) {
    throw new Error('Unsupported AutoDL resolution');
  }
  const body: AutodlRequest = { prompt, ref_image_0: images[0], duration, resolution };
  if (rap) body.mode = RAP_VIDEO_MODE;
  images.forEach((url, index) => { body[`ref_image_${index}`] = url; });
  if (options.referenceAudioUrls !== undefined) {
    const audios = options.referenceAudioUrls;
    if (!rap || !Array.isArray(audios) || audios.length < 1 || audios.length > 3) {
      throw new Error('AutoDL referenceAudioUrls require 1–3 audio references and workflow 803');
    }
    audios.forEach((value, index) => {
      const url = httpUrl(value);
      if (!url) throw new Error(`AutoDL referenceAudioUrls[${index}] must be a public HTTP(S) URL`);
      body[`ref_audio_${index}`] = url;
    });
  }
  if (options.seed !== undefined) {
    const minSeed = upgraded || rap ? 0 : 1;
    if (!Number.isInteger(options.seed) || options.seed < minSeed || options.seed > 999999999999999) {
      throw new Error(`AutoDL seed must be an integer between ${minSeed} and 999999999999999`);
    }
    body.seed = options.seed;
  }
  return body;
}

/** Validate configuration and input before the route consumes credits. */
export function validateAutodlVideoOptions(options: VideoGenerationOptions): void {
  const { workflowId } = getAutodlConfiguration(options.workflowId);
  buildRequest(options, workflowId);
}

async function request(path: string, apiKey: string, body?: AutodlRequest): Promise<JsonObject> {
  const response = await fetch(`${API_BASE}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Authorization': apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`AutoDL API HTTP error: ${response.status}`);
  const envelope = asObject(await response.json());
  if (envelope?.code !== 'Success') {
    const message = typeof envelope?.msg === 'string' && envelope.msg ? envelope.msg : 'Request failed';
    throw new Error(`AutoDL API error: ${String(envelope?.code ?? 'invalid_response')} - ${message}`);
  }
  const data = asObject(envelope.data);
  if (!data) throw new Error('AutoDL API returned an invalid task response');
  return data;
}

export async function autodlCreateVideoTask(options: VideoGenerationOptions): Promise<string> {
  const { apiKey, workflowId } = getAutodlConfiguration(options.workflowId);
  const body = buildRequest(options, workflowId);
  const data = await request(encodeURIComponent(workflowId), apiKey, body);
  if (typeof data.task_id !== 'string' || !data.task_id.trim()) {
    throw new Error('AutoDL API did not return a task_id');
  }
  return data.task_id;
}

/** Extract only documented results URLs, excluding image and arbitrary metadata URLs. */
function getVideoUrl(results: unknown): string | undefined {
  if (!Array.isArray(results)) return undefined;
  for (const result of results) {
    if (typeof result === 'string') {
      const url = httpUrl(result);
      if (url && /\.mp4$/i.test(new URL(url).pathname)) return url;
      continue;
    }
    const item = asObject(result);
    if (!item) continue;
    if (item.output_type !== undefined && item.output_type !== 'output') continue;
    if (item.type !== undefined && item.type !== 'video') continue;
    if (item.file_type !== undefined && item.file_type !== 'mp4') continue;
    if (item.type !== 'video' && item.file_type !== 'mp4') continue;
    const url = httpUrl(item.url);
    if (url) return url;
  }
  return undefined;
}

export async function autodlQueryVideoTask(model: string, taskId: string): Promise<{
  status: 'processing' | 'succeeded' | 'failed';
  result?: VideoGenerationResult;
  errorMessage?: string;
}> {
  const apiKey = getApiKey('autodl').trim();
  if (!apiKey) throw new Error('AutoDL API key is not configured. Set AUTODL_API_KEY.');
  const data = await request(`result/${encodeURIComponent(taskId)}`, apiKey);
  const status = typeof data.status === 'string' ? data.status.toUpperCase() : '';
  if (status === 'QUEUED' || status === 'RUNNING') return { status: 'processing' };
  if (status === 'SUCCESS' || status === 'COMPLETED') {
    const videoUrl = getVideoUrl(data.results);
    return videoUrl
      ? { status: 'succeeded', result: { videoUrl, provider: 'autodl', model } }
      : { status: 'failed', errorMessage: 'AutoDL completed the task without a valid video URL' };
  }
  if (status === 'FAILED') {
    return {
      status: 'failed',
      errorMessage: typeof data.message === 'string' && data.message ? data.message : 'AutoDL video generation failed',
    };
  }
  throw new Error(`AutoDL returned an unknown task status: ${status || 'missing'}`);
}
