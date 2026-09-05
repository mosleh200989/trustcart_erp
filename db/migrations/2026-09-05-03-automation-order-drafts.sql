-- Migration: order drafts collected over Messenger.
--
-- The bot can now take an order in the thread. It does not write to
-- sales_orders as it goes: it fills a draft here, reads the whole thing back,
-- and only creates the real order once the customer confirms in words.
--
-- The draft is the memory. Without it the reply engine would have to re-derive
-- "what have we already been told?" from the conversation on every message,
-- which is exactly the kind of thing a model gets right nine times out of ten —
-- and the tenth is a stranger's address on someone else's order.
--
-- sales_order_id is the idempotency key. It is written once, under a
-- conditional update, so a webhook retry or a double "confirm" cannot produce
-- two orders for one conversation.
--
-- SAFE FOR PRODUCTION: IF NOT EXISTS everywhere. No data is modified.

CREATE TABLE IF NOT EXISTS automation_order_drafts (
    id                 SERIAL PRIMARY KEY,
    conversation_id    INTEGER      NOT NULL REFERENCES automation_conversations(id) ON DELETE CASCADE,
    channel_id         INTEGER      NOT NULL,

    -- collecting  — still asking for missing details
    -- confirming  — everything is present, the read-back has been sent
    -- placed      — a real sales order exists
    -- cancelled   — the customer backed out, or a human took the thread over
    status             VARCHAR(20)  NOT NULL DEFAULT 'collecting'
                        CHECK (status IN ('collecting', 'confirming', 'placed', 'cancelled')),

    product_id         INTEGER,
    product_name       VARCHAR(500),
    -- Snapshotted when the customer chose it, so a mid-conversation price
    -- change cannot silently alter what they agreed to. The read-back and the
    -- order are built from this number.
    unit_price         NUMERIC(12, 2),
    quantity           INTEGER      NOT NULL DEFAULT 1,

    customer_name      VARCHAR(150),
    phone              VARCHAR(30),
    address            TEXT,
    district           VARCHAR(100),

    delivery_charge    NUMERIC(12, 2) NOT NULL DEFAULT 0,

    -- Set exactly once, when the order is created. Also the idempotency key.
    sales_order_id     INTEGER,
    sales_order_number VARCHAR(100),
    placed_at          TIMESTAMP,

    created_at         TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- One live draft per conversation. A thread that has already ordered starts a
-- fresh draft only after the previous one is placed or cancelled, so the
-- partial index covers just the open ones.
CREATE UNIQUE INDEX IF NOT EXISTS automation_order_drafts_open_idx
    ON automation_order_drafts (conversation_id)
    WHERE status IN ('collecting', 'confirming');

CREATE INDEX IF NOT EXISTS automation_order_drafts_conversation_idx
    ON automation_order_drafts (conversation_id, created_at DESC);

-- A conversation gets at most one real order per draft row.
CREATE UNIQUE INDEX IF NOT EXISTS automation_order_drafts_sales_order_idx
    ON automation_order_drafts (sales_order_id)
    WHERE sales_order_id IS NOT NULL;
