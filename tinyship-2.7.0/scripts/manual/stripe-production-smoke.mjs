import { chromium, request, expect } from '@playwright/test'
import Stripe from 'stripe'
import { parse } from 'dotenv'
import { readFile, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Real production checkout, deliberately stopped before payment. Only a public
// illustrative still is uploaded. Expire this check's session before cleanup.
const root = fileURLToPath(new URL('../../', import.meta.url))
const app = path.join(root, 'apps/tanstack-app')
const origin = 'https://rumpelstiltskin-ai.co'
const env = parse(await readFile(path.join(app, '.env.production.local')))
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil', httpClient: Stripe.createFetchHttpClient(), timeout: 15_000, maxNetworkRetries: 1 })
const account = await stripe.accounts.retrieve()
expect(account.id).toBe('acct_1TXtuTKmWtIG8s90')
let proxy
if (process.env.HTTPS_PROXY) {
  const url = new URL(process.env.HTTPS_PROXY)
  proxy = { server: url.origin, ...(url.username ? { username: decodeURIComponent(url.username), password: decodeURIComponent(url.password) } : {}) }
}
const api = await request.newContext({ baseURL: origin, extraHTTPHeaders: { Origin: origin }, ...(proxy ? { proxy } : {}) })
const report = { checks: [], realCharges: 0, providerJobs: 0, sampleContainsUserPhoto: false, passed: false }
let browser, sessionId, purchaseId, uploadedKey, userId
let step = 'initial admission'
const cleanupOnly = process.argv.includes('--cleanup-last')
try {
  if (cleanupOnly) {
    const previous = JSON.parse(await readFile(path.join(root, 'test-results/stripe-production-smoke.json')))
    userId = previous.testUserId
    uploadedKey = previous.uploadedKey
    sessionId = previous.sessionId
    purchaseId = previous.purchaseId
    report.cleanupOnly = true
  } else {
  const ownership = await api.get('/api/video-generate/')
  expect(ownership.status()).toBe(200)
  expect((await ownership.json()).data.purchase).toBeNull()
  const unsigned = await api.post('/api/video-checkout/webhook', { data: { type: 'ping' } })
  expect(unsigned.status()).toBe(400)
  const signup = await api.post('/api/auth/sign-in/anonymous', { data: {} })
  expect(signup.status()).toBe(200)
  userId = (await signup.json()).user.id
  const invalid = await api.post('/api/video-generate/', { data: { dancerImageUrl: 'https://example.test/removed-free-contract.png' } })
  expect(invalid.status()).toBe(400)
  const forged = await api.post('/api/video-generate/', { data: { purchaseId: crypto.randomUUID() } })
  expect(forged.status()).toBe(404)
  report.checks.push('Guest admission works; old free contract, forged purchase and unsigned webhook are rejected')

  step = 'live dialog'
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const context = await browser.newContext({ storageState: await api.storageState(), viewport: { width: 1440, height: 1080 } })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', error => pageErrors.push(error.name))
  await page.goto(origin, { waitUntil: 'networkidle' })
  await expect(page.getByRole('button', { name: 'Choose dancer photo', exact: true })).toBeEnabled()
  await page.locator('input[type=file]').first().setInputFiles(path.join(app, 'public/images/rap/step-person-1.png'))
  await page.getByRole('checkbox', { name: 'I have permission to use the photos I upload.' }).check()
  await page.getByRole('button', { name: 'Generate video', exact: true }).click()
  const dialog = page.getByTestId('rap-checkout-dialog')
  await expect(dialog).toContainText('$4.99')
  await expect(dialog).toContainText('No account or subscription required')
  await page.screenshot({ path: path.join(root, 'test-results/stripe-production-dialog-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(dialog.getByTestId('rap-checkout-pay')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: path.join(root, 'test-results/stripe-production-dialog-mobile.png') })
  report.checks.push('Live $4.99 dialog hydrates and fits desktop/mobile')

  step = 'real Stripe checkout'
  const uploadResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/upload' && response.request().method() === 'POST')
  let checkoutResult
  // Capture the real upstream body before forwarding it to the browser: the
  // immediate cross-origin navigation can discard Chromium's response body.
  await page.route('**/api/video-checkout/', async route => {
    const response = await route.fetch()
    checkoutResult = { status: response.status(), json: await response.json() }
    await route.fulfill({ response })
  })
  const checkoutResponse = page.waitForResponse(response => new URL(response.url()).pathname === '/api/video-checkout/' && response.request().method() === 'POST')
  await dialog.getByTestId('rap-checkout-pay').click()
  const uploaded = await uploadResponse
  expect(uploaded.status()).toBe(200)
  uploadedKey = (await uploaded.json()).data.key
  expect(uploadedKey.startsWith(`uploads/${userId}/`)).toBe(true)
  await checkoutResponse
  expect(checkoutResult.status).toBe(200)
  const data = checkoutResult.json.data
  purchaseId = data.purchaseId
  sessionId = new URL(data.checkoutUrl).pathname.match(/cs_live_[A-Za-z0-9]+/)?.[0]
  expect(sessionId).toBeTruthy()
  await page.waitForURL(url => url.hostname === 'checkout.stripe.com', { timeout: 45_000 })
  await expect(page.getByText(/\$4\.99/).first()).toBeVisible({ timeout: 45_000 })
  await expect(page.getByText('Rumpelstiltskin AI', { exact: true }).first()).toBeVisible()
  await page.screenshot({ path: path.join(root, 'test-results/stripe-production-hosted-checkout.png'), fullPage: true })
  const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items.data.price'] })
  expect(session.livemode).toBe(true)
  expect(session.mode).toBe('payment')
  expect(session.payment_status).toBe('unpaid')
  expect(session.amount_total).toBe(499)
  expect(session.currency).toBe('usd')
  expect(session.client_reference_id).toBe(purchaseId)
  expect(session.line_items.data).toHaveLength(1)
  expect(session.line_items.data[0].quantity).toBe(1)
  expect(session.line_items.data[0].price.id).toBe(env.STRIPE_VIDEO_PRICE_ID)
  expect(session.branding_settings?.display_name).toBe('Rumpelstiltskin AI')
  report.checks.push('Actual hosted Stripe checkout displays Rumpelstiltskin AI and $4.99; live one-time 499 USD price and owner match')

  step = 'unpaid purchase and callback gate'
  const verified = await api.post('/api/video-checkout/verify', { data: { sessionId } })
  expect(verified.status()).toBe(200)
  expect((await verified.json()).data.purchase.state).toBe('pending')
  const unpaid = await api.post('/api/video-generate/', { data: { purchaseId } })
  expect(unpaid.status()).toBe(402)
  const pending = await api.get(`/api/video-generate/status?purchaseId=${encodeURIComponent(purchaseId)}`)
  expect((await pending.json()).data.purchase.taskId).toBeNull()
  const payload = JSON.stringify({ id: `evt_config_probe_${crypto.randomUUID().replaceAll('-', '')}`, object: 'event', type: 'ping', livemode: true, data: { object: {} } })
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: env.STRIPE_VIDEO_WEBHOOK_SECRET })
  const probe = await api.post('/api/video-checkout/webhook', { data: payload, headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature } })
  expect(probe.status()).toBe(200)
  expect((await probe.json()).received).toBe(true)
  report.checks.push('Owned unpaid purchase returns402 and has no task; production signing secret accepts a signed diagnostic probe')

  step = 'cancel and session expiry'
  await page.goto(`${origin}/?checkout=cancelled#rap-maker`)
  await expect(page.getByRole('status').filter({ hasText: 'Payment cancelled. No video was generated.' })).toBeVisible()
  const expired = await stripe.checkout.sessions.expire(sessionId)
  expect(expired.status).toBe('expired')
  report.checkoutExpired = true
  // Polling does not settle or expire a pending purchase, so this also observes
  // Stripe delivery / scheduled reconciliation of the real expiry event.
  await expect.poll(async () => {
    const status = await api.get(`/api/video-generate/status?purchaseId=${encodeURIComponent(purchaseId)}`)
    return (await status.json()).data.purchase.state
  }, { timeout: 45_000, intervals: [1000, 2000, 4000] }).toBe('expired')
  expect(pageErrors).toEqual([])
  report.checks.push('Cancellation returns safely and real session expiry reaches the website purchase')
  report.passed = true
  }
} catch (error) {
  report.failure = { step, name: error.name, message: String(error.message).replace(/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+|\bwhsec_[A-Za-z0-9]+/g, '[REDACTED]').replace(/https:\/\/checkout\.stripe\.com\/[^\s]+/g, '[checkout URL redacted]').slice(0, 1800) }
  process.exitCode = 1
} finally {
  if (browser) await browser.close()
  if (!sessionId && userId) {
    try {
      const recent = await stripe.checkout.sessions.list({ limit: 100, created: { gte: Math.floor(Date.now() / 1000) - 3600 } })
      const own = recent.data.find(item => item.metadata?.app === 'rumpelstiltskin-video-v1' && item.metadata.userId === userId)
      if (own) { sessionId = own.id; purchaseId = own.metadata.purchaseId }
    } catch { report.cleanupFailure = 'Test checkout recovery could not be confirmed'; process.exitCode = 1 }
  }
  if (sessionId && !report.checkoutExpired) {
    try {
      const current = await stripe.checkout.sessions.retrieve(sessionId)
      if (current.status === 'open') await stripe.checkout.sessions.expire(sessionId)
      report.checkoutExpired = current.status === 'expired' || current.status === 'open'
    } catch { report.cleanupFailure = 'Checkout expiry could not be confirmed'; process.exitCode = 1 }
  }
  if (uploadedKey && userId && uploadedKey.startsWith(`uploads/${userId}/`) && report.checkoutExpired) {
    try {
      const require = createRequire(import.meta.url)
      const wrangler = path.join(path.dirname(require.resolve('wrangler/package.json')), 'bin/wrangler.js')
      // Wrangler installs its own environment-proxy dispatcher.
      execFileSync(process.execPath, [wrangler, 'r2', 'object', 'delete', `rumpelstiltskin-ai-uploads/${uploadedKey}`, '--remote', '--config', 'wrangler.jsonc'], { cwd: app, windowsHide: true, stdio: 'pipe' })
      report.testImageRemoved = true
    } catch { report.cleanupFailure = 'Generic test image cleanup failed'; process.exitCode = 1 }
  }
  await api.dispose()
  report.purchaseId = purchaseId
  report.sessionId = sessionId
  report.testUserId = userId
  report.uploadedKey = uploadedKey
  await writeFile(path.join(root, 'test-results/stripe-production-smoke.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
}
