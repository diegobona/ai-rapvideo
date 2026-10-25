import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        if (!['/api/auth/get-session', '/api/auth/callback/google', '/api/auth/error'].includes(new URL(request.url).pathname.replace(/\/+$/, ''))) {
          return Response.json({ error: 'accounts_disabled' }, { status: 404 })
        }
        const { auth } = await import('@libs/auth')
        return await auth.handler(request)
      }),
      POST: withCfDb(async ({ request }) => {
        const path = new URL(request.url).pathname.replace(/\/+$/, '')
        if (!['/api/auth/sign-in/anonymous', '/api/auth/sign-in/social', '/api/auth/sign-out'].includes(path)) {
          return Response.json({ error: 'accounts_disabled' }, { status: 404 })
        }
        const { auth } = await import('@libs/auth')
        const { videoVisitor, visitorResponse, limitTrialIp, sameOriginMutation, trialErrorResponse } = await import('@/lib/video-visitor')
        const { VideoTrialError } = await import('@libs/ai/video-trial')
        if (!sameOriginMutation(request)) return Response.json({ error: 'invalid_origin' }, { status: 403 })
        if (path === '/api/auth/sign-in/social') {
          const body = await request.clone().json().catch(() => null)
          const allowed = ['provider', 'callbackURL', 'newUserCallbackURL', 'errorCallbackURL', 'disableRedirect']
          if (!body || typeof body !== 'object' || Array.isArray(body) || body.provider !== 'google' || Object.keys(body).some(key => !allowed.includes(key)))
            return Response.json({ error: 'invalid_google_signin' }, { status: 400 })
        }
        const visitor = await videoVisitor(request)
        try {
          if (path !== '/api/auth/sign-out') await limitTrialIp(request, 'session')
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
