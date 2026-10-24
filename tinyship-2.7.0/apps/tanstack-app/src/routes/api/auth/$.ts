import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        if (new URL(request.url).pathname.replace(/\/+$/, '') !== '/api/auth/get-session') {
          return Response.json({ error: 'accounts_disabled' }, { status: 404 })
        }
        const { auth } = await import('@libs/auth')
        return await auth.handler(request)
      }),
      POST: withCfDb(async ({ request }) => {
        if (new URL(request.url).pathname.replace(/\/+$/, '') !== '/api/auth/sign-in/anonymous') {
          return Response.json({ error: 'accounts_disabled' }, { status: 404 })
        }
        const { auth } = await import('@libs/auth')
        const { videoVisitor, visitorResponse, limitTrialIp, sameOriginMutation, trialErrorResponse } = await import('@/lib/video-visitor')
        const { VideoTrialError } = await import('@libs/ai/video-trial')
        if (!sameOriginMutation(request)) return Response.json({ error: 'invalid_origin' }, { status: 403 })
        const visitor = await videoVisitor(request)
        try {
          await limitTrialIp(request, 'session')
          const response = await auth.handler(request)
          return visitorResponse(response, visitor.cookie)
        } catch (error) {
          if (error instanceof VideoTrialError) return visitorResponse(trialErrorResponse(error), visitor.cookie)
          throw error
        }
      }),
    },
  },
})
