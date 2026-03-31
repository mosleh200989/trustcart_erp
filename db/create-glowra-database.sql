-- =============================================
-- Natural Glowra Database Initialization
-- =============================================
-- Run this script to create the Natural Glowra database.
-- The schema is identical to TrustCart ERP — both tenants
-- share the same entity/table structure.
--
-- Usage:
--   psql -U postgres -f create-glowra-database.sql
-- =============================================

-- Create database (run as superuser)
-- NOTE: CREATE DATABASE cannot run inside a transaction block,
--       so just run this single statement directly.
CREATE DATABASE natural_glowra;

-- Connect to the new database and apply the same schema
-- as trustcart_erp.  The easiest approach:
--
--   pg_dump -U postgres -s trustcart_erp | psql -U postgres -d natural_glowra
--
-- This copies only the SCHEMA (no data) from the primary database.
-- After that, both databases will have the same tables, indexes,
-- and constraints. Each operates independently.
