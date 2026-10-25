import { createFileRoute } from '@tanstack/react-router'
import { withCfDb } from '@/lib/with-request-db'

export const Route = createFileRoute('/api/auth/$')({
  server: {
    handlers: {
      GET: withCfDb(async ({ request }) => {
        const path = new URL(request.url).pathname.replace(/\/+$/, '')
        if (!['/api/auth/get-session', '/api/auth/callback/google', '/api/auth/error'].includes(path)
          && !/^\/api\/auth\/reset-password\/[\w-]{16,256}$/.test(path)) {
          return Response.json({ error: 'accounts_disabled' }, { status: 404 })
        }
        const { auth } = await import('@libs/auth')
        return await auth.handler(request)
      }),
      POST: withCfDb(async ({ request }) => {
        const path = new URL(request.url).pathname.replace(/\/+$/, '')
        if (!['/api/auth/sign-in/anonymous', '/api/auth/sign-in/social', '/api/auth/sign-out',
          '/api/auth/sign-in/email', '/api/auth/sign-up/email', '/api/auth/request-password-reset', '/api/auth/reset-password'].includes(path)) {
          return Response.json({ error: 'accounts_disabled' }, { status: 404 })
        }
        const { auth } = await import('@libs/auth')
        const { videoVisitor, visitorResponse, limitTrialIp, sameOriginMutation, trialErrorResponse } = await import('@/lib/video-visitor')
        const { VideoTrialError } = await import('@libs/ai/video-trial')
        if (!sameOriginMutation(request)) return Response.json({ error: 'invalid_origin' }, { status: 403 })
        const emailFields: Record<string, string[]> = {
          '/api/auth/sign-in/email': ['email', 'password', 'rememberMe'],
          '/api/auth/sign-up/email': ['name', 'email', 'password'],
          '/api/auth/request-password-reset': ['email', 'redirectTo'],
          '/api/auth/reset-password': ['newPassword', 'token'],
        }
        if (emailFields[path]) {
          const raw = await request.clone().text()
          if (raw.length > 4096) return Response.json({ error: 'invalid_auth_request' }, { status: 413 })
          let body: Record<string, unknown> | null = null
          try { body = JSON.parse(raw) } catch { /* Invalid JSON is rejected below. */ }
          if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !emailFields[path].includes(key)))
            return Response.json({ error: 'invalid_auth_request' }, { status: 400 })
          // Never accept client-provided roles, verification status or other
          // account fields. Better Auth validates the allowed credential fields.
          if (path === '/api/auth/request-password-reset') {
            const { authEmailAvailable } = await import('@libs/auth/email-availability')
            if (!authEmailAvailable()) return Response.json({ error: 'password_reset_unavailable' }, { status: 503 })
            const { config } = await import('@config')
            const callback = new URL('/?auth=reset#rap-maker', config.app.baseUrl)
            if (body.redirectTo !== callback.href) return Response.json({ error: 'invalid_auth_callback' }, { status: 400 })
          }
        }
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
