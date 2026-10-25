import { createFileRoute } from '@tanstack/react-router'

// Sell only the dedicated rap-video credit pack. Legacy webhook/refund handlers
// stay available for historical orders; unrelated template plans cannot be bought.
export const Route = createFileRoute('/api/payment/initiate')({
  server: {
    handlers: {
      POST: async () => Response.json({ error: 'legacy_payment_disabled' }, {
        status: 410, headers: { 'Cache-Control': 'private, no-store' },
      }),
    },
  },
})
