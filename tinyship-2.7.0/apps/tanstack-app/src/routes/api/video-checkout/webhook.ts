import Stripe from 'stripe';
import { createFileRoute } from '@tanstack/react-router';
import { withCfDb } from '@/lib/with-request-db';
import { verifyPaidDanceSession } from '@/lib/paid-dance-service';
import { schedulePaidVideoRecovery } from '@/lib/paid-video-recovery';
import {
  getVideoPurchaseConfig,
  videoPurchaseConfig,
} from '../../../../../../config/videoPurchase';
import { createVideoStripeClient, refreshVideoPaymentRefunds } from '@libs/payment/video-stripe';
import {
  expireVideoPurchase,
  getVideoPurchase,
  videoPurchaseByPaymentIntent,
} from '@libs/payment/video-purchases';

export const Route = createFileRoute('/api/video-checkout/webhook')({
  server: {
    handlers: {
      POST: withCfDb(async ({ request }) => {
        let stripe: Stripe;
        let cfg: ReturnType<typeof getVideoPurchaseConfig>;
        try {
          cfg = getVideoPurchaseConfig();
          stripe = createVideoStripeClient();
        } catch {
          return Response.json({ error: 'payments_unavailable' }, { status: 503 });
        }
        let event: Stripe.Event;
        try {
          const payload = await request.text();
          if (payload.length > 1_000_000)
            return Response.json({ error: 'invalid_payload' }, { status: 400 });
          event = await stripe.webhooks.constructEventAsync(
            payload,
            request.headers.get('stripe-signature') || '',
            cfg.webhookSecret,
            undefined,
            Stripe.createSubtleCryptoProvider(),
          );
        } catch {
          return Response.json({ error: 'invalid_signature' }, { status: 400 });
        }
        try {
          if (event.livemode !== undefined && event.livemode !== cfg.live)
            return Response.json({ received: true });
          if (
            [
              'checkout.session.completed',
              'checkout.session.async_payment_succeeded',
              'checkout.session.async_payment_failed',
              'checkout.session.expired',
            ].includes(event.type)
          ) {
            const session = event.data.object as Stripe.Checkout.Session;
            if (
              session.metadata?.app !== videoPurchaseConfig.appMarker ||
              !session.metadata.purchaseId
            )
              return Response.json({ received: true });
            if (
              event.type === 'checkout.session.expired' ||
              event.type === 'checkout.session.async_payment_failed'
            ) {
              const purchase = await getVideoPurchase(session.metadata.purchaseId);
              if (
                purchase?.checkoutSessionId === session.id &&
                purchase.userId === session.metadata.userId
              )
                await expireVideoPurchase(purchase.id, session.id);
            } else if (session.payment_status === 'paid')
              await verifyPaidDanceSession(session.id, undefined, stripe);
          } else if (
            ['charge.refunded', 'refund.created', 'refund.updated', 'refund.failed'].includes(
              event.type,
            )
          ) {
            const object = event.data.object as Stripe.Refund | Stripe.Charge;
            const intent =
              typeof object.payment_intent === 'string'
                ? object.payment_intent
                : object.payment_intent?.id;
            if (intent) {
              const purchase = await videoPurchaseByPaymentIntent(intent);
              if (purchase) {
                await schedulePaidVideoRecovery(purchase.id);
                await refreshVideoPaymentRefunds(purchase, stripe);
                await schedulePaidVideoRecovery(purchase.id);
              }
            }
          }
          return Response.json({ received: true });
        } catch {
          console.error('Paid video webhook requires retry', {
            eventId: event.id,
            type: event.type,
          });
          return Response.json({ error: 'webhook_processing_failed' }, { status: 503 });
        }
      }),
    },
  },
});
