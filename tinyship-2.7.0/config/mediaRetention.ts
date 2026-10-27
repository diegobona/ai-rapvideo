/** Managed user media is eligible for automatic R2 deletion after one day. */
export const MEDIA_RETENTION_HOURS = 24;
export const MEDIA_RETENTION_MS = MEDIA_RETENTION_HOURS * 60 * 60 * 1000;
export const UPLOADED_PHOTO_PREFIX = 'uploads/';
export const GENERATED_VIDEO_PREFIX = 'generated-videos/';

const FORMER_RAP_MEDIA_ORIGIN = 'https://media.rumpelstiltskin-ai.co';
const RAP_MEDIA_ORIGIN = 'https://media.ai-rapvideo.co';

/** Both origins address the same bucket. Rewrite only exact, unsigned user-media
 * keys after this deployment explicitly switches to the new origin. Old sites
 * using the former origin retain their existing URLs and behavior. */
export function migrateRapMediaUrl(value: string, publicUrl: unknown): string {
  if (typeof publicUrl !== 'string' || publicUrl.trim().replace(/\/+$/, '') !== RAP_MEDIA_ORIGIN
    || !value.startsWith(`${FORMER_RAP_MEDIA_ORIGIN}/`) || value.length > 8192
    || /[\u0000-\u0020\u007f\\%?#]/.test(value)) return value;
  const key = value.slice(FORMER_RAP_MEDIA_ORIGIN.length + 1);
  const video = /^generated-videos\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.mp4$/.test(key);
  const photo = /^uploads\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(jpe?g|png|webp)$/i.test(key)
    && !key.includes('..');
  if (!video && !photo) return value;
  return `${RAP_MEDIA_ORIGIN}/${key}`;
}

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
    const current = migrateRapMediaUrl(value, publicUrl);
    if (!current.startsWith(prefix)) return undefined;
    const suffix = current.slice(prefix.length);
    if (!/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.mp4$/.test(suffix)) return undefined;
    return GENERATED_VIDEO_PREFIX + suffix;
  } catch { return undefined; }
}
