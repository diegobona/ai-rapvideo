const AUTODL_VIDEO_HOST = 'cg-comfyui-prod.tos-cn-beijing.volces.com';
const OUTPUT_DIRECTORY = '/comfyui/outputs/';
const COMPSHARE_VIDEO_HOST = 'compshare-files.cn-wlcb.ufileos.com';
const COMPSHARE_OUTPUT_DIRECTORY = '/media/prod/';
const MAX_URL_LENGTH = 8192;

/** Restrict streaming to a known provider output location; preserve signed queries. */
function isAllowedProviderVideoUrl(value: unknown, host: string, directory: string): value is string {
  if (typeof value !== 'string' || !value || value.length > MAX_URL_LENGTH) return false;
  // URL() normalizes whitespace, backslashes and dot segments. Reject ambiguity
  // before parsing, so a differently encoded spelling cannot bypass the allowlist.
  if (/[\u0000-\u0020\u007f\\]/.test(value)) return false;
  const parts = /^https:\/\/([^/?#]+)(\/[^?#]*)(?:\?[^#]*)?$/i.exec(value);
  if (!parts) return false;
  const authority = parts[1].toLowerCase();
  if (authority !== host && authority !== `${host}:443`) return false;
  const pathname = parts[2];
  if (
    !pathname.startsWith(directory)
    || !pathname.endsWith('.mp4')
    || pathname.length <= directory.length + 4
    || pathname.includes('%')
    || pathname.includes('//')
  ) return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === host
      && (url.port === '' || url.port === '443')
      && !url.username && !url.password && !url.hash
      && url.pathname === pathname;
  } catch {
    return false;
  }
}

export function isAllowedAutoDlVideoUrl(value: unknown): value is string {
  return isAllowedProviderVideoUrl(value, AUTODL_VIDEO_HOST, OUTPUT_DIRECTORY);
}

export function isAllowedDanceVideoUrl(value: unknown): value is string {
  return isAllowedAutoDlVideoUrl(value)
    || isAllowedProviderVideoUrl(value, COMPSHARE_VIDEO_HOST, COMPSHARE_OUTPUT_DIRECTORY);
}
