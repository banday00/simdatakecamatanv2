-- Migration: Add session tracking columns for single-session-per-user feature
-- Each user can only be logged in from one device at a time.

ALTER TABLE "user_profiles"
  ADD COLUMN IF NOT EXISTS "current_session_ip" text,
  ADD COLUMN IF NOT EXISTS "current_session_ua" text,
  ADD COLUMN IF NOT EXISTS "current_session_at" timestamp with time zone;
