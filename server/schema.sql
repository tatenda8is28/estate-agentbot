-- ============================================================
-- Run this SQL in the Supabase SQL Editor to create the tables
-- ============================================================

-- Properties table
CREATE TABLE IF NOT EXISTS properties (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id TEXT,
  address     TEXT        NOT NULL,
  price       NUMERIC,
  bedrooms    INTEGER,
  bathrooms   INTEGER,
  property_type TEXT,
  description TEXT,
  image_url   TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Property viewings table
CREATE TABLE IF NOT EXISTS property_viewings (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id  UUID        REFERENCES properties(id) ON DELETE CASCADE,
  lead_id      UUID        REFERENCES re_prospect_leads(id) ON DELETE SET NULL,
  viewing_date DATE        NOT NULL,
  viewing_time TEXT        NOT NULL,
  status       TEXT        DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (optional – configure policies as needed)
ALTER TABLE properties       ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_viewings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous read access to properties
CREATE POLICY "Public read properties"
  ON properties FOR SELECT
  USING (true);

-- Allow service role full access (used by the API server)
CREATE POLICY "Service role insert properties"
  ON properties FOR INSERT
  WITH CHECK (true);

-- Allow anonymous insert on property_viewings (leads booking viewings)
CREATE POLICY "Public insert property_viewings"
  ON property_viewings FOR INSERT
  WITH CHECK (true);

-- Allow anonymous read on property_viewings
CREATE POLICY "Public read property_viewings"
  ON property_viewings FOR SELECT
  USING (true);
