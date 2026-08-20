// Quick script to run Phase 1 CRM enhancements migration
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'c0mm0n',
    database: process.env.DB_NAME || 'trustcart_erp',
  });

  const sqlFile = path.join(__dirname, 'phase1-crm-enhancements-migration.sql');

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const sql = fs.readFileSync(sqlFile, 'utf8');

    await client.query(sql);
    console.log('✓ Migration completed successfully!');
    console.log('✓ Ensured tables: sales_pipelines, custom_deal_stages (and more)');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
