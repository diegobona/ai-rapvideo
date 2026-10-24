import Stripe from 'stripe'
import { parse } from 'dotenv'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

// Read credentials from an ignored local file. Never pass or print a secret.
const root = fileURLToPath(new URL('../../', import.meta.url))
const args = process.argv.slice(2)
const argument = (name, fallback) => {
  const index = args.indexOf(name)
  return index < 0 ? fallback : args[index + 1]
}
const credentialPath = path.resolve(argument('--credentials', path.join(root, 'apps/tanstack-app/.env.stripe.live.local')))
const destination = path.join(root, 'apps/tanstack-app/.env.production.local')
const expectedAccount = 'acct_1TXtuTKmWtIG8s90'
const app = 'rumpelstiltskin-video-v1'
const webhookUrl = 'https://rumpelstiltskin-ai.co/api/video-checkout/webhook'
const lookupKey = 'rumpelstiltskin_video_v1_usd_499'
const dryRun = args.includes('--dry-run')
const events = [
  'checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed', 'checkout.session.expired',
  'charge.refunded', 'refund.created', 'refund.updated', 'refund.failed',
]

async function readEnv(file) {
  try { return parse(await readFile(file)) } catch (error) {
    if (error.code === 'ENOENT') return {}
    throw error
  }
}

async function main() {
  const supplied = await readEnv(credentialPath)
  const existing = await readEnv(destination)
  const secret = supplied.STRIPE_SECRET_KEY
  if (!secret || !/^(sk|rk)_live_/.test(secret)) {
    throw new Error('Put the target account\'s live STRIPE_SECRET_KEY in the ignored credentials file. Test keys are not accepted.')
  }
  const stripe = new Stripe(secret, {
    apiVersion: '2025-04-30.basil',
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 2,
  })
  const account = await stripe.accounts.retrieve()
  if (account.id !== expectedAccount) throw new Error('The key belongs to a different account. No Stripe configuration was changed.')
  if (!account.charges_enabled || !account.details_submitted) {
    throw new Error('The target Stripe account is not ready to accept live charges. No configuration was changed.')
  }

  let price = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 2 })).data[0]
  const endpoints = (await stripe.webhookEndpoints.list({ limit: 100 })).data
  let endpoint = endpoints.find(item => item.url === webhookUrl && item.metadata.app === app)
  if (dryRun) {
    console.log(JSON.stringify({ accountId: account.id, chargesEnabled: true, amount: 499, currency: 'usd', existingPriceId: price?.id || null, existingWebhookId: endpoint?.id || null, mutations: 0 }))
    return
  }

  if (price && (price.unit_amount !== 499 || price.currency !== 'usd' || price.type !== 'one_time' || price.metadata.app !== app)) {
    throw new Error('An unexpected price uses this application lookup key. It was not modified.')
  }
  if (!price) {
    const products = await stripe.products.search({ query: `metadata['app']:'${app}' AND active:'true'`, limit: 10 })
    let product = products.data.find(item => item.metadata.sku === lookupKey)
    if (!product) product = await stripe.products.create({
      name: 'Rumpelstiltskin AI dance video',
      description: 'One 10-second AI dance video from your photos. One payment, no subscription.',
      url: 'https://rumpelstiltskin-ai.co/',
      metadata: { app, sku: lookupKey },
    }, { idempotencyKey: `${app}:product:${lookupKey}` })
    price = await stripe.prices.create({
      product: product.id, currency: 'usd', unit_amount: 499,
      lookup_key: lookupKey, metadata: { app },
    }, { idempotencyKey: `${app}:price:${lookupKey}` })
  }

  let webhookSecret = supplied.STRIPE_VIDEO_WEBHOOK_SECRET || existing.STRIPE_VIDEO_WEBHOOK_SECRET
  if (endpoint) {
    if (endpoint.status !== 'enabled' || !events.every(event => endpoint.enabled_events.includes(event))) {
      throw new Error('The application webhook needs review in Stripe. No existing endpoint was modified.')
    }
    if (!webhookSecret) {
      throw new Error('This application webhook already exists. Copy its signing secret into STRIPE_VIDEO_WEBHOOK_SECRET in the ignored credentials file, then rerun. No duplicate endpoint was created.')
    }
  } else {
    endpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      description: 'Rumpelstiltskin AI one-video payments and refunds',
      enabled_events: events,
      api_version: '2025-04-30.basil',
      metadata: { app },
    }, { idempotencyKey: `${app}:webhook:v1` })
    webhookSecret = endpoint.secret
  }
  if (!webhookSecret?.startsWith('whsec_')) throw new Error('A valid isolated webhook signing secret is required.')
  const merged = {
    ...existing,
    STRIPE_SECRET_KEY: secret,
    STRIPE_VIDEO_PRICE_ID: price.id,
    STRIPE_VIDEO_WEBHOOK_SECRET: webhookSecret,
  }
  await writeFile(destination, Object.entries(merged).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n')
  const evidence = { accountId: account.id, productId: price.product, priceId: price.id, amount: 499, currency: 'usd', webhookId: endpoint.id, webhookUrl, existingPixal3DSettingsModified: false }
  await mkdir(path.join(root, 'test-results'), { recursive: true })
  await writeFile(path.join(root, 'test-results/stripe-video-provisioned.json'), JSON.stringify(evidence, null, 2))
  console.log(JSON.stringify(evidence))
}

await main().catch(error => {
  const message = String(error.message || 'Stripe configuration failed')
    .replace(/\b(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9]+/g, '[REDACTED]')
    .replace(/\bwhsec_[A-Za-z0-9]+/g, '[REDACTED]')
  console.error(JSON.stringify({ error: error.code || 'configuration_failed', message }))
  process.exitCode = 1
})
