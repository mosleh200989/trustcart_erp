-- Migration: spelling variants for the seeded FAQ answers.
--
-- Running the matcher over the live rows showed "ডেলিভারি কত দিন লাগবে?"
-- scoring 0.60 and staying quiet: the seed carried the joined "কতদিন" and
-- people write it separated. A two-word keyword only matches two adjacent
-- tokens, by design — the same reason "koto din" does not match "kotodin" —
-- so both spellings have to be listed.
--
-- Likewise "apnara ki sylhet e deliver koren?" reached no answer, because the
-- coverage entry knew the noun ("jela", "area") but none of the verbs people
-- actually use.
--
-- Keywords only. The answers are untouched: they go to a customer word for
-- word and belong to whoever wrote them.
--
-- A separate file rather than an edit to 2026-09-05-automation-faq.sql, which
-- has already been applied — editing an applied migration shows up as drift.
--
-- SAFE FOR PRODUCTION: a set union, so re-running changes nothing, and an
-- answer whose keywords were edited in the panel keeps those edits.

UPDATE automation_faqs f
SET keywords = (
        SELECT jsonb_agg(DISTINCT value)
        FROM jsonb_array_elements(
            f.keywords || '["কত দিন", "koy din", "kotodine", "koto din e", "কয় দিন", "কবে পাব"]'::jsonb
        ) AS value
    ),
    updated_at = NOW()
WHERE f.question = 'How long does delivery take?';

UPDATE automation_faqs f
SET keywords = (
        SELECT jsonb_agg(DISTINCT value)
        FROM jsonb_array_elements(
            f.keywords || '["deliver koren", "delivery koren", "deliver hoy", "delivery hoy", "pathaben", "ডেলিভারি করেন"]'::jsonb
        ) AS value
    ),
    updated_at = NOW()
WHERE f.question = 'Which areas do you deliver to?';
