import { createMiddleware, createStart } from '@tanstack/react-start'
import { SITE_ORIGIN, isResourcePath, normalizePath } from '@/lib/site'
import { retiredPageResponse } from '@/lib/retired-pages'

const siteMiddleware = createMiddleware({ type: 'request' }).server(async ({ request, next }) => {
  const retired = retiredPageResponse(request)
  if (retired) return retired

  const url = new URL(request.url)
  const primaryHostname = new URL(SITE_ORIGIN).hostname
  const hostname = (request.headers.get('host') || url.host).split(':')[0].toLowerCase()
  const isPublicHost = hostname === primaryHostname || hostname === `www.${primaryHostname}`
  const isApiRequest = url.pathname === '/api' || url.pathname.startsWith('/api/')
  const pathname = isApiRequest ? url.pathname : normalizePath(url.pathname)

  if (isPublicHost && (hostname !== primaryHostname || url.protocol !== 'https:' || url.pathname !== pathname)) {
    return new Response(null, {
      status: isApiRequest ? 308 : 301,
      headers: { Location: `${SITE_ORIGIN}${pathname}${url.search}` },
    })
  }

  const result = await next()
  if (isResourcePath(pathname) || result.response.status === 404) {
    const headers = new Headers(result.response.headers)
    headers.set('X-Robots-Tag', 'noindex, follow')
    return { ...result, response: new Response(result.response.body, {
      status: result.response.status,
      statusText: result.response.statusText,
      headers,
    }) }
  }
  return result
})

export const startInstance = createStart(() => ({
  defaultSsr: true,
  requestMiddleware: [siteMiddleware],
}))
