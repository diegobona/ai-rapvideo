import { chromium } from '@playwright/test'
import { mkdir, writeFile, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = fileURLToPath(new URL('../../', import.meta.url))
const output = path.join(root, 'test-results/launch-content')
await mkdir(output, { recursive: true })
const routes = ['/', '/rumpelstiltskin-ai-video-generator', '/rumpelstiltskin-dance-video', '/best-rumpelstiltskin-ai-generators', '/rumpelstiltskin-meme', '/how-to-make-rumpelstiltskin-ai-video', '/is-rumpelstiltskin-1987-real']
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const result = { pages: [], external: [] }
for (const route of process.argv.includes('--external-only') ? [] : routes) {
  const response = await page.goto(`http://127.0.0.1:7002${route}`, { waitUntil: 'networkidle' })
  const slug = route === '/' ? 'home' : route.slice(1)
  for (const img of await page.locator('img').all()) {
    await img.scrollIntoViewIfNeeded()
    await img.evaluate(i => i.decode().catch(() => {}))
  }
  await page.evaluate(() => scrollTo(0, 0))
  await page.screenshot({ path: path.join(output, `${slug}-desktop.png`), fullPage: true })
  const data = await page.evaluate(() => ({
    title: document.title,
    text: document.body.innerText,
    links: [...document.querySelectorAll('a[href]')].map(a => ({ label: a.textContent.trim(), href: a.getAttribute('href'), rel: a.rel })),
    images: [...document.querySelectorAll('img')].map(i => ({ src: i.getAttribute('src'), alt: i.alt, naturalWidth: i.naturalWidth, naturalHeight: i.naturalHeight }))
  }))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: path.join(output, `${slug}-mobile.png`), fullPage: true })
  const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)
  await page.setViewportSize({ width: 1440, height: 1000 })
  result.pages.push({ route, status: response.status(), mobileOverflow, ...data })
  console.log(JSON.stringify({ route, status: response.status(), mobileOverflow, links: data.links.length }))
}
if (result.pages.length) await writeFile(path.join(output, 'pages.json'), JSON.stringify(result.pages, null, 2))
else result.pages = JSON.parse(await readFile(path.join(output, 'pages.json'), 'utf8'))
if (process.argv.includes('--external') || process.argv.includes('--external-only')) {
  const sources = new Map()
  for (const p of result.pages) for (const link of p.links) if (/^https?:/.test(link.href) && !sources.has(link.href)) sources.set(link.href, { ...link, from: p.route })
  for (const [href, link] of sources) {
    const record = { href, from: link.from, label: link.label }
    const externalPage = await context.newPage()
    try {
      await externalPage.goto(`http://127.0.0.1:7002${link.from}`, { waitUntil: 'networkidle' })
      // Select the observed href so repeated source labels cannot select another destination.
      const target = externalPage.locator(`a[href=${JSON.stringify(href)}]`).first()
      const responseStatuses = []
      externalPage.on('response', response => { if (response.request().isNavigationRequest()) responseStatuses.push({ url: response.url(), status: response.status() }) })
      const nav = externalPage.waitForURL(url => url.origin !== 'http://127.0.0.1:7002', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await target.click({ timeout: 10000, noWaitAfter: true })
      await nav
      await externalPage.waitForTimeout(2500)
      record.responses = responseStatuses
      record.url = externalPage.url()
      record.title = await externalPage.title()
      record.text = await externalPage.locator('body').innerText({ timeout: 15000 })
      await externalPage.screenshot({ path: path.join(output, `external-${result.external.length + 1}.png`), fullPage: true, timeout: 15000 })
    } catch (error) {
      record.error = String(error.message).split('\n')[0]
      record.url = externalPage.url()
    }
    await externalPage.close()
    result.external.push(record)
    await writeFile(path.join(output, 'external.json'), JSON.stringify(result.external, null, 2))
    console.log(JSON.stringify({ href, status: record.status, title: record.title, error: record.error }))
  }
}
await browser.close()
