CREATE TABLE video_purchase (
  id text PRIMARY KEY NOT NULL,
  user_id text NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  amount integer NOT NULL CHECK (amount = 499),
  currency text NOT NULL CHECK (currency = 'usd'),
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','paid','starting','processing','succeeded','refund_pending','refunded','expired')),
  generation_options text NOT NULL, return_path text NOT NULL, draft_key text,
  checkout_session_id text, checkout_url text, payment_intent_id text, task_id text,
  error_message text, refund_id text, refund_status text,
  refunded_amount integer NOT NULL DEFAULT 0,
  refund_required integer NOT NULL DEFAULT 0,
  refund_attempt integer NOT NULL DEFAULT 0, last_failed_refund_id text, refund_lease_until integer,
  created_at integer NOT NULL, updated_at integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX video_purchase_draft_idx ON video_purchase(draft_key);
CREATE UNIQUE INDEX video_purchase_session_idx ON video_purchase(checkout_session_id);
CREATE UNIQUE INDEX video_purchase_intent_idx ON video_purchase(payment_intent_id);
CREATE INDEX video_purchase_owner_created_idx ON video_purchase(user_id,created_at);
CREATE INDEX video_purchase_state_updated_idx ON video_purchase(state,updated_at);
--> statement-breakpoint
ALTER TABLE video_task ADD COLUMN purchase_id text REFERENCES video_purchase(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX video_task_purchase_idx ON video_task(purchase_id);
