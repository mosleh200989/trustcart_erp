/**
 * Script: Update Customer Names from External API
 * 
 * Iterates through all customers whose name is NULL, empty, or
 * follows the placeholder pattern "Customer {phone_number}".
 * Calls the kasrioil API with their phone number and updates
 * the name field with the "line1" from the API response.
 * 
 * Usage:
 *   # Local database (uses defaults from .env or hardcoded)
 *   node scripts/update-customer-names.js
 * 
 *   # Production database (pass connection string)
 *   node scripts/update-customer-names.js --db "postgresql://user:pass@vps-ip:5432/trustcart_erp"
 * 
 *   # Or use environment variables
 *   set DATABASE_URL=postgresql://user:pass@vps-ip:5432/trustcart_erp
 *   node scripts/update-customer-names.js
 * 
 *   # Custom chunk size (default 500)
 *   node scripts/update-customer-names.js --chunk 200
 * 
 *   # Dry run (no actual updates, just logs what would happen)
 *   node scripts/update-customer-names.js --dry-run
 */

const { Client } = require('pg');
const https = require('https');
const http = require('http');

// ─── Configuration ──────────────────────────────────────────────
const API_BASE = 'https://kasrioil.com/dropbd/api/v1/sales/customerinfo';
const API_KEY = 'sk4ksoc0oc44kw0wcow8c8wk8cw0skwscgskck4s';

const DEFAULTS = {
  DB_HOST: 'localhost',
  DB_PORT: 5432,
  DB_NAME: 'trustcart_erp',
  DB_USER: 'postgres',
  DB_PASSWORD: '123456',
  CHUNK_SIZE: 500,
  API_DELAY_MS: 100,        // delay between API calls to avoid rate limiting
  MAX_RETRIES: 2,           // retries per API call on failure
  REQUEST_TIMEOUT_MS: 10000 // 10s timeout per API request
};

// ─── Parse CLI args ─────────────────────────────────────────────
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {
    databaseUrl: null,
    chunkSize: DEFAULTS.CHUNK_SIZE,
    dryRun: false,
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && args[i + 1]) {
      config.databaseUrl = args[++i];
    } else if (args[i] === '--chunk' && args[i + 1]) {
      config.chunkSize = parseInt(args[++i], 10);
    } else if (args[i] === '--dry-run') {
      config.dryRun = true;
    }
  }

  return config;
}

// ─── Database connection ────────────────────────────────────────
function getConnectionConfig(databaseUrl) {
  if (databaseUrl) {
    return { connectionString: databaseUrl, ssl: { rejectUnauthorized: false } };
  }

  // Check environment variables
  if (process.env.DATABASE_URL) {
    const isRemote = !process.env.DATABASE_URL.includes('localhost') &&
                     !process.env.DATABASE_URL.includes('127.0.0.1');
    return {
      connectionString: process.env.DATABASE_URL,
      ...(isRemote ? { ssl: { rejectUnauthorized: false } } : {})
    };
  }

  // Fall back to individual env vars or defaults
  return {
    host: process.env.DB_HOST || DEFAULTS.DB_HOST,
    port: parseInt(process.env.DB_PORT || DEFAULTS.DB_PORT, 10),
    database: process.env.DB_NAME || DEFAULTS.DB_NAME,
    user: process.env.DB_USER || DEFAULTS.DB_USER,
    password: process.env.DB_PASSWORD || DEFAULTS.DB_PASSWORD,
  };
}

// ─── API call helper ────────────────────────────────────────────
function callCustomerAPI(phone) {
  return new Promise((resolve, reject) => {
    const url = `${API_BASE}?api-key=${API_KEY}&mobile=${encodeURIComponent(phone)}`;
    const client = url.startsWith('https') ? https : http;

    const req = client.get(url, { timeout: DEFAULTS.REQUEST_TIMEOUT_MS }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          resolve(null); // invalid JSON → skip
        }
      });
    });

    req.on('error', (err) => resolve(null));  // network error → skip
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });
  });
}

