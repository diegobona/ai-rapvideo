import { expect, test } from '@playwright/test'
import { load } from 'cheerio'
import { homeCopy } from '../../../apps/tanstack-app/src/lib/home-copy'
import { pageRegistry } from '../../../apps/tanstack-app/src/lib/page-registry'
import { RAP_VIDEO_SCENES } from '../../../config/rapVideo'

test('homepage renders the four-scene free rap tool and preserves examples directly below it', async ({ request }) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  const $ = load(html)
  expect($('title').text()).toBe(pageRegistry.home.title)
  expect($('h1').text()).toBe('AI Rap Video Generator')
  expect($('#rap-maker input[type=file][aria-required=true]')).toHaveLength(2)
  expect($('#rap-maker input[type=radio]')).toHaveLength(4)
  expect($('#rap-maker textarea').attr('maxlength')).toBe('240')
  const tool = $('#rap-maker').text()
  expect(tool).toContain('12 seconds')
  expect(tool).toContain('768p portrait')
  expect(tool).toContain('Rap vocals + beat')
  expect(tool).toContain('Checking for your latest video')
  expect(tool).not.toMatch(/\$|checkout|credits|sign in|sign up/i)
  expect($('#rap-maker select')).toHaveLength(0)
  expect($('#rap-maker').find('[name*=duration], [name*=resolution]')).toHaveLength(0)
  for (const scene of RAP_VIDEO_SCENES) expect($('#rap-maker img').toArray().map(img => $(img).attr('src'))).toContain(scene.image)
  expect(html.indexOf('id="rap-maker"')).toBeLessThan(html.indexOf('id="video-examples"'))
  expect($('main h2').toArray().map(h => $(h).text())).toEqual(['AI Rap Video Examples', 'How to Make an AI Rap Video', 'What Is an AI Rap Video?', 'Who It Is For', 'Why Two Photos', 'AI Rap Video FAQ', 'Explore AI Rap Video'])
  expect($('.example-card video')).toHaveLength(5)
  for (const step of homeCopy.how.steps) expect(html).toContain(`alt="${step.alt}"`)
  expect($('.faq-item')).toHaveLength(7)
  expect($('body').text()).not.toContain('$4.99')
})

test('all four scene previews and tutorial assets are available', async ({ request }) => {
  for (const image of [...RAP_VIDEO_SCENES.map(scene => scene.image), ...homeCopy.how.steps.map(step => step.image)]) {
    const response = await request.get(image)
    expect(response.status(), image).toBe(200)
    expect(response.headers()['content-type']).toMatch(/^image\//)
    expect((await response.body()).length).toBeGreaterThan(1000)
  }
})

test('gallery controls and the tool fit mobile without adding login or payment links', async ({ page }) => {
  await page.route('**/api/video-generate/', route => route.fulfill({ json: { success: true, data: { purchase: null, storageKey: 'home-mobile' } } }))
  await page.goto('/')
  const maker = page.getByTestId('rap-maker')
  await expect(maker.getByRole('button', { name: 'Generate rap video', exact: true })).toBeVisible()
  for (const video of await page.locator('.example-card video').all()) {
    await expect(video).toHaveAttribute('controls', '')
    await expect(video).toHaveAttribute('preload', 'none')
    await expect(video).not.toHaveAttribute('autoplay', '')
  }
  await expect(maker.locator('a[href*=signin], a[href*=signup], a[href*=checkout]')).toHaveCount(0)
  await maker.screenshot({ path: 'test-results/rap-tool-desktop.png' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await maker.screenshot({ path: 'test-results/rap-tool-mobile.png' })
})

test('unavailable example videos display a useful message without redundant links', async ({ page }) => {
  await page.route(homeCopy.examples.items[0].video, route => route.abort())
  await page.route('**/api/video-generate/', route => route.fulfill({ json: { success: true, data: { purchase: null, storageKey: 'gallery' } } }))
  await page.goto('/')
  const card = page.locator('.example-card').first()
  await card.locator('video').evaluate((video: HTMLVideoElement) => video.load())
  await expect(card.getByRole('status')).toContainText('temporarily unavailable')
  await expect(card.locator('figcaption a')).toHaveCount(0)
})
