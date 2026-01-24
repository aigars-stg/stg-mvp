-- Migration: Make photos optional in listings
-- Description: Remove the constraint that requires at least one photo for listings
-- This allows users to create listings without photos, building on trust between users

ALTER TABLE listings DROP CONSTRAINT IF EXISTS photo_urls_not_empty;
