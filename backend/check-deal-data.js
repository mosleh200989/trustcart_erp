// Check if there's any Deal of the Day data
const { Client } = require('pg');

async function checkDealData() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'c0mm0n',
    database: process.env.DB_NAME || 'trustcart_erp',
  });

  try {
    await client.connect();
    
    // Check for active deals
    const result = await client.query(`
      SELECT d.*, p.name_en, p.base_price, p.sale_price, p.image_url
      FROM deal_of_the_day d
      LEFT JOIN products p ON p.id = d.product_id
      WHERE d.is_active = true
      AND (d.end_date IS NULL OR d.end_date > CURRENT_TIMESTAMP)
      ORDER BY d.created_at DESC
    `);
    
    console.log('\n=== Deal of the Day Data ===');
    console.log('Active deals found:', result.rows.length);
    
    if (result.rows.length > 0) {
      console.log('\nActive deal:');
      console.table(result.rows);
    } else {
      console.log('\nNo active deal found.');
      console.log('\nAvailable products (first 5):');
      const products = await client.query(`
        SELECT id, name_en, base_price, sale_price 
        FROM products 
        WHERE is_active = true 
        LIMIT 5
      `);
      console.table(products.rows);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDealData();
