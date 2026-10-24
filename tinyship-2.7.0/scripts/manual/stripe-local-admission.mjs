import { request, expect } from '@playwright/test'
import Stripe from 'stripe'
import { writeFile } from 'node:fs/promises'

const baseURL = process.env.SEO_TEST_BASE_URL || 'http://127.0.0.1:7004'
if (!['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) throw new Error('Local verification only')
const api = await request.newContext({ baseURL, extraHTTPHeaders: { Origin: baseURL } })
const checks = []
try {
  const owned = await api.get('/api/video-generate/')
  expect(owned.status()).toBe(200)
  expect((await owned.json()).data.purchase).toBeNull()
  const unsigned = await api.post('/api/video-checkout/webhook', { data: { type: 'ping' } })
  expect(unsigned.status()).toBe(400)
  checks.push('Unsigned webhook rejected')
  const login = await api.post('/api/auth/sign-in/anonymous', { data: {} })
  expect(login.status()).toBe(200)
  const session = await api.get('/api/auth/get-session')
  expect((await session.json()).user.isAnonymous).toBe(true)
  checks.push('Real local D1 guest session established')
  const afterLogin = await api.get('/api/video-generate/')
  expect(afterLogin.status()).toBe(200)
  expect((await afterLogin.json()).data.purchase).toBeNull()
  const removedContract = await api.post('/api/video-generate/', { data: { dancerImageUrl: 'https://example.test/photo.png', danceTemplate: 'rumpelstiltskin-v2' } })
  expect(removedContract.status()).toBe(400)
  const forged = await api.post('/api/video-generate/', { data: { purchaseId: crypto.randomUUID() } })
  expect(forged.status()).toBe(404)
  const forgedStatus = await api.get(`/api/video-generate/status?purchaseId=${crypto.randomUUID()}`)
  expect(forgedStatus.status()).toBe(404)
  checks.push('Removed free-generation contract and forged purchase rejected')
  const payload = JSON.stringify({ id: 'evt_local_signed_probe', object: 'event', type: 'ping', livemode: false, data: { object: {} } })
  const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: 'whsec_browser_fixture' })
  const signed = await api.post('/api/video-checkout/webhook', { data: payload, headers: { 'Content-Type': 'application/json', 'Stripe-Signature': signature } })
  expect(signed.status()).toBe(200)
  expect((await signed.json()).received).toBe(true)
  checks.push('Raw signed webhook accepted by the actual Worker')
  await writeFile('test-results/stripe-local-admission.json', JSON.stringify({ checks, realCharges: 0, providerJobs: 0, realUploads: 0 }, null, 2))
  console.log(JSON.stringify({ checks, realCharges: 0, providerJobs: 0, realUploads: 0 }))
} finally {
  await api.dispose()
}
