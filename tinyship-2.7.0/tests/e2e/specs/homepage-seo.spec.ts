import { expect, test } from '@playwright/test'
import { load } from 'cheerio'

const title = 'AI Rap Video Generator – Make an AI Rap Video From Two Photos'
const description = 'Create an AI rap video from two photos. Choose a scene, add your topic and generate a 12-second rap video with a beat. Free to use. No account required.'
const image = 'https://ai-rapvideo.co/images/examples/rap-orange-studio.jpg'
const words = (value: string) => (value.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []).length

test('raw homepage head contains parseable application and seven exact FAQ entities', async ({ request }) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  const $ = load(await response.text())
  const scripts = $('head script[type="application/ld+json"]').toArray()
  expect(scripts).toHaveLength(1)
  const data = JSON.parse($(scripts[0]).text())
  expect(data['@context']).toBe('https://schema.org')
  const software = data['@graph'].find((item: { '@type': string }) => item['@type'] === 'SoftwareApplication')
  expect(software).toMatchObject({ name: 'AI Rap Video Generator', applicationCategory: 'MultimediaApplication', operatingSystem: 'Web', url: 'https://ai-rapvideo.co/', offers: { price: 0, priceCurrency: 'USD' } })
  const faq = data['@graph'].find((item: { '@type': string }) => item['@type'] === 'FAQPage')
  const visible = $('.faq-item').toArray().map(element => ({ question: $(element).find('h3').text(), answer: $(element).find('p').text().trim() }))
  expect(visible).toHaveLength(7)
  expect(faq.mainEntity.map((item: { name: string; acceptedAnswer: { text: string } }) => ({ question: item.name, answer: item.acceptedAnswer.text }))).toEqual(visible)
})

test('share tags match the exact title, current description and image', async ({ request }) => {
  const $ = load(await (await request.get('/')).text())
  expect($('title').text()).toBe(title)
  expect(title.length).toBe(61)
  expect($('h1').text()).toBe('AI Rap Video Generator')
  expect($('h1 + p').text()).toBe('Turn two photos into an AI rap video with original verses and a beat.')
  expect($('meta[name="description"]').attr('content')).toBe(description)
  expect($('meta[property="og:title"]').attr('content')).toBe(title)
  expect($('meta[property="og:description"]').attr('content')).toBe(description)
  expect($('meta[property="og:image"]').attr('content')).toBe(image)
  expect($('meta[property="og:image:width"]').attr('content')).toBe('1200')
  expect($('meta[property="og:image:height"]').attr('content')).toBe('630')
  expect($('meta[property="og:image:alt"]').attr('content')).toMatch(/two rappers/i)
  expect($('meta[name="twitter:card"]').attr('content')).toBe('summary_large_image')
  expect($('meta[name="twitter:title"]').attr('content')).toBe(title)
  expect($('meta[name="twitter:description"]').attr('content')).toBe(description)
  expect($('meta[name="twitter:image"]').attr('content')).toBe(image)
  expect((await request.head('/images/examples/rap-orange-studio.jpg')).status()).toBe(200)
})

test('new editorial sections are SSR, ordered and within the word budget', async ({ request }) => {
  const $ = load(await (await request.get('/')).text())
  $('script, style').remove()
  const parts: string[] = []
  function visit(node: { type: string; data?: string; children?: unknown[] }) {
    if (node.type === 'text') parts.push(node.data || '')
    else for (const child of node.children || []) visit(child as Parameters<typeof visit>[0])
  }
  visit($('main')[0])
  const count = words(parts.join(' ').replace(/\s+/gu, ' ').trim())
  expect(count).toBeGreaterThanOrEqual(900)
  expect(count).toBeLessThanOrEqual(1100)
  expect($('main h2').toArray().map(element => $(element).text())).toEqual([
    'AI Rap Video Examples', 'How to Make an AI Rap Video', 'What Is an AI Rap Video?', 'Who It Is For', 'Why Two Photos', 'AI Rap Video FAQ', 'Explore AI Rap Video',
  ])
  const explanation = $('#what-is-rap-video').parent().find('p').text()
  expect(words(explanation)).toBeGreaterThanOrEqual(80)
  expect(words(explanation)).toBeLessThanOrEqual(120)
  expect(explanation).toMatch(/AI rap song/)
  expect(explanation).toMatch(/face-swap dance video/)
  const audience = $('#who-it-is-for').parent().find('p').toArray()
  expect(audience.length).toBeGreaterThanOrEqual(3)
  expect(audience.length).toBeLessThanOrEqual(4)
  for (const element of audience) {
    expect(words($(element).text())).toBeGreaterThanOrEqual(50)
    expect(words($(element).text())).toBeLessThanOrEqual(80)
  }
})

test('five local examples include portrait and all three described anchors resolve', async ({ request }) => {
  const $ = load(await (await request.get('/')).text())
  const videos = $('.example-card video').toArray()
  expect(videos).toHaveLength(5)
  expect(videos.some(element => Number($(element).attr('height')) > Number($(element).attr('width')))).toBe(true)
  for (const element of $('.example-card').toArray()) {
    const figure = $(element)
    expect(figure.find('figcaption h3').text().trim()).not.toBe('')
    expect(figure.find('figcaption p').length).toBe(3)
    expect(figure.find('.example-details').text()).toMatch(/\d+ seconds · (?:Landscape|Portrait)/)
    expect(figure.find('.example-use-case').text()).toMatch(/^For .+\.$/)
    expect(figure.find('video').attr('src')).toMatch(/^\/videos\/examples\/rap-/)
  }
  expect($('#rap-maker').length).toBe(1)
  expect($('[class*="dance-"]').length).toBe(0)
  const cards = $('.related-card').toArray()
  expect(cards).toHaveLength(3)
  for (const card of cards) {
    const href = $(card).find('a').attr('href') || ''
    expect(href).toMatch(/^#/)
    expect($(href).length).toBe(1)
    const copy = $(card).find('.related-description').text()
    expect(words(copy)).toBeGreaterThan(0)
    expect(words(copy)).toBeLessThanOrEqual(15)
  }
  const sitemap = await request.get('/sitemap.xml')
  expect([...(await sitemap.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])).toEqual(['https://ai-rapvideo.co/'])
})
