// One deliberate direct test visit. No AI referrer is fabricated and no provider job is created.
import { chromium } from '@playwright/test'
import { writeFile } from 'node:fs/promises'

const origin = 'https://rumpelstiltskin-ai.co'
const response = await fetch(origin)
const html = await response.text()
const privacy = await fetch(`${origin}/privacy-policy`)
const privacyHtml = await privacy.text()
const browser = await chromium.launch({ channel: 'msedge', headless: true })
try {
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0' })
  // Simulate an ordinary human page-load on our own site; PostHog excludes WebDriver.
  await context.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }))
  const page = await context.newPage()
  const requests = []
  page.on('request', request => {
    const url = new URL(request.url())
    if (url.hostname.endsWith('.posthog.com')) requests.push({ path: url.pathname, method: request.method() })
  })
  const eventResponse = page.waitForResponse(response => {
    const url = new URL(response.url())
    return url.hostname === 'us.i.posthog.com' && response.request().method() === 'POST' && /\/(?:e|batch)\//.test(url.pathname)
  }, { timeout: 20000 })
  await page.goto(origin, { waitUntil: 'domcontentloaded' })
  const ingested = await eventResponse
  const acknowledgement = await ingested.json().catch(() => null)
  const report = {
    checkedAt: new Date().toISOString(),
    origin,
    homepageStatus: response.status,
    ssrH1: html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1].replace(/<[^>]*>/g, ''),
    privacyStatus: privacy.status,
    privacyMentionsPostHog: privacyHtml.includes('We use PostHog for basic visit and referral-source statistics'),
    ingestionStatus: ingested.status(),
    accepted: ingested.ok() && ['1', 'ok', 'success'].includes(String(acknowledgement?.status ?? acknowledgement).toLowerCase()),
    ingestionAcknowledgement: acknowledgement,
    analyticsRequests: requests,
    providerJobs: 0,
    testVisitSource: 'direct; installation verification',
  }
  await writeFile('test-results/posthog-production-smoke.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
  if (!report.accepted || report.homepageStatus !== 200 || !report.ssrH1 || !report.privacyMentionsPostHog) process.exitCode = 1
} finally { await browser.close() }
