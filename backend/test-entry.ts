import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function test() {
  const lastPurchase = await prisma.purchase.findFirst({
    orderBy: { id: 'desc' },
    select: { invoiceNo: true },
  });
  console.log("lastPurchase:", lastPurchase);
}

test().catch(console.error).finally(() => prisma.$disconnect());
