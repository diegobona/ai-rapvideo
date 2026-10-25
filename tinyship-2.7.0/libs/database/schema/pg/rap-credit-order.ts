import { sql } from 'drizzle-orm';
import { boolean, check, integer, pgTable, text, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './user';
import type { VideoGenerationOptions } from '../../../ai/types';

export const rapCreditOrder = pgTable('rap_credit_order', {
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
  generationOptions: jsonb('generation_options').$type<VideoGenerationOptions>(),
  taskId: text('task_id'),
  errorMessage: text('error_message'),
  refundId: text('refund_id'),
  refundStatus: text('refund_status'),
  refundedAmount: integer('refunded_amount').notNull().default(0),
  refundRequired: boolean('refund_required').notNull().default(false),
  refundAttempt: integer('refund_attempt').notNull().default(0),
  refundLeaseUntil: timestamp('refund_lease_until', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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
