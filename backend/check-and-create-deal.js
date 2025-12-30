const { Client } = require('pg');

async function checkAndCreateDeal() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '30122000',
    database: 'trustcart_erp'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check existing deals
    console.log('\n📊 Checking existing deals...');
    const existingDeals = await client.query('SELECT * FROM deal_of_the_day ORDER BY created_at DESC');
    console.log(`Found ${existingDeals.rows.length} deals in database:`);
    existingDeals.rows.forEach(deal => {
      console.log(`  - ID: ${deal.id}, Product ID: ${deal.product_id}, Active: ${deal.is_active}, End Date: ${deal.end_date}`);
    });

    // Check if there's any active product
    console.log('\n🔍 Finding an active product...');
    const productResult = await client.query(`
      SELECT id, name_en, base_price, sale_price, image_url 
      FROM products 
      WHERE status = 'active' 
      ORDER BY id 
      LIMIT 1
    `);

    if (productResult.rows.length === 0) {
      console.log('❌ No active products found! Please add products first.');
      return;
    }

    const product = productResult.rows[0];
    console.log(`✅ Found product: ID ${product.id} - ${product.name_en} (৳${product.sale_price || product.base_price})`);

    // Deactivate all existing deals
    console.log('\n🔄 Deactivating all existing deals...');
    await client.query('UPDATE deal_of_the_day SET is_active = false');

    // Create new deal
    console.log('\n✨ Creating new Deal of the Day...');
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Valid for 7 days

    const insertResult = await client.query(`
      INSERT INTO deal_of_the_day (product_id, start_date, end_date, is_active)
      VALUES ($1, NOW(), $2, true)
      RETURNING *
    `, [product.id, endDate]);

    const newDeal = insertResult.rows[0];
    console.log('✅ Deal created successfully!');
    console.log(`   Deal ID: ${newDeal.id}`);
    console.log(`   Product ID: ${newDeal.product_id}`);
    console.log(`   Product: ${product.name_en}`);
    console.log(`   Price: ৳${product.sale_price || product.base_price}`);
    console.log(`   Valid until: ${endDate.toLocaleDateString()}`);

    console.log('\n🎉 Done! You can now view the Deal of the Day on the homepage.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAndCreateDeal();
