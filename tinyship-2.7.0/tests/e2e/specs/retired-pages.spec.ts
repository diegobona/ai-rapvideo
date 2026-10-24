import { expect, test } from '@playwright/test'

const retiredPaths = [
  '/1987-rumpelstiltskin',
  '/best-rumpelstiltskin-ai-generators',
  '/how-to-make-rumpelstiltskin-ai-video',
  '/is-rumpelstiltskin-1987-real',
  '/rumpelstiltskin-ai-video-generator',
  '/rumpelstiltskin-dance-video',
  '/rumpelstiltskin-meme',
] as const

test.describe('retired Rumpelstiltskin pages', () => {
  for (const path of retiredPaths) {
    test(`${path} returns 410 for GET and HEAD without redirecting`, async ({ request }) => {
      const responses = await Promise.all([
        request.get(path, { maxRedirects: 0 }),
        request.head(path, { maxRedirects: 0 }),
      ])

      for (const response of responses) {
        expect(response.status()).toBe(410)
        expect(response.headers().location).toBeUndefined()
        expect(response.headers()['x-robots-tag']).toMatch(/\bnoindex\b/i)
      }
      expect(await responses[1].body()).toHaveLength(0)
    })
  }

  test('www, trailing slash and query still return 410 before canonical redirects', async ({ request, baseURL }) => {
    const hostname = new URL(baseURL || 'http://localhost:7001').hostname
    test.skip(!['ai-rapvideo.co', 'www.ai-rapvideo.co'].includes(hostname), 'Public www routing is checked only against the production domain.')

    const response = await request.get('https://www.ai-rapvideo.co/rumpelstiltskin-meme/?ref=retirement-check', {
      maxRedirects: 0,
    })
    expect(response.status()).toBe(410)
    expect(response.headers().location).toBeUndefined()
    expect(response.headers()['x-robots-tag']).toMatch(/\bnoindex\b/i)
  })

  test('homepage remains available and sitemap contains only its production URL', async ({ request }) => {
    const [home, sitemap] = await Promise.all([
      request.get('/', { maxRedirects: 0 }),
      request.get('/sitemap.xml', { maxRedirects: 0 }),
    ])

    expect(home.status()).toBe(200)
    expect(home.headers().location).toBeUndefined()
    expect(sitemap.status()).toBe(200)
    expect(sitemap.headers().location).toBeUndefined()
    expect(sitemap.headers()['content-type']).toContain('xml')
    const xml = await sitemap.text()
    const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
    expect(locations).toEqual(['https://ai-rapvideo.co/'])
    expect(xml).not.toMatch(/rumpelstiltskin/i)
  })
})
