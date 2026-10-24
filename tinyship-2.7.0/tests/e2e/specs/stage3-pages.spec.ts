import { expect, test } from '@playwright/test'
import { pageRegistry } from '../../../apps/tanstack-app/src/lib/page-registry'
import { generatorComparison } from '../../../apps/tanstack-app/src/lib/generator-comparison'
import { toolPageCopy } from '../../../apps/tanstack-app/src/lib/tool-page-copy'
import { danceOutputSpecs } from '../../../apps/tanstack-app/src/lib/dance-output-specs'
import path from 'node:path'

const cases = [
  { entry: pageRegistry.videoGenerator, title: 'Rumpelstiltskin AI Video Generator - Make a Dance Video From One Photo', h1: 'Rumpelstiltskin AI Video Generator', h2: ['How the Generator Works', 'What You Get', 'Which Photo Works Best', 'Pricing and Refunds', 'Troubleshooting', 'FAQ', 'Related Pages'] },
  { entry: pageRegistry.danceVideo, title: 'Rumpelstiltskin Dance Video Generator - Recreate the Tip Toe Dance', h1: 'Rumpelstiltskin Dance Video Generator', h2: ['What the Dance Looks Like', 'How the Dance Video Is Made', 'Adding the Tip Toe Sound on TikTok', 'FAQ', 'Related Pages'] },
  { entry: pageRegistry.bestGenerators, title: 'Best Rumpelstiltskin AI Generators (Compared)', h1: 'Best Rumpelstiltskin AI Generators', h2: ['Compare Rumpelstiltskin AI Video Tools', 'Choose a Tool for Your Version of the Meme'] },
]