async function callWithRetry(phone, retries = DEFAULTS.MAX_RETRIES) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const result = await callCustomerAPI(phone);
    if (result !== null) return result;
    if (attempt < retries) {
      await sleep(500 * (attempt + 1)); // backoff
    }
  }
  return null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── Main logic ─────────────────────────────────────────────────
async function main() {
  const config = parseArgs();
  const connConfig = getConnectionConfig(config.databaseUrl);
  const client = new Client(connConfig);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Customer Name Update Script');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Database: ${config.databaseUrl || process.env.DATABASE_URL || 'local (defaults)'}`);
  console.log(`  Chunk size: ${config.chunkSize}`);
  console.log(`  Dry run: ${config.dryRun}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Count total customers needing name update
    // Matches: NULL name, empty name, or name like "Customer 01XXXXXXXXX"
    const countResult = await client.query(`
      SELECT COUNT(*) as total 
      FROM customers 
      WHERE (
        name IS NULL 
        OR TRIM(name) = '' 
        OR name ~ '^Customer \\d{11}$'
      )
        AND phone IS NOT NULL AND TRIM(phone) != ''
    `);
    const totalNoName = parseInt(countResult.rows[0].total, 10);
    console.log(`Found ${totalNoName} customers needing name update (with a phone number)\n`);

    if (totalNoName === 0) {
      console.log('Nothing to do. All customers already have names.');
      return;
    }

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let apiErrors = 0;
    let chunkNumber = 0;
    let lastId = 0; // cursor-based pagination

    while (true) {
      chunkNumber++;
      // Fetch a chunk using cursor-based pagination (id > lastId)
      // This avoids the OFFSET bug where updated rows shift the result set
      const chunkResult = await client.query(`
        SELECT id, phone, name 
        FROM customers 
        WHERE (
          name IS NULL 
          OR TRIM(name) = '' 
          OR name ~ '^Customer \\d{11}$'
        )
          AND phone IS NOT NULL AND TRIM(phone) != ''
          AND id > $1
        ORDER BY id ASC
        LIMIT $2
      `, [lastId, config.chunkSize]);

      const customers = chunkResult.rows;
      if (customers.length === 0) break;

      // Track the last ID for cursor pagination
      lastId = customers[customers.length - 1].id;

      console.log(`── Chunk ${chunkNumber} ` +
                  `(${processed + 1} - ${processed + customers.length} of ${totalNoName}) ──`);

      for (const customer of customers) {
        processed++;
        const phone = customer.phone.trim();

        // Call the external API
        const apiResponse = await callWithRetry(phone);

        if (!apiResponse || !apiResponse.data || !apiResponse.data.line1 ||
            typeof apiResponse.data.line1 !== 'string' || apiResponse.data.line1.trim() === '') {
          skipped++;
          if (!apiResponse) apiErrors++;
          continue;
        }

        const newName = apiResponse.data.line1.trim();

        if (config.dryRun) {
          console.log(`  [DRY RUN] ID=${customer.id} phone=${phone} → name="${newName}"`);
        } else {
          await client.query(
            'UPDATE customers SET name = $1, updated_at = NOW() WHERE id = $2',
            [newName, customer.id]
          );
        }

        updated++;

        // Progress log every 50 updates
        if (updated % 50 === 0) {
          console.log(`  Progress: ${processed}/${totalNoName} processed, ${updated} updated, ${skipped} skipped`);
        }

        // Small delay to avoid hammering the API
        await sleep(DEFAULTS.API_DELAY_MS);
      }

      console.log(`  Chunk done. Updated so far: ${updated}\n`);
    }

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  Total processed:  ${processed}`);
    console.log(`  Updated:          ${updated}`);
    console.log(`  Skipped:          ${skipped}`);
    console.log(`  API errors:       ${apiErrors}`);
    console.log(`  Dry run:          ${config.dryRun}`);
    console.log('═══════════════════════════════════════════════════════════');

  } catch (err) {
    console.error('\n✗ Error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n✓ Database connection closed');
  }
}

main();
