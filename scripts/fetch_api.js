const http = require('http');
const fetch = require('node-fetch');
(async () => {
  try {
    const productsRes = await fetch('http://localhost:3001/products?limit=20');
    const products = await productsRes.json();
    console.log('PRODUCTS_COUNT=' + (Array.isArray(products) ? products.length : Object.keys(products).length));
    console.log('PRODUCTS_SAMPLE=');
    console.log(JSON.stringify(products[0] || products, null, 2));

    const categoriesRes = await fetch('http://localhost:3001/categories');
    const categories = await categoriesRes.json();
    console.log('CATEGORIES_COUNT=' + (Array.isArray(categories) ? categories.length : Object.keys(categories).length));
    console.log('CATEGORIES_SAMPLE=');
    console.log(JSON.stringify(categories[0] || categories, null, 2));
  } catch (err) {
    console.error('ERROR', err.message);
    process.exit(1);
  }
})();
