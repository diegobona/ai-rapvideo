export const SITE_ORIGIN = 'https://ai-rapvideo.co'
export const SITE_NAME = 'AI Rap Video'

/** A pathname shared by canonical links, redirects and sitemap entries. */
export function normalizePath(input: string): string {
  const value = input.trim() || '/'
  let pathname = value

  if (/^https?:\/\//i.test(value)) {
    pathname = new URL(value).pathname
  } else if (/^\/\/(?:www\.)?ai-rapvideo\.co(?:[/?#]|$)/i.test(value)) {
    pathname = new URL(`https:${value}`).pathname
  } else {
    pathname = value.split(/[?#]/, 1)[0]
  }

  const cleanPath = `/${pathname.replace(/\\/g, '/').replace(/^\/+/, '')}`.replace(/\/{2,}/g, '/')
  const resolvedPath = new URL(cleanPath, SITE_ORIGIN).pathname
  return resolvedPath === '/' ? '/' : resolvedPath.replace(/\/+$/, '')
}

/** Always use the production apex domain, including for www or preview URLs. */
export function normalizeCanonical(input: string): string {
  return `${SITE_ORIGIN}${normalizePath(input)}`
}

/** These URLs support account/system flows and should never appear in search. */
export function isResourcePath(input: string): boolean {
  const pathname = normalizePath(input).toLowerCase()
  return /^\/(?:api|auth|oauth|callback|signin|sign-in|signup|sign-up|login|logout|forgot-password|reset-password|verify-email|email-verification|cellphone|wechat|payment|payment-success|payment-cancel|checkout|pricing|privacy|privacy-policy|terms|terms-of-service|dashboard|admin|account|settings|profile|billing|subscription|credits|upload|404|not-found|_server|_serverfn)(?:\/|$)/.test(pathname)
    || pathname === '/robots.txt'
    || pathname === '/sitemap.xml'
}

export function robotsText(): string {
  return `User-agent: *\nAllow: /\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`
}
