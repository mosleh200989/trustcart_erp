-- Migration: Add hero video URL for video-first landing page heroes

ALTER TABLE landing_pages
ADD COLUMN IF NOT EXISTS hero_video_url VARCHAR(500);

COMMENT ON COLUMN landing_pages.hero_video_url IS 'YouTube/direct video URL used when hero_layout is video-first';
