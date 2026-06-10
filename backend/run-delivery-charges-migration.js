// Node script to run product delivery charges migration
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Load environment variables from root .env

async function runSQL(config, sql) {
  const client = new Client(config);
  try {
    await client.connect();
    console.log(`✓ Connected to database: ${config.database} on ${config.host}:${config.port}`);
    await client.query(sql);
    console.log(`✓ Migration completed successfully for ${config.database}!`);
  } catch (error) {
    console.error(`✗ Migration failed for ${config.database}:`, error.message);
  } finally {
    await client.end();
  }
}

async function runMigration() {
  const sqlFile = path.join(__dirname, '..', 'db', 'migrations', '2026-06-11-add-product-landing-delivery-charges.sql');
  if (!fs.existsSync(sqlFile)) {
    console.error(`✗ SQL file not found at ${sqlFile}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(sqlFile, 'utf8');

  // Primary TrustCart Database Config
  const trustcartConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'trustcart_erp',
  };

  // Secondary Natural Glowra Database Config (if running)
  const glowraConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    port: 5433, // port 5433 mapped in docker-compose for glowra
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
    database: 'natural_glowra',
  };

  console.log('Running TrustCart database migrations...');
  await runSQL(trustcartConfig, sql);

  console.log('\nRunning Natural Glowra database migrations (if active)...');
  await runSQL(glowraConfig, sql);
}

runMigration();
