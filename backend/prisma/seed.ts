import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL || "postgresql://postgres:root@localhost:5432/pos-suite360?schema=public" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding default role and user...');

  const role = await prisma.role.upsert({
    where: { name: 'Admin' },
    update: {},
    create: {
      name: 'Admin',
      permissions: ['ALL'],
    },
  });

  const hashedPassword = await bcrypt.hash('password', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      name: 'Pro X Admin',
      roleId: role.id,
    },
  });

  const expenseCategories = [
    'Electricity Bill',
    'Shop Rent',
    'Tea & Refreshments',
    'Internet / Phone',
    'Maintenance & Repairs',
    'Miscellaneous'
  ];

  for (const name of expenseCategories) {
    await prisma.expenseCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  const paymentModes = ['Cash', 'Bank Transfer', 'UPI'];
  for (const name of paymentModes) {
    await prisma.paymentMode.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log('Seeding complete!', admin.username);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
