import path from 'node:path';
import { PrismaClient } from '@prisma/client';

process.env.DATABASE_URL = `file:${path.resolve(process.cwd(), 'prisma/dev.db')}`;

export const prisma = new PrismaClient();
