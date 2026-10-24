import { describe, expect, test, vi } from 'vitest'
import {
  createDanceCheckout,
  ensureDanceSession,
  pollDancePurchase,
  readDancePurchase,
  resumeDancePurchase,
  verifyDanceCheckout,
  type PublicVideoPurchase,
} from '../../../apps/tanstack-app/src/lib/dance-generation'

const signal = () => new AbortController().signal
const purchase = (state: PublicVideoPurchase['state'] = 'processing'): PublicVideoPurchase => ({ id: 'purchase/123', state, taskId: state === 'pending' || state === 'paid' ? null : 'task-123' })
const video = { videoUrl: 'https://videos.test/dance.mp4', provider: 'autodl', model: 'seedance' }
const success = (data: unknown) => Response.json({ success: true, data })

describe('dance purchase client', () => {
  test('reads a recoverable direct task alongside the ownership key without inventing a paid purchase', async () => {
    const transport = vi.fn<typeof fetch>(async () => success({ purchase: null, storageKey: 'direct:user', directTaskId: 'direct-task' }))
    await expect(readDancePurchase(signal(), transport)).resolves.toEqual({ purchase: null, storageKey: 'direct:user', directTaskId: 'direct-task' })
  })
  test('keeps the failure reason and actual refund state in recovered purchases', async () => {
    const transport = vi.fn<typeof fetch>(async () => success({ purchase: { ...purchase('refunded'), refundStatus: 'succeeded', failureReason: 'political_figure_not_allowed' }, storageKey: 'dance:user' }))
    await expect(readDancePurchase(signal(), transport)).resolves.toMatchObject({ purchase: { state: 'refunded', refundStatus: 'succeeded', failureReason: 'political_figure_not_allowed' } })
  })
  test('reads the owned purchase without granting payment or starting generation', async () => {
    const transport = vi.fn<typeof fetch>(async () => success({ purchase: null, storageKey: 'dance:user' }))
    await expect(readDancePurchase(signal(), transport)).resolves.toEqual({ purchase: null, storageKey: 'dance:user' })
    expect(transport.mock.calls).toHaveLength(1)
    expect(transport.mock.calls[0]).toMatchObject(['/api/video-generate/', { cache: 'no-store' }])
    expect(transport.mock.calls[0][1]?.method).toBeUndefined()
  })

  test('creates a checkout with photo references and return path, leaving price server-owned', async () => {
    const transport = vi.fn<typeof fetch>(async (url, options) => {
      expect(url).toBe('/api/video-checkout/')
      expect(options?.method).toBe('POST')
      expect(JSON.parse(String(options?.body))).toEqual({ dancerImageUrl: 'https://photos.test/dancer.jpg', princessImageUrl: 'https://photos.test/princess.jpg', returnPath: '/rumpelstiltskin-dance-video' })
      return success({ purchaseId: 'purchase-1', checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123' })
    })
    await expect(createDanceCheckout('https://photos.test/dancer.jpg', 'https://photos.test/princess.jpg', '/rumpelstiltskin-dance-video', signal(), transport)).resolves.toEqual({ purchaseId: 'purchase-1', checkoutUrl: 'https://checkout.stripe.com/c/pay/cs_test_123' })
  })

  test('sends expression details but omits stale scene and incompatible camera tags from new checkout', async () => {
    const transport = vi.fn<typeof fetch>(async (_url, options) => {
      expect(JSON.parse(String(options?.body))).toEqual({
        dancerImageUrl: 'https://photos.test/dancer.jpg', returnPath: '/',
        customDescription: '坏笑', quickTags: ['playful'], orientation: 'portrait',
      })
      return success({ purchaseId: 'custom-1', checkoutUrl: 'https://checkout.stripe.com/c/pay/custom-1' })
    })
    await createDanceCheckout('https://photos.test/dancer.jpg', undefined, '/', signal(), transport, {
      customDescription: ' 坏笑 ', quickTags: ['push-in', 'playful', 'playful'], orientation: 'portrait', sceneImageUrl: 'https://photos.test/scene.png',
    })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('rejects malformed checkout redirects before navigation', async () => {
    for (const checkoutUrl of ['javascript:alert(1)', 'https://checkout.stripe.com.attacker.test/pay', 'http://checkout.stripe.com/pay']) {
      const transport = vi.fn<typeof fetch>(async () => success({ purchaseId: 'purchase-1', checkoutUrl }))
      await expect(createDanceCheckout('https://photos.test/dancer.jpg', undefined, '/', signal(), transport)).rejects.toMatchObject({ code: 'invalidResponse' })
    }
  })

  test('verifies only the returned session identifier with the server', async () => {
    const transport = vi.fn<typeof fetch>(async (url, options) => {
      expect(url).toBe('/api/video-checkout/verify')
      expect(JSON.parse(String(options?.body))).toEqual({ sessionId: 'cs_test_123' })
      return success({ purchase: purchase('paid') })
    })
    await expect(verifyDanceCheckout('cs_test_123', signal(), transport)).resolves.toEqual(purchase('paid'))
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('restores the purchased portrait selection from order recovery', async () => {
    const transport = vi.fn<typeof fetch>(async () => success({ purchase: { ...purchase(), orientation: 'portrait', sceneImageUrl: 'https://photos.test/scene.png' }, storageKey: 'dance:user' }))
    await expect(readDancePurchase(signal(), transport)).resolves.toMatchObject({ purchase: { orientation: 'portrait', sceneImageUrl: 'https://photos.test/scene.png' } })
  })

  test('keeps the owned photo previews and original creator inputs from order recovery', async () => {
    const inputs = { dancerImageUrl: 'https://photos.test/dancer.jpg', princessImageUrl: 'https://photos.test/princess.jpg', customDescription: 'A red coat', quickTags: ['playful', 'push-in'] }
    const transport = vi.fn<typeof fetch>(async () => success({ purchase: { ...purchase(), ...inputs }, storageKey: 'dance:user' }))
    await expect(readDancePurchase(signal(), transport)).resolves.toMatchObject({ purchase: inputs })
  })

  test('pending verification does not submit a generation', async () => {
    const transport = vi.fn<typeof fetch>(async () => success({ purchase: purchase('pending') }))
    const verified = await verifyDanceCheckout('cs_test_123', signal(), transport)
    await expect(resumeDancePurchase(verified, signal(), transport)).rejects.toMatchObject({ code: 'paymentPending' })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('a paid purchase starts once, then resumes through status reads', async () => {
    const transport = vi.fn<typeof fetch>(async (url, options) => {
      if (options?.method === 'POST') {
        expect(JSON.parse(String(options.body))).toEqual({ purchaseId: 'purchase/123' })
        return success({ purchase: purchase('starting') })
      }
      expect(url).toBe('/api/video-generate/status?purchaseId=purchase%2F123')
      return success({ purchase: { ...purchase('succeeded'), result: video } })
    })
    await expect(resumeDancePurchase(purchase('paid'), signal(), transport, { intervalMs: 0, maxTimeoutMs: 1000 })).resolves.toMatchObject({ state: 'succeeded', result: video })
    expect(transport.mock.calls.filter(([, options]) => options?.method === 'POST')).toHaveLength(1)
  })

  test('an already processing or successful purchase never creates another generation', async () => {
    const transport = vi.fn<typeof fetch>(async () => success({ purchase: { ...purchase('succeeded'), result: video } }))
    const completed = await resumeDancePurchase(purchase(), signal(), transport)
    await expect(resumeDancePurchase(completed, signal(), transport)).resolves.toEqual(completed)
    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport.mock.calls[0][1]?.method).toBeUndefined()
  })

  test('refund and expired states never submit or poll a new generation', async () => {
    const transport = vi.fn<typeof fetch>()
    for (const state of ['refund_pending', 'refunded', 'expired'] as const) {
      await expect(resumeDancePurchase(purchase(state), signal(), transport)).resolves.toMatchObject({ state })
    }
    expect(transport).not.toHaveBeenCalled()
  })

  test('returns the confirmed refund state from polling without replacing the video', async () => {
    const transport = vi.fn<typeof fetch>(async () => success({ purchase: { ...purchase('refund_pending'), error: 'provider_failed', refundStatus: 'pending' } }))
    await expect(pollDancePurchase('purchase/123', signal(), transport)).resolves.toMatchObject({ state: 'refund_pending', refundStatus: 'pending' })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('rejects malformed purchased results and another purchase in a status response', async () => {
    const malformed = vi.fn<typeof fetch>(async () => success({ purchase: purchase('succeeded') }))
    await expect(pollDancePurchase('purchase/123', signal(), malformed)).rejects.toMatchObject({ code: 'invalidResponse' })
    const wrong = vi.fn<typeof fetch>(async () => success({ purchase: { ...purchase('succeeded'), id: 'different', result: video } }))
    await expect(pollDancePurchase('purchase/123', signal(), wrong)).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  test('a polling deadline aborts a hanging request and remains retryable', async () => {
    const transport = vi.fn<typeof fetch>((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true })
    }))
    await expect(pollDancePurchase('purchase/123', signal(), transport, { intervalMs: 1, maxTimeoutMs: 20 })).rejects.toMatchObject({ code: 'timeout' })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('a paid task still processing after eleven minutes keeps waiting for its result', async () => {
    vi.useFakeTimers()
    let completed = false
    const settled = vi.fn()
    const transport = vi.fn<typeof fetch>(async () => success({ purchase: completed ? { ...purchase('succeeded'), result: video } : purchase() }))
    try {
      const waiting = resumeDancePurchase(purchase(), signal(), transport)
      waiting.then(settled, settled)
      await vi.advanceTimersByTimeAsync(11 * 60_000)
      expect(settled).not.toHaveBeenCalled()
      completed = true
      await vi.advanceTimersByTimeAsync(3001)
      await expect(waiting).resolves.toMatchObject({state:'succeeded',result:video})
    } finally { vi.useRealTimers() }
  })

  test('stops purchase polling immediately when the page is closed', async () => {
    const controller = new AbortController()
    const transport = vi.fn<typeof fetch>(async () => {
      controller.abort()
      return success({ purchase: purchase() })
    })
    await expect(pollDancePurchase('purchase/123', controller.signal, transport)).rejects.toMatchObject({ name: 'AbortError' })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('creates an anonymous session only when no existing user session exists', async () => {
    const transport = vi.fn<typeof fetch>(async (url) => url === '/api/auth/get-session' ? Response.json(null) : Response.json({ user: { id: 'guest-1' } }))
    await ensureDanceSession(signal(), transport)
    expect(transport.mock.calls.map(([url]) => url)).toEqual(['/api/auth/get-session', '/api/auth/sign-in/anonymous'])
    const signedIn = vi.fn<typeof fetch>(async () => Response.json({ user: { id: 'member-1' } }))
    await ensureDanceSession(signal(), signedIn)
    expect(signedIn).toHaveBeenCalledTimes(1)
  })

  test('does not accept an unpaid or unowned checkout verification as generation permission', async () => {
    for (const status of [402, 403, 404]) {
      const transport = vi.fn<typeof fetch>(async () => Response.json({ error: 'payment_required' }, { status }))
      await expect(verifyDanceCheckout('cs_test_unpaid', signal(), transport)).rejects.toMatchObject({ code: 'paymentRequired' })
      expect(transport).toHaveBeenCalledTimes(1)
      expect(transport.mock.calls[0][0]).toBe('/api/video-checkout/verify')
    }
  })

  test.each([
    [400, 'invalid_request', 'checkout'],
    [401, 'unauthorized', 'unauthorized'],
    [402, 'payment_required', 'paymentRequired'],
    [403, 'invalid_origin', 'unauthorized'],
    [404, 'not_found', 'expired'],
    [410, 'checkout_expired', 'expired'],
  ])('marks rejected checkout HTTP %s as terminal so invalid return references can be discarded', async (status, error, code) => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ error }, { status }))
    await expect(verifyDanceCheckout('cs_test_invalid', signal(), transport)).rejects.toMatchObject({ code, terminal: true })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test.each([
    [402, 'payment_pending', 'paymentPending'],
    [408, 'request_timeout', 'checkout'],
    [409, 'starting', 'checkout'],
    [425, 'too_early', 'checkout'],
    [429, 'rate_limited', 'rateLimited'],
    [503, 'video_service_unavailable', 'checkout'],
  ])('keeps checkout HTTP %s recoverable without losing the possible payment', async (status, error, code) => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ error }, { status }))
    await expect(verifyDanceCheckout('cs_test_delayed', signal(), transport)).rejects.toMatchObject({ code, terminal: false })
  })

  test('a missing purchased task is terminal while provider status outages remain recoverable', async () => {
    const missing = vi.fn<typeof fetch>(async () => Response.json({ error: 'not_found' }, { status: 404 }))
    await expect(pollDancePurchase('purchase/123', signal(), missing)).rejects.toMatchObject({ code: 'expired', terminal: true })
    const outage = vi.fn<typeof fetch>(async () => Response.json({ error: 'video_service_unavailable' }, { status: 503 }))
    await expect(pollDancePurchase('purchase/123', signal(), outage)).rejects.toMatchObject({ code: 'status', terminal: false })
  })

  test('retries an unavailable owned lookup as a read and recovers the existing purchase', async () => {
    let requests = 0
    const transport = vi.fn<typeof fetch>(async () => ++requests === 1 ? Response.json({ error: 'video_service_unavailable' }, { status: 503 }) : success({ purchase: purchase(), storageKey: 'dance:user' }))
    await expect(readDancePurchase(signal(), transport)).rejects.toMatchObject({ terminal: false })
    await expect(readDancePurchase(signal(), transport)).resolves.toMatchObject({ purchase: purchase() })
    expect(transport.mock.calls.every(([url, options]) => url === '/api/video-generate/' && !options?.method)).toBe(true)
  })
})
