import { describe, expect, test, vi } from 'vitest'
import {
  buildDanceRequest,
  DanceGenerationError,
  pollDanceTask,
  startDanceGeneration,
  startDirectDanceGeneration,
  uploadDancePhoto,
  validateDancePhoto,
} from '../../../apps/tanstack-app/src/lib/dance-generation'

describe('home dance generation', () => {
  test('direct generation sends only fixed-template photos, expression details and orientation with no checkout', async () => {
    const transport = vi.fn<typeof fetch>(async (url, options) => {
      expect(url).toBe('/api/video-generate/')
      expect(JSON.parse(String(options?.body))).toEqual({ danceTemplate: 'rumpelstiltskin-v2', dancerImageUrl: 'https://photos.test/dancer.jpg', princessImageUrl: 'https://photos.test/princess.jpg', customDescription: 'A sly grin', quickTags: ['playful'], orientation: 'portrait' })
      return Response.json({ success: true, data: { taskId: 'direct-task', status: 'processing' } })
    })
    await expect(startDirectDanceGeneration('https://photos.test/dancer.jpg', 'https://photos.test/princess.jpg', new AbortController().signal, transport, { customDescription: ' A sly grin ', quickTags: ['push-in', 'playful'], orientation: 'portrait', sceneImageUrl: 'https://photos.test/scene.png', provider: 'compshare' } as any)).resolves.toEqual({ taskId: 'direct-task', status: 'processing' })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('direct generation rejects missing task identifiers without treating the result as paid', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ success: true, data: { status: 'processing' } }))
    await expect(startDirectDanceGeneration('https://photos.test/dancer.jpg', undefined, new AbortController().signal, transport)).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  test('historical Compshare results still load after the default provider changes', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ success: true, data: { status: 'succeeded', result: { videoUrl: 'https://videos.test/compshare.mp4', provider: 'compshare', model: 'MiniMax-H3' } } }))
    await expect(pollDanceTask('historical-task', new AbortController().signal, transport)).resolves.toMatchObject({ provider: 'compshare' })
  })
  test('sends dancer identity and lets the server supply the fixed template and default princess', () => {
    expect(buildDanceRequest('https://photos.test/photo.jpg')).toEqual({
      danceTemplate: 'rumpelstiltskin-v2', dancerImageUrl: 'https://photos.test/photo.jpg',
    })
  })

  test('keeps the optional princess separate from the required dancer', () => {
    expect(buildDanceRequest('https://photos.test/photo.jpg', 'https://photos.test/princess.jpg')).toMatchObject({
      dancerImageUrl: 'https://photos.test/photo.jpg', princessImageUrl: 'https://photos.test/princess.jpg',
    })
    expect(() => buildDanceRequest('', 'https://photos.test/princess.jpg')).toThrow(DanceGenerationError)
    expect(() => buildDanceRequest('https://photos.test/photo.jpg', 'bad-url')).toThrow(DanceGenerationError)
  })

  test('rejects oversized and non-photo uploads before storage requests', () => {
    expect(validateDancePhoto(new File(['x'], 'file.svg', { type: 'image/svg+xml' }))).toBe('fileType')
    expect(validateDancePhoto(new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'photo.jpg', { type: 'image/jpeg' }))).toBe('fileSize')
    expect(validateDancePhoto(new File(['x'], 'photo.webp', { type: 'image/webp' }))).toBeNull()
  })

  test('sends photo through the existing R2 upload endpoint', async () => {
    const transport = vi.fn<typeof fetch>(async (_url, options) => {
      expect(options?.method).toBe('POST')
      const form = options?.body as FormData
      expect(form.get('provider')).toBe('r2')
      expect((form.get('file') as File).name).toBe('photo.jpg')
      return Response.json({ success: true, data: { url: 'https://photos.test/photo.jpg' } })
    })
    const url = await uploadDancePhoto(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }), new AbortController().signal, transport)
    expect(url).toBe('https://photos.test/photo.jpg')
    expect(transport.mock.calls[0][0]).toBe('/api/upload')
  })

  test('turns an unpaid purchase into a recoverable payment error', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ error: 'payment_required' }, { status: 402 }))
    await expect(startDanceGeneration('purchase-123', new AbortController().signal, transport)).rejects.toMatchObject({ code: 'paymentRequired' })
  })

  test('submits only an owned purchase identifier without client-controlled generation options', async () => {
    const transport = vi.fn<typeof fetch>(async (url, options) => {
      expect(url).toBe('/api/video-generate/')
      expect(options?.method).toBe('POST')
      expect(JSON.parse(options?.body as string)).toEqual({ purchaseId: 'purchase-123' })
      return Response.json({ success: true, data: { purchase: { id: 'purchase-123', taskId: 'task-123', state: 'processing' } } })
    })
    await expect(startDanceGeneration('purchase-123', new AbortController().signal, transport)).resolves.toEqual({ id: 'purchase-123', state: 'processing', taskId: 'task-123' })
  })

  test('identifies unauthorized upload for the sign-in redirect', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ error: 'Unauthorized' }, { status: 401 }))
    await expect(uploadDancePhoto(new File(['x'], 'photo.jpg', { type: 'image/jpeg' }), new AbortController().signal, transport)).rejects.toMatchObject({ code: 'unauthorized' })
  })

  test('rejects a success payload without a real video or task', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ success: true, data: {} }))
    await expect(startDanceGeneration('purchase-123', new AbortController().signal, transport)).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  test('polls an existing task without starting another chargeable generation', async () => {
    let checks = 0
    const transport = vi.fn<typeof fetch>(async (url) => {
      expect(url).toBe('/api/video-generate/status?taskId=task%2F123')
      checks += 1
      return Response.json({ success: true, data: checks === 1
        ? { taskId: 'task/123', status: 'processing' }
        : { taskId: 'task/123', status: 'succeeded', result: { videoUrl: 'https://videos.test/dance.mp4', provider: 'volcengine', model: 'seedance' } } })
    })
    const result = await pollDanceTask('task/123', new AbortController().signal, transport, { intervalMs: 0, maxTimeoutMs: 1000 })
    expect(result.videoUrl).toBe('https://videos.test/dance.mp4')
    expect(checks).toBe(2)
  })

  test('stops polling after abort without making another request', async () => {
    const controller = new AbortController()
    const transport = vi.fn<typeof fetch>(async () => {
      controller.abort()
      return Response.json({ success: true, data: { status: 'processing' } })
    })
    await expect(pollDanceTask('task', controller.signal, transport, { intervalMs: 0, maxTimeoutMs: 1000 })).rejects.toMatchObject({ name: 'AbortError' })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('provider failure ends polling with a generation error', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ success: true, data: { status: 'failed', error: 'provider failed' } }))
    await expect(pollDanceTask('task', new AbortController().signal, transport)).rejects.toBeInstanceOf(DanceGenerationError)
  })

  test('a missing recovered task ends polling without a new generation', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ error: 'not found' }, { status: 404 }))
    await expect(pollDanceTask('gone', new AbortController().signal, transport)).rejects.toMatchObject({ code: 'expired' })
    expect(transport).toHaveBeenCalledTimes(1)
    expect(transport.mock.calls[0][1]?.method).toBeUndefined()
  })

  test('times out without creating a replacement generation', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ success: true, data: { status: 'processing' } }))
    await expect(pollDanceTask('task', new AbortController().signal, transport, { intervalMs: 2, maxTimeoutMs: 1 })).rejects.toMatchObject({ code: 'timeout' })
    expect(transport.mock.calls.every(([url]) => String(url).startsWith('/api/video-generate/status?'))).toBe(true)
  })

  test('the polling deadline aborts a status request that never returns', async () => {
    const transport = vi.fn<typeof fetch>((_url, options) => new Promise((_resolve, reject) => {
      options?.signal?.addEventListener('abort', () => reject(options.signal?.reason), { once: true })
    }))
    await expect(pollDanceTask('task', new AbortController().signal, transport, { intervalMs: 1, maxTimeoutMs: 20 })).rejects.toMatchObject({ code: 'timeout' })
  }, 500)
})
