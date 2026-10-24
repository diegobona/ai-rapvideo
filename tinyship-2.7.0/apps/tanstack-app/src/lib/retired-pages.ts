import { normalizePath } from './site'
import { siteCopy } from './site-copy'

const retiredPagePaths = new Set([
  '/1987-rumpelstiltskin',
  '/best-rumpelstiltskin-ai-generators',
  '/how-to-make-rumpelstiltskin-ai-video',
  '/is-rumpelstiltskin-1987-real',
  '/rumpelstiltskin-ai-video-generator',
  '/rumpelstiltskin-dance-video',
  '/rumpelstiltskin-meme',
])

export function isRetiredPagePath(path: string): boolean {
  return retiredPagePaths.has(normalizePath(path).toLowerCase())
}

/** Retired URLs terminate before page rendering or canonical redirects. */
export function retiredPageResponse(request: Request): Response | null {
  if (!isRetiredPagePath(new URL(request.url).pathname)) return null

  return new Response(request.method === 'HEAD' ? null : siteCopy.removed.message, {
    status: 410,
    statusText: 'Gone',
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Robots-Tag': 'noindex, follow',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
