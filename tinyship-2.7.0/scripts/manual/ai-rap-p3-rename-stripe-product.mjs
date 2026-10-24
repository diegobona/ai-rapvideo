import fs from 'node:fs';
import dotenv from 'dotenv';
import Stripe from 'stripe';

// Read-only unless --apply is explicitly supplied after authorization.
// The sole remote write changes the current video's existing Product.name.
const apply = process.argv.includes('--apply');
const env = dotenv.parse(fs.readFileSync(new URL('../../apps/tanstack-app/.env.production.local', import.meta.url)));
const targetName = 'AI Rap Video';
const previousName = 'Rumpelstiltskin AI dance video';

async function main() {
  if (!/^(sk|rk)_live_/.test(env.STRIPE_SECRET_KEY || '') || !/^price_/.test(env.STRIPE_VIDEO_PRICE_ID || '')) {
    throw new Error('Expected live Stripe configuration is unavailable');
  }
  const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-04-30.basil',
    timeout: 15000,
    maxNetworkRetries: 0,
  });
  const price = await stripe.prices.retrieve(env.STRIPE_VIDEO_PRICE_ID, { expand: ['product'] });
  const product = typeof price.product === 'object' && !price.product.deleted ? price.product : undefined;
  if (!price.livemode || !price.active || price.unit_amount !== 499 || price.currency !== 'usd' || price.type !== 'one_time'
    || !product?.active || ![previousName, targetName].includes(product.name)) {
    throw new Error('Existing video Price or Product does not match the expected configuration');
  }
  if (apply && product.name !== targetName) {
    await stripe.products.update(product.id, { name: targetName });
  }
  const verifiedPrice = await stripe.prices.retrieve(env.STRIPE_VIDEO_PRICE_ID, { expand: ['product'] });
  const verifiedProduct = typeof verifiedPrice.product === 'object' && !verifiedPrice.product.deleted ? verifiedPrice.product : undefined;
  if (verifiedPrice.id !== price.id || verifiedPrice.unit_amount !== 499 || verifiedPrice.currency !== 'usd'
    || verifiedProduct?.id !== product.id || (apply && verifiedProduct.name !== targetName)) {
    throw new Error('Post-check did not match the existing video Price and Product');
  }
  console.log(JSON.stringify({ name: verifiedProduct.name, id: verifiedProduct.id, price: verifiedPrice.unit_amount }));
}

main().catch(() => {
  console.error('Stripe product name check or rename failed; no secret or customer data was logged.');
  process.exitCode = 1;
});
