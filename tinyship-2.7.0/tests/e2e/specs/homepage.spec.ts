import { expect, test } from '@playwright/test'
import { pageRegistry, moreAiVideoTools, registeredSitemapPaths } from '../../../apps/tanstack-app/src/lib/page-registry'
import { homeCopy } from '../../../apps/tanstack-app/src/lib/home-copy'

test('home metadata, heading order, copy, images and exact six internal links are SSR', async ({ request }) => {
  const response = await request.get('/')
  expect(response.status()).toBe(200)
  const html = await response.text()
  const content = html.split('<body')[1].split('<script')[0]
  expect(html).toContain(`<title>${pageRegistry.home.title}</title>`)
  expect(html).toContain(`name="description" content="${pageRegistry.home.description}"`)
  expect(html.match(/<h1\b/g)).toHaveLength(1)
  expect(html.match(/<h2\b[^>]*>(.*?)<\/h2>/g)?.map((tag) => tag.replace(/<[^>]+>/g, ''))).toEqual([
    'How to Make a Rumpelstiltskin AI Video',
    'Rumpelstiltskin AI Video Examples',
    'Rumpelstiltskin AI FAQ',
    'More AI Video Tools',
  ])
  expect(content.indexOf(pageRegistry.home.h1)).toBeLessThan(content.indexOf('id="dance-maker"'))
  expect(content.indexOf('id="dance-maker"')).toBeLessThan(content.indexOf(homeCopy.intro))
  for (const label of [homeCopy.tool.photoLabel, homeCopy.tool.choosePhoto, homeCopy.tool.princessLabel, homeCopy.tool.generateButton, homeCopy.tool.resultTitle, homeCopy.tool.downloadButton]) expect(content).toContain(label)
  for (const step of homeCopy.how.steps) expect(content).toContain(`alt="${step.alt}"`)
  for (const example of homeCopy.examples.items) {
    expect(content).toContain(`src="${example.video}"`)
    expect(content).toContain(`poster="${example.poster}"`)
    expect(content).toContain(`aria-label="${example.title}"`)
  }
  for (const item of homeCopy.faq.items) expect(content).toContain(item.question)
  const related = content.split('id="more-video-tools"')[1]
  expect(related.match(/<h3\b/g)).toHaveLength(6)
  let previous = -1
  for (const item of moreAiVideoTools) {
    const anchor = `<a href="${item.href}">${item.anchorText}</a>`
    expect(related).toContain(anchor)
    expect(related.indexOf(anchor)).toBeGreaterThan(previous)
    previous = related.indexOf(anchor)
  }
  expect(related).not.toMatch(/nofollow|target="_blank"/)
  expect(html).not.toMatch(/<meta\b[^>]*name="keywords"/)
  expect(registeredSitemapPaths(['/'])).toEqual(['/'])
})

test('tutorial illustrations load', async ({ request }) => {
  for (const step of homeCopy.how.steps) {
    const response = await request.get(step.image)
    expect(response.status()).toBe(200)
    if (step.image.endsWith('.svg')) expect(await response.text()).toContain('<svg')
    else {
      const bytes = await response.body()
      expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(300)
      expect(bytes.readUInt32BE(20)).toBeGreaterThanOrEqual(300)
    }
  }
})

test('three gallery videos follow the heading directly and fit mobile without added credits', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('dance-refund-guarantee')).toBeVisible()
  await expect(page.getByTestId('dance-refund-guarantee')).toHaveText(homeCopy.tool.refundGuarantee)
  const maker = page.getByTestId('dance-maker')
  await expect(maker).toContainText('$4.99')
  await expect(maker).not.toContainText(/temporar(?:y|ily) free|free access|no payment required/i)
  const privacy = page.getByTestId('dance-media-privacy')
  await expect(privacy).toContainText('Cloudflare')
  await expect(privacy).toContainText('24 hours')
  await expect(maker.getByText(homeCopy.tool.customization.hint, { exact: true })).toHaveCount(0)
  await expect(maker.getByText(homeCopy.tool.fidelityHint, { exact: true })).toHaveCount(0)
  await expect(maker.getByText(homeCopy.tool.status.idle, { exact: true })).toHaveCount(0)
  await privacy.screenshot({ path: 'test-results/media-privacy-desktop.png' })
  await page.getByTestId('dance-refund-guarantee').screenshot({ path: 'test-results/refund-guarantee-desktop.png' })
  const gallery = page.locator('section[aria-labelledby="video-examples"]')
  await expect(gallery.locator('video')).toHaveCount(3)
  await expect(gallery.locator('figcaption a')).toHaveCount(0)
  await expect(gallery.locator(':scope > h2 + .example-grid')).toBeVisible()
  await expect(gallery.locator('.maker-example, :scope > p, :scope > h3')).toHaveCount(0)
  expect(await gallery.innerText()).not.toMatch(/makeviral|source:|author:|credit:|@\w/i)
  for (const video of await gallery.locator('video').all()) {
    await expect(video).toHaveAttribute('preload', 'none')
    await expect(video).toHaveAttribute('controls', '')
    await expect(video).toHaveAttribute('playsinline', '')
    await expect(video).not.toHaveAttribute('autoplay', '')
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByTestId('dance-refund-guarantee').screenshot({ path: 'test-results/refund-guarantee-mobile.png' })
  await privacy.screenshot({ path: 'test-results/media-privacy-mobile.png' })
  expect((await privacy.boundingBox())!.height).toBeLessThan(140)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('unavailable remote videos show a message without redundant caption links', async ({ page }) => {
  const first = homeCopy.examples.items[0]
  await page.route(first.video, (route) => route.abort('failed'))
  await page.goto('/')
  const card = page.locator('.example-card').first()
  await card.locator('video').evaluate((video: HTMLVideoElement) => video.load())
  await expect(card.getByRole('status')).toContainText('temporarily unavailable')
  await expect(card.locator('figcaption a')).toHaveCount(0)
  await expect(card.locator('video')).toHaveAttribute('controls', '')
})
