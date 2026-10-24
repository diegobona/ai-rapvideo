import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'
import { isAllowedDanceVideoUrl } from '@/lib/video-download'
import { managedVideoStorageKey, MEDIA_RETENTION_MS, GENERATED_VIDEO_PREFIX } from '../../../../../../config/mediaRetention'

const failure = (status: number, message: string) => Response.json(
  { error: 'download_failed', message },
  { status, headers: { 'Cache-Control': 'private, no-store' } },
)

export const Route = createFileRoute('/api/video-generate/download')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        try {
          const { auth } = await import('@libs/auth')
          const session = await auth.api.getSession({ headers: new Headers(request.headers) })
          if (!session?.user?.id) return failure(401, 'Authentication required')

          let body: unknown
          try { body = await request.json() } catch { return failure(400, 'Invalid request') }
          const url = body && typeof body === 'object' && 'url' in body ? body.url : undefined
          const { isWorkersRuntime } = await import('@libs/database')
          if (isWorkersRuntime) {
            const { env } = await import('cloudflare:workers')
            const key = managedVideoStorageKey(url, env.R2_PUBLIC_URL)
            if (key) {
              if (!key.startsWith(`${GENERATED_VIDEO_PREFIX}${session.user.id}/`)) return failure(404, 'Video not found')
              const object = await env.R2_BUCKET.get(key)
              if (!object) return failure(410, 'This video has expired. Please generate a new video.')
              if (object.uploaded.getTime() + MEDIA_RETENTION_MS <= Date.now()) {
                await object.body.cancel()
                return failure(410, 'This video has expired. Please generate a new video.')
              }
              return new Response(object.body, { headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': 'attachment; filename="rumpelstiltskin-ai.mp4"',
                'Cache-Control': 'private, no-store',
                'X-Content-Type-Options': 'nosniff',
              } })
            }
          }
          if (!isAllowedDanceVideoUrl(url)) return failure(400, 'Invalid video URL')

          // The signed output URL grants access to the clip. Fetch only the known
          // provider output host, without browser credentials or redirects.
          const upstream = await fetch(url, {
            method: 'GET',
            // Workers supports manual redirects; the non-2xx check rejects 3xx.
            redirect: 'manual',
            signal: AbortSignal.timeout(60_000),
          })
          const contentType = upstream.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase()
          if (!upstream.ok || !upstream.body || !contentType ||
            (!contentType.startsWith('video/') && contentType !== 'application/octet-stream')) {
            await upstream.body?.cancel()
            return failure(502, 'The video could not be downloaded. Please try again.')
          }

          return new Response(upstream.body, {
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': 'attachment; filename="rumpelstiltskin-ai.mp4"',
              'Cache-Control': 'private, no-store',
              'X-Content-Type-Options': 'nosniff',
            },
          })
        } catch {
          return failure(502, 'The video could not be downloaded. Please try again.')
        }
      }),
    },
  },
})
