require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL.replace(/^"|"$/g, '') });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Starting sequential product code update...');
  
  const products = await prisma.product.findMany({
    orderBy: { id: 'asc' }
  });

  console.log('Found ' + products.length + ' products to update.');

  // PASS 1: Assign temporary codes to avoid unique constraint violations
  console.log('Pass 1: Assigning temporary codes...');
  for (const product of products) {
    const tempCode = 'TMP-' + product.id + '-' + Math.random().toString(36).substring(7);
    await prisma.product.update({
      where: { id: product.id },
      data: { code: tempCode }
    });
  }

  // PASS 2: Assign final sequential codes
  console.log('Pass 2: Assigning correct sequential codes (P000001, etc.)...');
  let counter = 1;
  for (const product of products) {
    const paddedId = String(counter).padStart(6, '0');
    const newCode = 'P' + paddedId;

    try {
      await prisma.product.update({
        where: { id: product.id },
        data: { code: newCode }
      });
      console.log('Updated product ID ' + product.id + ' -> ' + newCode);
    } catch (error) {
      console.error('Failed to update product ID ' + product.id + ':', error.message);
    }
    counter++;
  }

  console.log('Product code update completed successfully in correct order!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
