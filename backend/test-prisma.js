const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  console.log('PaymentModes:', await prisma.paymentMode.findMany());
  console.log('Suppliers:', await prisma.supplier.findMany());
  console.log('Products:', await prisma.product.findMany());
}
check();
