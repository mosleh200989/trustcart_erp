-- ============================================================================
-- IMS Seed Data — Initial Warehouses & Suppliers
-- Date: 2026-03-27
-- Run AFTER the phase-1 migration script
-- ============================================================================

BEGIN;

-- ── Warehouses ────────────────────────────────────────

INSERT INTO warehouses (code, name, type, address, city, district, country, phone, email, is_active, is_default, notes)
VALUES
  ('WH-MAIN',  'Main Warehouse',       'main',         'Plot 12, Block A, Uttara Sector 11', 'Dhaka', 'Dhaka', 'Bangladesh', '+880-2-8912345', 'warehouse@trustcart.com.bd', true, true,  'Primary warehouse for all products'),
  ('WH-COLD',  'Cold Storage Facility', 'cold_storage', 'Plot 5, Tongi Industrial Area',      'Gazipur', 'Gazipur', 'Bangladesh', '+880-2-8912346', 'cold@trustcart.com.bd',      true, false, 'Temperature-controlled for perishables'),
  ('WH-DARK1', 'Mirpur Dark Store',     'dark_store',   'House 45, Road 3, Mirpur DOHS',      'Dhaka', 'Dhaka', 'Bangladesh', '+880-2-8912347', NULL,                          true, false, 'Last-mile delivery hub for Mirpur area')
ON CONFLICT (code) DO NOTHING;

-- ── Warehouse Zones ───────────────────────────────────

INSERT INTO warehouse_zones (warehouse_id, name, type, temperature_min, temperature_max, humidity_min, humidity_max)
SELECT w.id, z.name, z.type, z.temp_min, z.temp_max, z.hum_min, z.hum_max
FROM (VALUES
  ('WH-MAIN',  'Ambient Storage A',   'ambient', NULL, NULL, NULL, NULL),
  ('WH-MAIN',  'Dry Goods Section',   'dry',     18.0, 25.0, 30.0, 50.0),
  ('WH-MAIN',  'Spices & Oils',       'dry',     18.0, 22.0, 30.0, 45.0),
  ('WH-COLD',  'Cold Room 1 (Dairy)', 'cold',     2.0,  8.0, 70.0, 85.0),
  ('WH-COLD',  'Cold Room 2 (Fruits)','cold',     4.0, 10.0, 80.0, 90.0),
  ('WH-COLD',  'Frozen Section',      'frozen',  -25.0, -15.0, NULL, NULL),
  ('WH-DARK1', 'Main Floor',          'ambient', NULL, NULL, NULL, NULL)
) AS z(wh_code, name, type, temp_min, temp_max, hum_min, hum_max)
JOIN warehouses w ON w.code = z.wh_code;

-- ── Warehouse Locations (sample bin/shelf codes) ──────

INSERT INTO warehouse_locations (warehouse_id, zone_id, code, aisle, rack, shelf, bin, location_type)
SELECT w.id, wz.id, loc.code, loc.aisle, loc.rack, loc.shelf, loc.bin, loc.loc_type
FROM (VALUES
  ('WH-MAIN', 'Ambient Storage A',   'A-01-01-A', 'A', '01', '01', 'A', 'storage'),
  ('WH-MAIN', 'Ambient Storage A',   'A-01-01-B', 'A', '01', '01', 'B', 'storage'),
  ('WH-MAIN', 'Ambient Storage A',   'A-01-02-A', 'A', '01', '02', 'A', 'storage'),
  ('WH-MAIN', 'Dry Goods Section',   'B-01-01-A', 'B', '01', '01', 'A', 'storage'),
  ('WH-MAIN', 'Spices & Oils',       'C-01-01-A', 'C', '01', '01', 'A', 'storage'),
  ('WH-MAIN', NULL,                   'RCV-01',    NULL, NULL, NULL, NULL, 'receiving'),
  ('WH-MAIN', NULL,                   'SHP-01',    NULL, NULL, NULL, NULL, 'shipping'),
  ('WH-COLD', 'Cold Room 1 (Dairy)', 'CR1-01-A',  'CR1','01', NULL, 'A',  'storage'),
  ('WH-COLD', 'Cold Room 2 (Fruits)','CR2-01-A',  'CR2','01', NULL, 'A',  'storage'),
  ('WH-COLD', 'Frozen Section',      'FRZ-01-A',  'FRZ','01', NULL, 'A',  'storage')
) AS loc(wh_code, zone_name, code, aisle, rack, shelf, bin, loc_type)
JOIN warehouses w ON w.code = loc.wh_code
LEFT JOIN warehouse_zones wz ON wz.warehouse_id = w.id AND wz.name = loc.zone_name;

-- ── Suppliers ─────────────────────────────────────────

INSERT INTO suppliers (code, company_name, company_name_bn, contact_person, email, phone, address, city, district, country, payment_terms, lead_time_days, category, certifications, status)
VALUES
  ('SUP-001', 'Green Valley Organic Farms',  'গ্রিন ভ্যালি অর্গানিক ফার্মস',  'Rahim Uddin',     'rahim@greenvalley.com.bd',   '+880-1712345001', 'Savar, Dhaka',         'Dhaka',      'Dhaka',      'Bangladesh', 'net_30', 3,  'organic_produce', '["organic","fair-trade"]',                'active'),
  ('SUP-002', 'Purbanchal Dairy Co.',        'পূর্বাঞ্চল ডেইরি কো.',           'Kamal Hossain',   'kamal@purbanchal.com.bd',    '+880-1712345002', 'Comilla Sadar',        'Comilla',    'Comilla',    'Bangladesh', 'net_15', 2,  'dairy',           '["gmp"]',                                'active'),
  ('SUP-003', 'Rangpur Grain Traders',       'রংপুর শস্য ব্যবসায়ী',            'Abdul Mannan',    'mannan@rangpurgrain.com.bd', '+880-1712345003', 'Station Road, Rangpur','Rangpur',    'Rangpur',    'Bangladesh', 'net_30', 5,  'grains',          '["organic"]',                             'active'),
  ('SUP-004', 'Sylhet Spice House',          'সিলেট মসলা ঘর',                   'Fatima Begum',    'fatima@sylhetspice.com.bd',  '+880-1712345004', 'Zindabazar, Sylhet',   'Sylhet',     'Sylhet',     'Bangladesh', 'cod',    4,  'spices',          '["organic","fair-trade","gmp"]',          'active'),
  ('SUP-005', 'EcoPack Solutions',           'ইকোপ্যাক সলিউশনস',                'Nasir Ahmed',     'nasir@ecopack.com.bd',       '+880-1712345005', 'Tejgaon, Dhaka',       'Dhaka',      'Dhaka',      'Bangladesh', 'net_60', 7,  'packaging',       '[]',                                      'active')
ON CONFLICT (code) DO NOTHING;

COMMIT;
