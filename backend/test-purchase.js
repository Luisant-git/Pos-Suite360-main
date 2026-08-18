

const jwt = require('jsonwebtoken');

async function test() {
  try {
    const suppliersRes = await fetch('http://localhost:3000/suppliers');
    const suppliers = await suppliersRes.json();
    const sId = suppliers.length > 0 ? suppliers[0].id : 1;

    const pmRes = await fetch('http://localhost:3000/payment-modes');
    const pms = await pmRes.json();
    const pmId = pms.length > 0 ? pms[0].id : 1;

    const productsRes = await fetch('http://localhost:3000/products');
    const products = await productsRes.json();
    const pId = products.length > 0 ? products[0].id : 1;

    const token = jwt.sign({ userId: 1, username: 'admin' }, 'super-secret-key-360', { expiresIn: '1h' });
    const purchasesRes = await fetch('http://localhost:3000/purchases', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const purchases = await purchasesRes.json();
    console.log('Purchases:', purchases);
  } catch (err) {
    console.error('Error:', err.response ? err.response.data : err.message);
  }
}
test();
