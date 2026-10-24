/** Managed user media is eligible for automatic R2 deletion after one day. */
export const MEDIA_RETENTION_HOURS = 24;
export const MEDIA_RETENTION_MS = MEDIA_RETENTION_HOURS * 60 * 60 * 1000;
export const UPLOADED_PHOTO_PREFIX = 'uploads/';
export const GENERATED_VIDEO_PREFIX = 'generated-videos/';

export function isManagedVideoExpired(result: { expiresAt?: number } | undefined, now = Date.now()): boolean {
  return typeof result?.expiresAt === 'number' && result.expiresAt <= now;
}

/** Accept only our exact, generated output path, without signed queries or aliases. */
export function managedVideoStorageKey(value: unknown, publicUrl: unknown): string | undefined {
  if (typeof value !== 'string' || typeof publicUrl !== 'string' || value.length > 8192) return undefined;
  try {
    const base = publicUrl.trim().replace(/\/+$/, '');
    const parsed = new URL(base);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) return undefined;
    const prefix = `${base}/${GENERATED_VIDEO_PREFIX}`;
    if (!value.startsWith(prefix)) return undefined;
    const suffix = value.slice(prefix.length);
    if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.mp4$/.test(suffix)) return undefined;
    return GENERATED_VIDEO_PREFIX + suffix;
  } catch { return undefined; }
}
