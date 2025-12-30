// Check if deal_of_the_day table exists
const { Client } = require('pg');

async function checkTable() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'c0mm0n',
    database: process.env.DB_NAME || 'trustcart_erp',
  });

  try {
    await client.connect();
    
    // Check if table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'deal_of_the_day'
      );
    `);
    
    console.log('Table exists:', result.rows[0].exists);
    
    if (result.rows[0].exists) {
      // Get table structure
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'deal_of_the_day'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nTable structure:');
      console.table(columns.rows);
    } else {
      console.log('Table does not exist - creating it now...');
      
      const sql = `
        CREATE TABLE IF NOT EXISTS deal_of_the_day (
          id SERIAL PRIMARY KEY,
          product_id INTEGER NOT NULL,
          start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          end_date TIMESTAMP,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT fk_product
            FOREIGN KEY (product_id)
            REFERENCES products(id)
            ON DELETE CASCADE
        );
      `;
      
      await client.query(sql);
      console.log('✓ Table created successfully!');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTable();
