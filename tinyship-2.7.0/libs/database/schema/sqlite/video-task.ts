import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { user } from './user';
import { videoPurchase } from './video-purchase';
import { rapCreditOrder } from './rap-credit-order';
import { creditTransaction } from './credit-transaction';

export const videoTask = sqliteTable('video_task', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  purchaseId: text('purchase_id').references(() => videoPurchase.id, { onDelete: 'set null' }),
  rapCreditOrderId: text('rap_credit_order_id').references(() => rapCreditOrder.id, { onDelete: 'set null' }),
  provider: text('provider').notNull(),
  model: text('model').notNull(),
  providerTaskId: text('provider_task_id').notNull(),
  creditCost: integer('credit_cost').notNull(),
  consumeTransactionId: text('consume_transaction_id').references(() => creditTransaction.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('processing'),
  result: text('result', { mode: 'json' }),
  errorMessage: text('error_message'),
  refunded: integer('refunded', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
}, (table) => [
  uniqueIndex('video_task_purchase_idx').on(table.purchaseId),
  uniqueIndex('video_task_rap_credit_idx').on(table.rapCreditOrderId),
  index('video_task_user_created_idx').on(table.userId, table.createdAt),
  uniqueIndex('video_task_provider_id_idx').on(table.provider, table.providerTaskId),
  uniqueIndex('video_task_consumption_idx').on(table.consumeTransactionId),
]);
