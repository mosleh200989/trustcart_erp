-- Update the Veshoj benefits block to match the Beshoj "problems solved"
-- section: full-width heading, image column, and orange-dot problem list.

UPDATE landing_pages AS lp
SET
  sections = (
    SELECT COALESCE(jsonb_agg(
      CASE
        WHEN value->>'id' = 'veshoj-benefit-images'
          THEN value || '{
            "type": "images",
            "title": "লিউকোন ফিমেল গার্ড সেবনে যেসব সমস্যা দূর হবে",
            "images": [
              "https://beshoj.com/wp-content/uploads/2025/05/14-1-1024x1024.jpg"
            ],
            "items": [
              { "text": "দীর্ঘদিনের পুরনো সাদা-স্রাব সমস্যা!" },
              { "text": "মাসিক চলাকালীন সময়ে অতিরিক্ত ব্যথা ও অস্বাভাবিক রক্তক্ষরণ!" },
              { "text": "অতিরিক্ত যোনি চুলকানি ও অস্বস্তি!" },
              { "text": "শারীরিক দুর্বলতা!" },
              { "text": "ওজন কমে যাওয়া!" },
              { "text": "খাবারের রুচি কম হওয়া।" },
              { "text": "মানসিক দুশ্চিন্তা ও বিভিন্ন ভিটামিনের ঘাটতি!" }
            ],
            "order": 3,
            "is_visible": true
          }'::jsonb
        ELSE value
      END
      ORDER BY ordinality
    ), '[]'::jsonb)
    FROM jsonb_array_elements(COALESCE(lp.sections, '[]'::jsonb)) WITH ORDINALITY AS item(value, ordinality)
  ),
  updated_at = CURRENT_TIMESTAMP
WHERE lp.slug = 'veshoj'
  AND lp.template = 'veshoj'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(lp.sections, '[]'::jsonb)) AS item(value)
    WHERE value->>'id' = 'veshoj-benefit-images'
  );
