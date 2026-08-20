-- Add district column to customer_addresses table if it doesn't exist
ALTER TABLE customer_addresses 
ADD COLUMN IF NOT EXISTS district VARCHAR(100);

-- Add comment
COMMENT ON COLUMN customer_addresses.district IS 'District or sub-region within state/province';
