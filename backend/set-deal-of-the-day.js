// Script to set a Deal of the Day
const { Client } = require('pg');

async function setDealOfTheDay() {
  const client = new Client({
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432'),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'c0mm0n',
    database: process.env.DB_NAME || 'trustcart_erp',
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    // Get a random active product
    const product = await client.query(`
      SELECT id, name_en, base_price, sale_price, image_url
      FROM products
      WHERE status = 'active' AND image_url IS NOT NULL
      ORDER BY RANDOM()
      LIMIT 1
    `);

    if (product.rows.length === 0) {
      console.log('No active products found');
      return;
    }

    const selectedProduct = product.rows[0];
    console.log('Selected product for Deal of the Day:');
    console.log(`  ID: ${selectedProduct.id}`);
    console.log(`  Name: ${selectedProduct.name_en}`);
    console.log(`  Price: ৳${selectedProduct.base_price}`);
    console.log('');

    // Deactivate any existing deal
    await client.query(`
      UPDATE deal_of_the_day
      SET is_active = false
      WHERE is_active = true
    `);
    console.log('✓ Deactivated existing deals\n');

    // Create new deal (valid for 7 days)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    await client.query(`
      INSERT INTO deal_of_the_day (product_id, start_date, end_date, is_active)
      VALUES ($1, CURRENT_TIMESTAMP, $2, true)
    `, [selectedProduct.id, endDate]);

    console.log('✓ Deal of the Day created successfully!');
    console.log(`  Valid until: ${endDate.toLocaleDateString()}`);
    console.log('\n🎉 You can now see it on the frontend homepage!');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

setDealOfTheDay();