for (const { entry, title, h1, h2 } of cases) {
  test(`${entry.path} serves its own metadata and body without JavaScript`, async ({ browser, request }) => {
    const response = await request.get(`${entry.path}?utm_source=stage3`)
    expect(response.status()).toBe(200)
    const html = await response.text()
    const body = html.split('<body')[1].split('<script')[0]
    expect(html).toContain(`<title>${title}</title>`)
    expect(html.match(/<title>/g)).toHaveLength(1)
    expect(html.match(/<meta\b[^>]*name="description"/g)).toHaveLength(1)
    expect(html).toContain(`content="${entry.description}"`)
    expect(html.match(/<link\b[^>]*rel="canonical"/g)).toHaveLength(1)
    expect(html).toContain(`href="https://rumpelstiltskin-ai.co${entry.path}"`)
    expect(html).not.toMatch(/<meta\b[^>]*name="keywords"/i)
    expect(html).toContain('content="index, follow"')
    const context = await browser.newContext({ javaScriptEnabled: false })
    const page = await context.newPage()
    await page.goto(`${process.env.SEO_TEST_BASE_URL || 'http://localhost:7001'}${entry.path}`)
    await expect(page.locator('h1')).toHaveCount(1)
    await expect(page.locator('h1')).toHaveText(h1)
    expect(await page.locator('main h2').allTextContents()).toEqual(h2)
    await expect(page.locator('main a[href="/"]').filter({ hasText: /^Rumpelstiltskin AI$/ }).first()).toBeVisible()
    if (entry.path !== pageRegistry.bestGenerators.path) {
      expect(body.indexOf(h1)).toBeLessThan(body.indexOf('id="dance-maker"'))
      expect(body).toContain('Choose dancer photo')
      expect(body).toContain('Generate video')
      expect(body).toContain('Download video')
      await expect(page.locator('.faq-item')).toHaveCount(entry.path === pageRegistry.danceVideo.path ? 4 : 5)
      await expect(page.locator('a[href^="/signin"], a[href^="/signup"]')).toHaveCount(0)
      for (const image of await page.locator('main img').all()) {
        await expect(image).toHaveAttribute('alt', /.+/)
        await image.scrollIntoViewIfNeeded()
        await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth >= 300 && node.naturalHeight >= 300)).toBe(true)
        expect(Number(await image.getAttribute('width'))).toBeGreaterThanOrEqual(300)
        expect(Number(await image.getAttribute('height'))).toBeGreaterThanOrEqual(300)
      }
    } else {
      expect(body).toContain('<table')
      await expect(page.locator('table')).toHaveCount(1)
      await expect(page.locator('table thead th')).toHaveCount(5)
      expect(await page.locator('table tbody tr').count()).toBeGreaterThanOrEqual(5)
      for (const tool of generatorComparison) await expect(page.locator('table')).toContainText(tool.name)
      await expect(page.locator('table')).toContainText('Not publicly disclosed')
      for (const tool of generatorComparison.filter((item) => item.href.startsWith('https:'))) {
        await expect(page.locator(`table a[href="${tool.source.href}"]`).last()).toBeVisible()
      }
    }
    if (entry.path === pageRegistry.videoGenerator.path) {
      expect(entry.description).toBe('Rumpelstiltskin AI video generator: create a dance video from one photo for $4.99 USD. No account or subscription required. Preview and download the MP4.')
      for (const sibling of [pageRegistry.danceVideo, pageRegistry.howTo]) await expect(page.locator(`section[aria-labelledby="generator-related"] a[href="${sibling.path}"]`)).toBeVisible()
      await expect(page.locator('section[aria-labelledby="generator-output"] table tbody tr')).toHaveCount(5)
      for (const spec of danceOutputSpecs) await expect(page.locator('section[aria-labelledby="generator-output"] table')).toContainText(spec.value)
      expect(await page.locator('main').innerText()).not.toMatch(/face swap|swap your face|original clip|two modes|free for a limited time/i)
      const video = page.locator('section[aria-labelledby="generator-output"] video')
      await expect(video).toHaveAttribute('title', toolPageCopy.videoGenerator.demo.title)
      await expect.poll(() => video.evaluate((node: HTMLVideoElement) => [node.videoWidth, node.videoHeight])).toEqual([720, 1280])
      expect(await video.evaluate((node: HTMLVideoElement) => node.duration)).toBe(10)
      await video.evaluate((node: HTMLVideoElement) => { node.muted = true; return node.play() })
      await expect.poll(() => video.evaluate((node: HTMLVideoElement) => node.currentTime)).toBeGreaterThan(0)
      await video.evaluate((node: HTMLVideoElement) => node.pause())
      await page.setViewportSize({ width: 1440, height: 1050 })
      await page.locator('section[aria-labelledby="generator-output"]').scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.resolve(__dirname, '../../../test-results/generator-page-output-desktop.png') })
      await page.setViewportSize({ width: 390, height: 844 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await video.scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.resolve(__dirname, '../../../test-results/generator-page-output-mobile.png') })
    }
    if (entry.path === pageRegistry.danceVideo.path) {
      expect(body).toContain('rumpelstiltskin ai dance video generator')
      await expect(page.locator('.dance-action')).toHaveCount(4)
      await expect(page.locator('section[aria-labelledby="dance-how-to-make"] li')).toHaveCount(4)
      await expect(page.locator('section[aria-labelledby="dance-sound"]')).toContainText('does not include the Tip Toe song')
      for (const target of [pageRegistry.home, pageRegistry.videoGenerator, pageRegistry.meme, pageRegistry.howTo]) {
        await expect(page.locator(`main a[href="${target.path}"]`).filter({ hasText: target.anchorText }).first()).toBeVisible()
      }
      expect(await page.locator('main').innerText()).not.toMatch(/face swap|original clip|two modes|free for a limited time/i)
      const steps = page.locator('section[aria-labelledby="dance-how-to-make"]')
      const note = page.locator('section[aria-labelledby="dance-how-to-make"] + p.section-note')
      for (const width of [1440, 768, 390]) {
        await page.setViewportSize({ width, height: 1050 })
        const cards = await steps.locator('.step-card').all()
        const cardBoxes = await Promise.all(cards.map((card) => card.boundingBox()))
        const noteBox = await note.boundingBox()
        expect(cardBoxes.every(Boolean)).toBe(true)
        expect(noteBox).not.toBeNull()
        const cardsBottom = Math.max(...cardBoxes.map((box) => box!.y + box!.height))
        expect(noteBox!.y - cardsBottom, `Steps and links must not overlap at ${width}px`).toBeGreaterThanOrEqual(20)
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
        await note.scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.resolve(__dirname, `../../../test-results/dance-steps-spacing-${width}.png`) })
      }
    }
    await context.close()
  })
}

test('the sitemap discovers home and all six published registry pages', async ({ request }) => {
  const response = await request.get('/sitemap.xml')
  expect(response.status()).toBe(200)
  const xml = await response.text()
  const locations = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1])
  expect(locations.sort()).toEqual(Object.values(pageRegistry).map(({ path }) => `https://rumpelstiltskin-ai.co${path}`).sort())
})
