import { expect, test } from '@playwright/test'
import { homeCopy } from '../../../apps/tanstack-app/src/lib/home-copy'

test('video submission reaches the POST handler without a page canonical redirect', async ({ request }) => {
  const response = await request.post('/api/video-generate/', { data: {}, maxRedirects: 0 })
  expect(response.status()).toBe(401)
  expect((await response.json()).error).toMatch(/^unauthorized$/i)
})

const origin = 'https://ai-rapvideo.co'

test('homepage serves its heading, body and one query-free canonical in raw HTML', async ({ request }) => {
  const response = await request.get('/?utm_source=verification')
  expect(response.status()).toBe(200)
  const html = await response.text()
  expect(html).toMatch(/<h1\b[^>]*>AI Rap Video Generator<\/h1>/)
  expect(html).toContain(homeCopy.intro)
  expect(html).toContain('<html lang="en"')
  expect(html.match(/<link\b[^>]*rel="canonical"[^>]*>/g)).toHaveLength(1)
  expect(html).toContain(`href="${origin}/"`)
  expect(html).not.toMatch(/<meta\b[^>]*name="keywords"/i)
  expect(html).toMatch(/<meta\b[^>]*name="robots"[^>]*content="index, follow"/)
})

test('www requests permanently redirect to the apex and preserve path and query', async ({ request, baseURL }) => {
  // Wrangler rewrites Host in local preview. A second local upstream exercises
  // the production www host without deploying or depending on public DNS.
  const wwwBase = process.env.SEO_TEST_WWW_BASE_URL || ''
  const production = new URL(baseURL || 'http://localhost:7001').hostname.endsWith('ai-rapvideo.co')
  test.skip(!production && !wwwBase, 'www canonical routing requires the production host or a dedicated local www upstream.')
  const response = await request.get(`${production ? 'https://www.ai-rapvideo.co' : wwwBase}/signin?returnTo=%2Faccount`, {
    headers: { Host: 'www.ai-rapvideo.co' },
    maxRedirects: 0,
  })
  expect(response.status()).toBe(301)
  expect(response.headers().location).toBe(`${origin}/signin?returnTo=%2Faccount`)
})

test('robots allows every directory and points at the canonical sitemap', async ({ request }) => {
  const response = await request.get('/robots.txt')
  expect(response.status()).toBe(200)
  const text = await response.text()
  expect(text).toContain('User-agent: *')
  expect(text).toContain('Allow: /')
  expect(text).not.toMatch(/Disallow:\s*\S/)
  expect(text).toContain('Sitemap: https://ai-rapvideo.co/sitemap.xml')
})

test('sitemap contains only the AI Rap Video homepage and excludes legacy pages', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  expect(response.headers()['content-type']).toContain('xml')
  const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
  expect(locations).toEqual(['https://ai-rapvideo.co/'])
  expect(xml).not.toMatch(/rumpelstiltskin/i)
})

for (const path of ['/payment-success', '/payment-cancel']) {
  test(`${path} is SSR, canonical and noindex`, async ({ request }) => {
    const response = await request.get(`${path}?utm_source=verification`)
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toMatch(/<h1\b/)
    expect(html).toMatch(/<meta\b[^>]*name="robots"[^>]*content="noindex, follow"/)
    expect(html.match(/<link\b[^>]*rel="canonical"[^>]*>/g)).toHaveLength(1)
    expect(html).toContain(`href="${origin}${path}"`)
    expect(html).not.toMatch(/<meta\b[^>]*name="keywords"/i)
  })
}

test('retired account pages redirect home and account endpoints are disabled', async ({ request }) => {
  for (const pathname of ['/signin', '/signup', '/forgot-password', '/reset-password', '/cellphone', '/wechat']) {
    const response = await request.get(pathname, { maxRedirects: 0 })
    expect(response.status()).toBe(301)
    expect(response.headers().location).toBe('/')
  }
  for (const endpoint of ['sign-up/email', 'sign-in/email', 'sign-in/social', 'forget-password', 'sign-out']) {
    const response = await request.post(`/api/auth/${endpoint}`, { data: {} })
    expect(response.status()).toBe(404)
    expect(await response.json()).toEqual({ error: 'accounts_disabled' })
  }
})

test('unknown pages return a server-rendered 404 and a home link', async ({ request }) => {
  const response = await request.get('/does-not-exist?query=ignored')
  expect(response.status()).toBe(404)
  const html = await response.text()
  expect(html).toMatch(/<h1\b[^>]*>Page not found<\/h1>/)
  expect(html).toContain('AI Rap Video')
  expect(html).toContain(`href="${origin}/does-not-exist"`)
  expect(html).toMatch(/name="robots"[^>]*content="noindex, follow"/)
})

test('localized demo pages are no longer registered', async ({ request }) => {
  for (const path of ['/en', '/zh-CN', '/en/video-generate']) {
    const response = await request.get(path, { maxRedirects: 0 })
    expect(response.status()).toBe(404)
  }
})
