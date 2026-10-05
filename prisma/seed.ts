import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database seeding is disabled in production');
  }

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const user = await prisma.user.upsert({
    where: {
      email: 'test@dev.com',
    },

    update: {},

    create: {
      email: 'test@dev.com',
      fullName: 'Test User',
      passwordHash,
      role: 'OWNER',
      active: true,
      hotelId: null,
    },
  });

  console.log('User ready:', {
    id: user.id,
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
