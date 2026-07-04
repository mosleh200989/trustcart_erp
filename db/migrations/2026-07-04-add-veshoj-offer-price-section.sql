-- Add the Veshoj offer-price block to existing Veshoj landing pages without
-- replacing other sections already edited from the admin panel.

DO $$
DECLARE
  offer_section jsonb := '{
    "id": "veshoj-offer-price",
    "type": "custom-html",
    "title": "লিউকোন ফিমেল গার্ড পূর্বের মূল্য",
    "content": "লিউকোন কিনলেই পাচ্ছেন রুচি লতা এবং কোজিক ব্রাইট সোপ<br />একদম <span class=\"veshoj-offer-free\">ফ্রি!</span>",
    "items": [
      { "text": "১২৫০" },
      { "text": "অফার মূল্য" },
      { "text": "৯৯০ টাকা" }
    ],
    "buttonText": "অর্ডার করুন",
    "buttonLink": "#order-form",
    "buttonColor": "#FF7B00",
    "buttonTextColor": "#ffffff",
    "buttonBorderColor": "transparent",
    "buttonBorderRadius": 10,
    "backgroundColor": "#ffe8f9",
    "textColor": "#55585a",
    "order": 5,
    "is_visible": true
  }'::jsonb;
BEGIN
  UPDATE landing_pages AS lp
  SET
    sections = (
      WITH existing AS (
        SELECT value, ordinality
        FROM jsonb_array_elements(COALESCE(lp.sections, '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality)
      ),
      has_offer AS (
        SELECT EXISTS (
          SELECT 1
          FROM existing
          WHERE value->>'id' = 'veshoj-offer-price'
        ) AS exists
      ),
      adjusted AS (
        SELECT
          CASE
            WHEN value->>'id' = 'veshoj-comments' AND NOT (SELECT exists FROM has_offer)
              THEN jsonb_set(value, '{order}', '6'::jsonb, true)
            WHEN value->>'id' = 'veshoj-phone' AND NOT (SELECT exists FROM has_offer)
              THEN jsonb_set(value, '{order}', '7'::jsonb, true)
            ELSE value
          END AS value,
          CASE
            WHEN value->>'id' = 'veshoj-comments' AND NOT (SELECT exists FROM has_offer) THEN 6
            WHEN value->>'id' = 'veshoj-phone' AND NOT (SELECT exists FROM has_offer) THEN 7
            ELSE COALESCE((value->>'order')::int, ordinality::int)
          END AS sort_order,
          1 AS tie_order,
          ordinality
        FROM existing
      ),
      merged AS (
        SELECT value, sort_order, tie_order, ordinality
        FROM adjusted
        UNION ALL
        SELECT offer_section, 5, 0, 0
        WHERE NOT (SELECT exists FROM has_offer)
      )
      SELECT COALESCE(jsonb_agg(value ORDER BY sort_order, tie_order, ordinality), '[]'::jsonb)
      FROM merged
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE lp.slug = 'veshoj'
    AND lp.template = 'veshoj';

  UPDATE landing_pages AS lp
  SET
    products = (
      SELECT COALESCE(jsonb_agg(
        CASE
          WHEN value->>'id' = 'veshoj-single'
            AND COALESCE((value->>'price')::numeric, 0) = 1050
            THEN jsonb_set(
              jsonb_set(value, '{price}', '990'::jsonb, true),
              '{compare_price}',
              '1250'::jsonb,
              true
            )
          ELSE value
        END
        ORDER BY ordinality
      ), '[]'::jsonb)
      FROM jsonb_array_elements(COALESCE(lp.products, '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality)
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE lp.slug = 'veshoj'
    AND lp.template = 'veshoj'
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(COALESCE(lp.products, '[]'::jsonb)) AS item(value)
      WHERE value->>'id' = 'veshoj-single'
        AND COALESCE((value->>'price')::numeric, 0) = 1050
    );
END $$;
