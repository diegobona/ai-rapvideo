import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Capture real maker controls in a local browser. Upload and generation requests
// are fulfilled inside Playwright: this script creates no account, uploads no
// photo, submits no paid job and publishes no real person's portrait.
// Resolve from the script so it can also run outside the repository root.
const repository = fileURLToPath(new URL('../../', import.meta.url))
const base = process.env.SEO_TEST_BASE_URL || 'http://127.0.0.1:7002'
const output = path.join(repository, 'apps/tanstack-app/public/images/tutorial')
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 2400 }, deviceScaleFactor: 1 })
const intercepted = []
const purchase = { id: 'tutorial-purchase', state: 'succeeded', taskId: 'tutorial-ui-sample', result: {
  provider: 'autodl', model: 'minimax_h3_lightx2v_v5', duration: 10,
  videoUrl: `${base}/tutorial-capture-empty.mp4`,
} }
await page.route('**/api/auth/get-session**', route => route.fulfill({ json: {
  user: { id: 'tutorial-sample', name: 'Sample', email: 'sample@example.com', emailVerified: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  session: { id: 'tutorial-session', userId: 'tutorial-sample', token: 'local-sample', expiresAt: new Date(Date.now() + 86400000).toISOString() },
} }))
await page.route('**/api/credits/balance', route => route.fulfill({ json: { balance: 40 } }))
await page.route('**/api/upload**', async (route) => {
  intercepted.push({ path: '/api/upload', state: 'mocked', method: route.request().method() })
  await route.fulfill({ json: { success: true, data: { url: `${base}/images/dance/example-barn.png` } } })
})
await page.route('**/api/video-generate/**', async (route) => {
  const pathname = new URL(route.request().url()).pathname
  if (pathname === '/api/video-generate/' && route.request().method() === 'GET') {
    return route.fulfill({ json: { success: true, data: { purchase: null, storageKey: 'tutorial-visitor' } } })
  }
  intercepted.push({ path: pathname, state: 'mocked', method: route.request().method() })
  if (pathname.endsWith('/status')) {
    await route.fulfill({ json: { success: true, data: { purchase } } })
  } else {
    await route.abort()
  }
})
await page.route('**/tutorial-capture-empty.mp4', (route) => route.fulfill({ status: 204, contentType: 'video/mp4', body: '' }))
await page.route('**/api/video-checkout/verify', route => route.fulfill({ json: { success: true, data: { purchase } } }))
await page.goto(base, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: 'Choose dancer photo', exact: true }).waitFor()
await page.waitForFunction(() => !document.querySelector('input[type=file]')?.disabled)
await page.locator('input[type=file]').first().setInputFiles(path.join(repository, 'apps/tanstack-app/public/images/dance/example-barn.png'))
await page.getByAltText('Preview of the dancer photo selected for your video').waitFor()
const maker = page.getByTestId('dance-maker')
const blocks = maker.locator('form > div')
const images = []
async function captureClip(name, elements, padding = 16, minHeight = 300) {
  await page.evaluate(() => scrollTo(0, 0))
  const rects = await Promise.all(elements.map((element) => element.boundingBox()))
  const scroll = await page.evaluate(() => ({ x: scrollX, y: scrollY }))
  const left = Math.min(...rects.map((rect) => rect.x))
  const top = Math.min(...rects.map((rect) => rect.y))
  const right = Math.max(...rects.map((rect) => rect.x + rect.width))
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height))
  const height = Math.ceil(Math.max(minHeight, bottom - top + padding * 2))
  const clip = { x: left + scroll.x - padding, y: bottom + scroll.y + padding - height,
    width: Math.ceil(right - left + padding * 2), height }
  await page.screenshot({ path: path.join(output, name), clip, animations: 'disabled' })
  images.push({ name, width: clip.width, height: clip.height })
}
await captureClip('01-choose-photo.png', [blocks.nth(0)])
await captureClip('02-dance-setting.png', [blocks.nth(1)])
await page.getByRole('checkbox', { name: 'I have permission to use the photos I upload.' }).check()
await page.getByRole('button', { name: 'Generate video', exact: true }).click()
const dialog = page.getByTestId('dance-checkout-dialog')
await dialog.waitFor()
await dialog.screenshot({ path: path.join(output, '03-generate-video.png'), animations: 'disabled' })
const dialogBounds = await dialog.boundingBox()
images.push({ name: '03-generate-video.png', width: Math.round(dialogBounds.width), height: Math.round(dialogBounds.height) })
// The next view is a mocked verified return; no checkout or job is submitted.
await page.goto(`${base}/?checkout_session_id=cs_test_tutorial#dance-maker`)
await page.getByRole('status').filter({ hasText: 'Your video is ready.' }).waitFor({ timeout: 20000 })
const resultPanel = maker.locator(':scope > div').last()
await captureClip('04-download-video.png', [resultPanel.locator('[role=status]'), resultPanel.locator(':scope > div').last()], 18)
await browser.close()
const audit = {
  screenshots: images,
  input: 'Existing generic illustrative still: /images/dance/example-barn.png',
  paymentAndReadyStates: 'Real checkout dialog and locally mocked verified-return response; no card entry or generated output is shown.',
  realUploads: 0, paidJobs: 0, accountChanges: 0, intercepted,
}
// Keep a new, immutable audit outside Playwright's managed output directory.
const auditDirectory = path.join(repository, 'scripts/manual/audits')
await mkdir(auditDirectory, { recursive: true })
const timestamp = new Date().toISOString().replaceAll(':', '-')
await writeFile(path.join(auditDirectory, `stage4-tutorial-capture-${timestamp}.json`), JSON.stringify(audit, null, 2), { flag: 'wx' })
await mkdir(path.join(repository, 'test-results'), { recursive: true })
await writeFile(path.join(repository, 'test-results/stage4-tutorial-capture.json'), JSON.stringify(audit, null, 2))
console.log(JSON.stringify({ images, realUploads: 0, paidJobs: 0 }))
