-- ============================================================
-- Make the Natural template's package cards a real section.
--
-- The cards used to render unconditionally from the Products tab, while their
-- heading came from a `natural-packages` section of type 'custom-html'. Hiding
-- that section therefore did not hide the cards — it silently reverted the
-- heading to a hardcoded default, with nothing in the editor explaining why.
--
-- The cards are now a first-class 'packages' section, so visibility, order,
-- heading, sub-heading and background all come from the Page Sections tab.
--
-- That flips the meaning of is_visible for this one section, so this migration
-- forces it true: on every existing page the cards are currently on screen, and
-- a schema change must not take them off it. Hide them deliberately from the
-- editor afterwards if that is what you want.
--
-- Idempotent — re-running changes nothing once converted.
-- ============================================================

UPDATE landing_pages AS lp
SET sections = converted.sections,
    updated_at = NOW()
FROM (
    SELECT
        src.id,
        jsonb_agg(
            CASE
                WHEN elem->>'id' = 'natural-packages'
                    THEN elem || '{"type": "packages", "is_visible": true}'::jsonb
                ELSE elem
            END
            ORDER BY ord
        ) AS sections
    FROM landing_pages AS src,
         LATERAL jsonb_array_elements(src.sections) WITH ORDINALITY AS t(elem, ord)
    WHERE src.template = 'natural'
      AND jsonb_typeof(src.sections) = 'array'
    GROUP BY src.id
) AS converted
WHERE lp.id = converted.id
  AND lp.sections IS DISTINCT FROM converted.sections;
