const { PrismaClient } = require('@prisma/client'); 
const prisma = new PrismaClient(); 

async function main() { 
  const p = await prisma.product.findUnique({ where: { code: 'P000002' } }); 
  console.log(p); 
} 

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
