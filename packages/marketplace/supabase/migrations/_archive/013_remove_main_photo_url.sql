-- Migration: Remove main_photo_url column
-- Description: Remove the redundant main_photo_url column since BGG images
-- are always the primary display images and user photos are stored in photo_urls array

ALTER TABLE listings DROP COLUMN IF EXISTS main_photo_url;
