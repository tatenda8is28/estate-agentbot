-- Create re_properties table
CREATE TABLE IF NOT EXISTS re_properties (
  id BIGSERIAL PRIMARY KEY,
  property_id TEXT UNIQUE,
  address TEXT NOT NULL,
  price DECIMAL(15, 2),
  bedrooms INT,
  bathrooms INT,
  property_type TEXT,
  description TEXT,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create re_property_viewings table
CREATE TABLE IF NOT EXISTS re_property_viewings (
  id BIGSERIAL PRIMARY KEY,
  property_id BIGINT REFERENCES re_properties(id) ON DELETE CASCADE,
  lead_id BIGINT REFERENCES re_prospect_leads(id) ON DELETE CASCADE,
  viewing_date DATE NOT NULL,
  viewing_time TIME NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, confirmed, completed, cancelled
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE re_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE re_property_viewings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for re_properties (public read, authenticated write)
CREATE POLICY "Allow public read access to properties" 
  ON re_properties FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated users to insert properties" 
  ON re_properties FOR INSERT 
  WITH CHECK (true);

-- RLS Policies for re_property_viewings
CREATE POLICY "Allow public read access to viewings" 
  ON re_property_viewings FOR SELECT 
  USING (true);

CREATE POLICY "Allow authenticated users to insert viewings" 
  ON re_property_viewings FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Allow users to update their own viewings" 
  ON re_property_viewings FOR UPDATE 
  USING (true);

-- Create indexes for better performance
CREATE INDEX idx_re_properties_address ON re_properties(address);
CREATE INDEX idx_re_properties_price ON re_properties(price);
CREATE INDEX idx_re_property_viewings_property_id ON re_property_viewings(property_id);
CREATE INDEX idx_re_property_viewings_lead_id ON re_property_viewings(lead_id);
CREATE INDEX idx_re_property_viewings_date ON re_property_viewings(viewing_date);
