import { expect, test } from '@playwright/test'
import { gunzipSync } from 'node:zlib'

const origin = 'https://rumpelstiltskin-ai.co'
test.use({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0' })
type Captured = { event: string; properties: Record<string, unknown> }

function decodeEvents(buffer: Buffer): Captured[] {
  let text = (buffer[0] === 31 && buffer[1] === 139 ? gunzipSync(buffer) : buffer).toString('utf8')
  if (!/^[\[{]/.test(text)) {
    const data = new URLSearchParams(text).get('data')
    if (data) text = Buffer.from(data, 'base64').toString('utf8')
  }
  const json = JSON.parse(text)
  return Array.isArray(json) ? json : Array.isArray(json.batch) ? json.batch : [json]
}

test('basic visits retain AI attribution without tracking actions', async ({ page, context, baseURL }) => {
  const events: Captured[] = []
  const unexpected: string[] = []
  // Simulate a human visit on our own site: the SDK intentionally ignores WebDriver.
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }))
  if (baseURL && new URL(baseURL).origin !== origin) {
    await context.route(`${origin}/**`, async route => {
      const url = new URL(route.request().url())
      const response = await route.fetch({ url: `${baseURL}${url.pathname}${url.search}` })
      await route.fulfill({ response })
    })
  }
  await context.route(/^https:\/\/[^/]*\.posthog\.com\//, async route => {
    const request = route.request()
    if (request.method() === 'POST' && /\/(?:e|batch)\//.test(new URL(request.url()).pathname)) {
      events.push(...decodeEvents(request.postDataBuffer()!))
    } else unexpected.push(new URL(request.url()).pathname)
    await route.fulfill({ status: 200, json: { status: 1 } })
  })
  await page.route('**/api/video-generate/', route => route.fulfill({ json: { success: true, data: { purchase: null, storageKey: 'analytics-test' } } }))
  await page.goto(`${origin}/?utm_source=chatgpt&utm_medium=ai&private_test=do-not-send#private-fragment`, { referer: 'https://chatgpt.com/' })
  await expect.poll(() => events.length, { timeout: 10000 }).toBe(1)
  expect(events[0].event).toBe('$pageview')
  expect(events[0].properties.$referring_domain).toBe('chatgpt.com')
  expect(events[0].properties.utm_source).toBe('chatgpt')
  await page.getByRole('checkbox', { name: 'I have permission to use the photos I upload.' }).check()
  await page.evaluate(() => window.history.pushState({}, '', '/rumpelstiltskin-ai-video-generator'))
  // Flush any queued unexpected events without waiting for a batching interval.
  await page.reload()
  await expect.poll(() => events.length, { timeout: 10000 }).toBe(2)
  expect(events.map(event => event.event)).toEqual(['$pageview', '$pageview'])
  expect(events[0].properties.distinct_id).toBe(events[1].properties.distinct_id)
  expect(unexpected).toEqual([])
  const serialized = JSON.stringify(events)
  for (const value of ['private_test', 'do-not-send', 'private-fragment']) expect(serialized).not.toContain(value)
})
