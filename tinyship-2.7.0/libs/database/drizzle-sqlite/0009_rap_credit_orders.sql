CREATE TABLE rap_credit_order (
 id TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
 amount INTEGER NOT NULL DEFAULT 890 CHECK(amount = 890),
 currency TEXT NOT NULL DEFAULT 'usd' CHECK(currency = 'usd'),
 state TEXT NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','available','starting','processing','succeeded','refund_pending','refunded','expired')),
 stripe_account_id TEXT NOT NULL,
 stripe_price_id TEXT NOT NULL,
 checkout_session_id TEXT,
 checkout_url TEXT,
 payment_intent_id TEXT,
 request_id TEXT,
 generation_options TEXT,
 task_id TEXT,
 error_message TEXT,
 refund_id TEXT,
 refund_status TEXT,
 refunded_amount INTEGER NOT NULL DEFAULT 0,
 refund_required INTEGER NOT NULL DEFAULT 0,
 refund_attempt INTEGER NOT NULL DEFAULT 0,
 refund_lease_until INTEGER,
 created_at INTEGER NOT NULL,
 updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX rap_credit_session_idx ON rap_credit_order(checkout_session_id);
--> statement-breakpoint
CREATE UNIQUE INDEX rap_credit_intent_idx ON rap_credit_order(payment_intent_id);
--> statement-breakpoint
CREATE UNIQUE INDEX rap_credit_request_idx ON rap_credit_order(user_id,request_id);
--> statement-breakpoint
CREATE UNIQUE INDEX rap_credit_pending_owner_idx ON rap_credit_order(user_id) WHERE state = 'pending';
--> statement-breakpoint
CREATE UNIQUE INDEX rap_credit_active_owner_idx ON rap_credit_order(user_id) WHERE state IN ('starting','processing');
--> statement-breakpoint
CREATE INDEX rap_credit_owner_created_idx ON rap_credit_order(user_id,created_at);
--> statement-breakpoint
ALTER TABLE video_task ADD COLUMN rap_credit_order_id TEXT REFERENCES rap_credit_order(id) ON DELETE SET NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX video_task_rap_credit_idx ON video_task(rap_credit_order_id);
