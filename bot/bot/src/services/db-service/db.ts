//import { PrismaClient } from '@prisma/client';

// Создаём ОДНОГО клиента (глобальный, переиспользуем в приложении)
//const prisma = new PrismaClient();

//export default prisma;

import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
