-- Special Offers Migration
-- This table stores special offer sections that appear on the homepage

BEGIN;

-- Create special_offers table
CREATE TABLE IF NOT EXISTS special_offers (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  subtitle VARCHAR(255),
  description TEXT,
  features JSONB, -- Array of feature text
  primary_button_text VARCHAR(100),
  primary_button_link VARCHAR(500),
  secondary_button_text VARCHAR(100),
  secondary_button_link VARCHAR(500),
  image_url VARCHAR(500),
  background_gradient VARCHAR(255) DEFAULT 'from-orange-50 via-white to-orange-50',
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_special_offers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_special_offers_updated_at 
  BEFORE UPDATE ON special_offers
  FOR EACH ROW 
  EXECUTE FUNCTION update_special_offers_updated_at();

-- Insert default special offer
INSERT INTO special_offers (
  title, 
  subtitle, 
  description, 
  features, 
  primary_button_text, 
  primary_button_link,
  secondary_button_text,
  secondary_button_link,
  display_order,
  is_active
) VALUES (
  'Need Bulk Orders?',
  '✨ SPECIAL OFFER',
  'Get special pricing and customized solutions for your business needs.',
  '["Volume discounts available", "Customized packaging options", "Dedicated account manager", "Priority delivery options"]'::jsonb,
  'Request Quote',
  '/contact',
  'Call Us',
  'tel:+8801234567890',
  1,
  TRUE
);

COMMIT;
