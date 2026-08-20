// Quick script to run deal_of_the_day migration
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'c0mm0n',
    database: process.env.DB_NAME || 'trustcart_erp',
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    const sql = fs.readFileSync(
      path.join(__dirname, 'deal-of-the-day-migration.sql'),
      'utf8'
    );

    await client.query(sql);
    console.log('✓ Migration completed successfully!');
    console.log('✓ Table "deal_of_the_day" created');
  } catch (error) {
    console.error('✗ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
