import { describe, expect, test, vi } from 'vitest'
import { downloadRapVideo, resolveRapRecoveryTask, startRapGeneration, uploadRapPhoto, validateRapPhoto } from '../../../apps/tanstack-app/src/lib/rap-generation'
const lyrics = { language: 'en' as const, lines: ['We bring sunshine every day', 'Watch our worries fade away', 'Two bright stars across the night', 'Keep our friendship burning bright'] as [string, string, string, string] }
const voices: ['female', 'male'] = ['female', 'male']

describe('rap maker client', () => {
  test('accepts supported photos through 20 MB and rejects invalid or larger files', () => {
    expect(validateRapPhoto(new File([new Uint8Array(20 * 1024 * 1024)], 'portrait.jpg', { type: 'image/jpeg' }))).toBeNull()
    expect(validateRapPhoto(new File([new Uint8Array(20 * 1024 * 1024 + 1)], 'portrait.png', { type: 'image/png' }))).toBe('fileSize')
    expect(validateRapPhoto(new File(['<svg/>'], 'portrait.svg', { type: 'image/svg+xml' }))).toBe('fileType')
    expect(validateRapPhoto(new File([], 'portrait.jpg', { type: 'image/jpeg' }))).toBe('fileType')
  })

  test('uploads through the existing owned R2 photo endpoint', async () => {
    const transport = vi.fn<typeof fetch>(async (url, options) => {
      expect(url).toBe('/api/upload')
      expect(options?.method).toBe('POST')
      const body = options?.body as FormData
      expect(body.get('provider')).toBe('r2')
      expect((body.get('file') as File).name).toBe('one.webp')
      return Response.json({ success: true, data: { url: 'https://photos.test/one.webp' } })
    })
    await expect(uploadRapPhoto(new File(['photo'], 'one.webp', { type: 'image/webp' }), new AbortController().signal, transport)).resolves.toBe('https://photos.test/one.webp')
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('submits the two people, scene and topic without client provider, checkout or output controls', async () => {
    const transport = vi.fn<typeof fetch>(async (url, options) => {
      expect(url).toBe('/api/video-generate/')
      expect(options?.method).toBe('POST')
      expect(JSON.parse(String(options?.body))).toEqual({
        rapTemplate: 'rap-duo-v1', personOneImageUrl: 'https://photos.test/one.jpg',
        personTwoImageUrl: 'https://photos.test/two.jpg', scene: 'studio-booth', topic: 'Birthday legends', lyrics, voices,
      })
      return Response.json({ success: true, data: { taskId: 'rap-task-1', status: 'processing' } })
    })
    await expect(startRapGeneration({ personOneImageUrl: 'https://photos.test/one.jpg', personTwoImageUrl: 'https://photos.test/two.jpg', scene: 'studio-booth', topic: ' Birthday legends ', lyrics, voices }, new AbortController().signal, transport)).resolves.toEqual({ taskId: 'rap-task-1', status: 'processing' })
    expect(transport).toHaveBeenCalledTimes(1)
  })

  test('rejects unsupported requests before a chargeable generation request', async () => {
    const transport = vi.fn<typeof fetch>()
    const request = { personOneImageUrl: 'https://photos.test/one.jpg', personTwoImageUrl: 'https://photos.test/two.jpg', scene: 'hotel-lobby' as const, topic: '', lyrics, voices }
    await expect(startRapGeneration({ ...request, personTwoImageUrl: '' }, new AbortController().signal, transport)).rejects.toMatchObject({ code: 'photoRequired' })
    await expect(startRapGeneration({ ...request, topic: 'a'.repeat(241) }, new AbortController().signal, transport)).rejects.toMatchObject({ code: 'topicTooLong' })
    expect(transport).not.toHaveBeenCalled()
  })

  test('does not accept a successful submission without a recoverable task identifier', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ success: true, data: { status: 'processing' } }))
    await expect(startRapGeneration({ personOneImageUrl: 'https://photos.test/one.jpg', personTwoImageUrl: 'https://photos.test/two.jpg', scene: 'hotel-lobby', topic: '', lyrics, voices }, new AbortController().signal, transport)).rejects.toMatchObject({ code: 'invalidResponse' })
  })

  test('marks explicit client rejection as safe to correct without recovering an old successful task', async () => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ error: 'invalid_rap_request' }, { status: 400 }))
    await expect(startRapGeneration({ personOneImageUrl: 'https://photos.test/one.jpg', personTwoImageUrl: 'https://photos.test/two.jpg', scene: 'hotel-lobby', topic: '', lyrics, voices }, new AbortController().signal, transport)).rejects.toMatchObject({ code: 'generation', submissionRejected: true })
  })

  test.each([408, 409, 500])('keeps an HTTP %i submission ambiguous instead of allowing another POST', async status => {
    const transport = vi.fn<typeof fetch>(async () => Response.json({ error: 'busy' }, { status }))
    await expect(startRapGeneration({ personOneImageUrl: 'https://photos.test/one.jpg', personTwoImageUrl: 'https://photos.test/two.jpg', scene: 'hotel-lobby', topic: '', lyrics, voices }, new AbortController().signal, transport)).rejects.toMatchObject({ submissionRejected: false })
  })

  test('does not identify the previous completed video as the new submission result', () => {
    expect(resolveRapRecoveryTask(null, 'previous-task', 'previous-task')).toBeNull()
    expect(resolveRapRecoveryTask('previous-task', null, 'previous-task')).toBeNull()
    expect(resolveRapRecoveryTask('new-task', 'previous-task', 'previous-task')).toBe('new-task')
    expect(resolveRapRecoveryTask(null, 'current-task', null)).toBe('current-task')
  })

  test('downloads the stored result without posting another generation', async () => {
    const transport = vi.fn<typeof fetch>(async (url, options) => {
      expect(url).toBe('/api/video-generate/download')
      expect(options?.method).toBe('POST')
      expect(JSON.parse(String(options?.body))).toEqual({ url: 'https://videos.test/stored.mp4' })
      return new Response(new Blob(['video'], { type: 'video/mp4' }))
    })
    await expect(downloadRapVideo('https://videos.test/stored.mp4', new AbortController().signal, transport)).resolves.toMatchObject({ type: 'video/mp4', size: 5 })
    expect(transport).toHaveBeenCalledTimes(1)
  })
})
