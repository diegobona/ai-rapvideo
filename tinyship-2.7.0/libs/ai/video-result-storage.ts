import { GENERATED_VIDEO_PREFIX, MEDIA_RETENTION_MS } from '../../config/mediaRetention';
import type { VideoGenerationResult } from './types';
import type { VideoTaskRecord } from './video-task-store';

export type VideoResultStorage = (
  task: VideoTaskRecord,
  result: VideoGenerationResult,
) => Promise<VideoGenerationResult>;

interface ManagedVideoObject {
  uploaded: Date;
  size: number;
}

/** The streaming subset of an R2 binding; no Workers-only runtime import. */
export interface ManagedVideoBucket {
  head(key: string): Promise<ManagedVideoObject | null>;
  put(key: string, body: ReadableStream<Uint8Array>, options: {
    onlyIf: { etagDoesNotMatch: string };
    httpMetadata: { contentType: string; cacheControl: string };
  }): Promise<ManagedVideoObject | null>;
}

export class VideoResultExpiredError extends Error {
  constructor() { super('Generated video is no longer available'); }
}

const MAX_VIDEO_BYTES = 512 * 1024 * 1024;
const PROVIDER_OUTPUTS = {
  autodl: { host: 'cg-comfyui-prod.tos-cn-beijing.volces.com', directory: '/comfyui/outputs/' },
  compshare: { host: 'compshare-files.cn-wlcb.ufileos.com', directory: '/media/prod/' },
} as const;

/** Keep signed query strings, but reject aliases, credentials and URL normalization. */
function trustedVideoUrl(value: string, provider: keyof typeof PROVIDER_OUTPUTS): boolean {
  if (!value || value.length > 8192 || /[\u0000-\u0020\u007f\\]/.test(value)) return false;
  const parts = /^https:\/\/([^/?#]+)(\/[^?#]*)(?:\?[^#]*)?$/i.exec(value);
  if (!parts) return false;
  const { host, directory } = PROVIDER_OUTPUTS[provider];
  if (![host, `${host}:443`].includes(parts[1].toLowerCase())) return false;
  const pathname = parts[2];
  if (!pathname.startsWith(directory) || !pathname.endsWith('.mp4')
    || pathname.length <= directory.length + 4 || pathname.includes('%') || pathname.includes('//')) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === host && (!url.port || url.port === '443')
      && !url.username && !url.password && !url.hash && url.pathname === pathname;
  } catch { return false; }
}

/**
 * Workers callers inject their binding explicitly. Generic Next/Nuxt providers
 * keep their existing result handling when no storage dependency is supplied.
 */
export function createManagedVideoResultStorage({ bucket, publicUrl, fetch: fetchVideo = fetch }: {
  bucket: ManagedVideoBucket;
  publicUrl: string;
  fetch?: typeof fetch;
}): VideoResultStorage {
  const base = publicUrl.trim().replace(/\/+$/, '');
  const parsed = new URL(base);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('Managed video storage requires a public HTTPS URL');
  }

  return async (task, result) => {
    if (task.provider !== 'autodl' && task.provider !== 'compshare') return result;
    if (!/^[A-Za-z0-9_-]+$/.test(task.userId) || !/^[A-Za-z0-9_-]+$/.test(task.id)) {
      throw new Error('Invalid managed video owner or task');
    }
    const storageKey = `${GENERATED_VIDEO_PREFIX}${task.userId}/${task.id}.mp4`;
    const managedResult = (object: ManagedVideoObject): VideoGenerationResult => {
      const expiresAt = object.uploaded.getTime() + MEDIA_RETENTION_MS;
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new VideoResultExpiredError();
      if (object.size <= 0 || object.size > MAX_VIDEO_BYTES) throw new Error('Invalid managed video size');
      // A remote provider thumbnail cannot inherit our media retention policy.
      const { coverImageUrl: _cover, ...video } = result;
      return { ...video, videoUrl: `${base}/${storageKey}`, storageKey, expiresAt };
    };

    const existing = await bucket.head(storageKey);
    if (existing) return managedResult(existing);
    // An output may have expired after a successful R2 write whose D1 transition
    // failed. Never re-create it from the provider on an old processing task.
    if (!Number.isFinite(task.createdAt) || task.createdAt + MEDIA_RETENTION_MS <= Date.now()) {
      throw new VideoResultExpiredError();
    }
    if (!trustedVideoUrl(result.videoUrl, task.provider)) throw new Error('Untrusted provider video URL');

    const response = await fetchVideo(result.videoUrl, {
      redirect: 'manual',
      headers: { 'Accept-Encoding': 'identity' },
      signal: AbortSignal.timeout(25_000),
    });
    const length = response.headers.get('content-length');
    const size = length && /^\d+$/.test(length) ? Number(length) : NaN;
    const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
    if (response.status !== 200 || !response.body || !Number.isSafeInteger(size)
      || size <= 0 || size > MAX_VIDEO_BYTES
      || !['video/mp4', 'application/octet-stream'].includes(contentType || '')
      || ![null, 'identity'].includes(response.headers.get('content-encoding'))) {
      await response.body?.cancel();
      throw new Error('Provider video response is not a bounded MP4');
    }

    // Pass the original known-length fetch body directly to R2, without buffering
    // or a TransformStream that would discard its runtime length information.
    const saved = await bucket.put(storageKey, response.body, {
      onlyIf: { etagDoesNotMatch: '*' },
      httpMetadata: { contentType: 'video/mp4', cacheControl: 'private, no-store' },
    });
    // Another poll/alarm may have won the conditional put. Its original upload
    // timestamp owns expiry; retries must never extend the retention window.
    const object = saved || await bucket.head(storageKey);
    if (!object) throw new Error('Managed video write could not be confirmed');
    return managedResult(object);
  };
}
