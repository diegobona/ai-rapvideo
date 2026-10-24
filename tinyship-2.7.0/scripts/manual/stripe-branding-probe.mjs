import Stripe from 'stripe'
import { parse } from 'dotenv'
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

// Check a documented per-session override on the installed API version. This
// ephemeral unpaid session is expired immediately; account settings stay intact.
const env = parse(await readFile(fileURLToPath(new URL('../../apps/tanstack-app/.env.production.local', import.meta.url))))
const stripe = new Stripe(env.STRIPE_SECRET_KEY, { apiVersion: '2025-04-30.basil', httpClient: Stripe.createFetchHttpClient(), timeout: 15_000, maxNetworkRetries: 1 })
const account = await stripe.accounts.retrieve()
if (account.id !== 'acct_1TXtuTKmWtIG8s90') throw new Error('Unexpected Stripe account')
let session
const report = { supported: false, globalSettingsModified: false, realCharges: 0 }
try {
  session = await stripe.checkout.sessions.create({
    mode: 'payment', payment_method_types: ['card'],
    line_items: [{ price: env.STRIPE_VIDEO_PRICE_ID, quantity: 1 }],
    success_url: 'https://rumpelstiltskin-ai.co/',
    metadata: { app: 'rumpelstiltskin-branding-probe' },
    branding_settings: { display_name: 'Rumpelstiltskin AI', background_color: '#faf9f4', button_color: '#304c3e' },
  })
  report.supported = session.branding_settings?.display_name === 'Rumpelstiltskin AI'
  report.apiVersion = '2025-04-30.basil'
  if (!report.supported) throw new Error('Session branding override not returned')
} catch (error) {
  report.error = String(error.message).replace(/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+|\bwhsec_[A-Za-z0-9]+/g, '[REDACTED]')
  process.exitCode = 1
} finally {
  if (session) { await stripe.checkout.sessions.expire(session.id); report.sessionExpired = true }
  await writeFile(fileURLToPath(new URL('../../test-results/stripe-branding-probe.json', import.meta.url)), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report))
}
