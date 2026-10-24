import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './user';
import type { VideoGenerationOptions } from '../../../ai/types';

export const videoPurchase = sqliteTable(
  'video_purchase',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    state: text('state').notNull().default('pending'),
    generationOptions: text('generation_options', { mode: 'json' })
      .$type<VideoGenerationOptions>()
      .notNull(),
    returnPath: text('return_path').notNull(),
    draftKey: text('draft_key'),
    checkoutSessionId: text('checkout_session_id'),
    checkoutUrl: text('checkout_url'),
    paymentIntentId: text('payment_intent_id'),
    taskId: text('task_id'),
    errorMessage: text('error_message'),
    refundId: text('refund_id'),
    refundStatus: text('refund_status'),
    refundedAmount: integer('refunded_amount').notNull().default(0),
    refundRequired: integer('refund_required', { mode: 'boolean' }).notNull().default(false),
    refundAttempt: integer('refund_attempt').notNull().default(0),
    lastFailedRefundId: text('last_failed_refund_id'),
    refundLeaseUntil: integer('refund_lease_until', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    check('video_purchase_amount_check', sql`${table.amount} = 499`),
    check('video_purchase_currency_check', sql`${table.currency} = 'usd'`),
    check(
      'video_purchase_state_check',
      sql`${table.state} IN ('pending','paid','starting','processing','succeeded','refund_pending','refunded','expired')`,
    ),
    uniqueIndex('video_purchase_draft_idx').on(table.draftKey),
    uniqueIndex('video_purchase_session_idx').on(table.checkoutSessionId),
    uniqueIndex('video_purchase_intent_idx').on(table.paymentIntentId),
    index('video_purchase_owner_created_idx').on(table.userId, table.createdAt),
    index('video_purchase_state_updated_idx').on(table.state, table.updatedAt),
  ],
);
