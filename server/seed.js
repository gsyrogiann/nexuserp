import 'dotenv/config';
import { prisma } from './db.js';
import { seedDatabase } from './runtime.js';

async function run() {
  await seedDatabase(prisma);
  console.log('Owned runtime database seeded.');
}

run()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
