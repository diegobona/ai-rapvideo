import { sql } from 'drizzle-orm';
import { check, integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './user';
import type { VideoGenerationOptions } from '../../../ai/types';

export const rapCreditOrder = sqliteTable('rap_credit_order', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  amount: integer('amount').notNull().default(890),
  currency: text('currency').notNull().default('usd'),
  state: text('state').notNull().default('pending'),
  stripeAccountId: text('stripe_account_id').notNull(),
  stripePriceId: text('stripe_price_id').notNull(),
  checkoutSessionId: text('checkout_session_id'),
  checkoutUrl: text('checkout_url'),
  paymentIntentId: text('payment_intent_id'),
  requestId: text('request_id'),
  generationOptions: text('generation_options', { mode: 'json' }).$type<VideoGenerationOptions>(),
  taskId: text('task_id'),
  errorMessage: text('error_message'),
  refundId: text('refund_id'),
  refundStatus: text('refund_status'),
  refundedAmount: integer('refunded_amount').notNull().default(0),
  refundRequired: integer('refund_required', { mode: 'boolean' }).notNull().default(false),
  refundAttempt: integer('refund_attempt').notNull().default(0),
  refundLeaseUntil: integer('refund_lease_until', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, table => [
  check('rap_credit_amount_check', sql`${table.amount} = 890`),
  check('rap_credit_currency_check', sql`${table.currency} = 'usd'`),
  check('rap_credit_state_check', sql`${table.state} IN ('pending','available','starting','processing','succeeded','refund_pending','refunded','expired')`),
  uniqueIndex('rap_credit_session_idx').on(table.checkoutSessionId),
  uniqueIndex('rap_credit_intent_idx').on(table.paymentIntentId),
  uniqueIndex('rap_credit_request_idx').on(table.userId, table.requestId),
  uniqueIndex('rap_credit_pending_owner_idx').on(table.userId).where(sql`${table.state} = 'pending'`),
  uniqueIndex('rap_credit_active_owner_idx').on(table.userId).where(sql`${table.state} IN ('starting','processing')`),
  index('rap_credit_owner_created_idx').on(table.userId, table.createdAt),
]);
