import { expect, test } from '@playwright/test'
import { load } from 'cheerio'
import { pageRegistry } from '../../../apps/tanstack-app/src/lib/page-registry'

const publicPages = ['/', '/privacy-policy', '/terms-of-service', '/payment-success', '/payment-cancel']

for (const pathname of publicPages) {
  test(`${pathname} has no current price gate or retired brand in HTML or attributes`, async ({ request }) => {
    const response = await request.get(pathname)
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).not.toMatch(/rumpelstiltskin/i)
    const $ = load(html)
    $('script, style').remove()
    const text = $('body').text()
    const prices = [...text.matchAll(/\$(\d+(?:\.\d{2})?)/g)].map(match => match[1])
    expect(prices, JSON.stringify(prices)).toEqual([])
    for (const element of $('[href], [src], [poster], [alt]').toArray()) {
      for (const attribute of ['href', 'src', 'poster', 'alt']) {
        expect($(element).attr(attribute) || '').not.toMatch(/rumpelstiltskin|\/images\/(?:dance|tutorial|references)\//i)
      }
    }
    expect($('a[href="mailto:support@ai-rapvideo.co"]').length).toBeGreaterThan(0)
    if (pathname === '/' || pathname === '/terms-of-service') {
      expect(text).toMatch(/free/i)
    }
    if (['/', '/privacy-policy', '/terms-of-service'].includes(pathname)) {
      expect(text).toMatch(/24 hours/)
      expect(text).toMatch(/scheduled for automatic deletion|automatic deletion is scheduled/i)
    }
  })
}

test('homepage keyword and required dual-photo FAQ are preserved', async ({ request }) => {
  const response = await request.get('/')
  const $ = load(await response.text())
  expect($('title').text()).toBe('AI Rap Video Generator – Make an AI Rap Video From Two Photos')
  expect($('h1').text()).toBe('AI Rap Video Generator')
  expect($('meta[name="description"]').attr('content')).toBe(pageRegistry.home.description)
  expect($('body').text()).toContain('Do I need to upload both photos?')
  expect($('input[type="file"][aria-required="true"]').length).toBe(2)
  expect($('video').length).toBe(5)
})

test('all removed marketing images and video are no longer served', async ({ request }) => {
  const removedAssets = [
    ...['example-barn.png', 'example-couple.png', 'example-pet.png', 'generator-demo-cover.jpg', 'step-cast.png', 'step-cast.svg', 'step-download.png', 'step-download.svg', 'step-generate.png', 'step-generate.svg', 'step-template.svg', 'step-upload.png', 'step-upload.svg'].map(file => `/images/dance/${file}`),
    ...['01-choose-photo.png', '02-dance-setting.png', '03-generate-video.png', '04-download-video.png'].map(file => `/images/tutorial/${file}`),
    ...['barn-scene.png', 'costume-reference.png', 'princess-default-v2.png', 'princess-default.png'].map(file => `/images/references/${file}`),
    '/videos/rumpelstiltskin-ai-generator-demo.mp4',
  ]
  for (const pathname of removedAssets) {
    const response = await request.head(pathname, { maxRedirects: 0 })
    expect([404, 410], pathname).toContain(response.status())
    expect(response.headers().location, pathname).toBeUndefined()
  }
})

test('unknown pages and manifest use the current brand', async ({ request }) => {
  const response = await request.get('/p3-missing-page', { maxRedirects: 0 })
  expect(response.status()).toBe(404)
  const html = await response.text()
  expect(html).toContain('AI Rap Video')
  expect(html).not.toMatch(/rumpelstiltskin/i)
  expect(response.headers()['x-robots-tag']).toMatch(/noindex/)
  const manifest = await request.get('/site.webmanifest')
  expect(manifest.status()).toBe(200)
  expect(await manifest.json()).toMatchObject({ name: 'AI Rap Video', short_name: 'AI Rap Video' })
})
