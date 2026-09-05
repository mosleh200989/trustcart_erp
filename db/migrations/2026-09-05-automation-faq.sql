-- Migration: Automation FAQ layer.
--
-- The reply engine could quote a price, because prices come from the products
-- table. It had nothing to say about delivery time, coverage, payment or
-- returns, because those live in nobody's table — so the most common questions
-- on the page were also the ones the bot always escalated.
--
-- These answers are written by a person and edited in the panel. They are not
-- generated, and they are not learned from imported history: history teaches
-- tone, this table states policy.
--
-- SAFE FOR PRODUCTION: IF NOT EXISTS everywhere, and the seed only fires into
-- an empty table so a re-run never resurrects a deleted answer.

CREATE TABLE IF NOT EXISTS automation_faqs (
    id           SERIAL PRIMARY KEY,
    -- NULL means every channel, matching automation_rules.
    channel_id   INTEGER REFERENCES automation_channels(id) ON DELETE CASCADE,
    -- Grouping only, for the panel. Never shown to a customer.
    category     VARCHAR(60)  NOT NULL DEFAULT 'general',
    question     VARCHAR(300) NOT NULL,
    -- Sent verbatim. No placeholders and no figures that belong to the
    -- catalogue: a price written here would go stale exactly the way an
    -- imported one does, which is the mistake this whole design avoids.
    answer       TEXT         NOT NULL,
    -- Extra words a customer might use, beyond those already in `question`.
    keywords     JSONB        NOT NULL DEFAULT '[]'::jsonb,
    -- Lower sorts first, and wins a scoring tie.
    priority     INTEGER      NOT NULL DEFAULT 100,
    is_active    BOOLEAN      NOT NULL DEFAULT TRUE,
    hit_count    INTEGER      NOT NULL DEFAULT 0,
    last_hit_at  TIMESTAMP,
    created_at   TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_faqs_lookup_idx
    ON automation_faqs (is_active, priority);

-- Starter answers, seeded INACTIVE on purpose.
--
-- The wording is lifted from what the team already writes in the imported
-- Kasri threads, so it is their policy and not an invention — but nobody has
-- confirmed it is still current, and an answer in this table is sent verbatim
-- to a customer. Someone reads them in the panel and switches them on.
INSERT INTO automation_faqs (category, question, answer, keywords, priority, is_active)
SELECT * FROM (VALUES
    ('delivery',
     'How long does delivery take?',
     E'আমাদের স্ট্যান্ডার্ড ডেলিভারি টাইম:\n\nঢাকার ভিতর - ১-২ দিন\nঢাকার বাইরে - ২-৩ দিন',
     '["delivery", "koto din", "kobe pabo", "kotodin", "ডেলিভারি", "কতদিন", "কবে পাবো"]'::jsonb,
     10, FALSE),
    ('delivery',
     'Which areas do you deliver to?',
     'আমরা বাংলাদেশের সব জেলায় ডেলিভারি করি।',
     '["area", "district", "jela", "kothay", "sob jaygay", "জেলা", "কোথায়", "এলাকা"]'::jsonb,
     20, FALSE),
    ('ordering',
     'How do I place an order?',
     E'অর্ডার করতে নিচের তথ্যগুলো দিন -\n\nনামঃ\nঠিকানা (গ্রাম, থানা, জেলা সহ):\nমোবাইল নাম্বারঃ',
     '["order korbo", "kivabe order", "how to order", "অর্ডার করব", "কিভাবে অর্ডার"]'::jsonb,
     30, FALSE)
) AS seed
WHERE NOT EXISTS (SELECT 1 FROM automation_faqs);
