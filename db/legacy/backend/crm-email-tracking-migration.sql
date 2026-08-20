SET search_path TO public;

CREATE TABLE IF NOT EXISTS email_tracking (
    id SERIAL PRIMARY KEY,
    customer_id INT NOT NULL,
    sent_by INT NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    cc_addresses TEXT NULL,
    bcc_addresses TEXT NULL,
    sent_at TIMESTAMP NOT NULL DEFAULT NOW(),
    opened BOOLEAN NOT NULL DEFAULT FALSE,
    open_count INT NOT NULL DEFAULT 0,
    first_opened_at TIMESTAMP NULL,
    last_opened_at TIMESTAMP NULL,
    clicked BOOLEAN NOT NULL DEFAULT FALSE,
    clicked_links JSONB NULL,
    replied BOOLEAN NOT NULL DEFAULT FALSE,
    replied_at TIMESTAMP NULL,
    bounced BOOLEAN NOT NULL DEFAULT FALSE,
    template_used VARCHAR(255) NULL,
    attachments JSONB NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_tracking_customer_id ON email_tracking(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_by ON email_tracking(sent_by);
CREATE INDEX IF NOT EXISTS idx_email_tracking_sent_at ON email_tracking(sent_at);
