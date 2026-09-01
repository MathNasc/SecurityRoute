import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
dotenv.config();

declare global {
  var _postgresPool: Pool | undefined;
}

export const createPool = () => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool({
      host: process.env.SQL_HOST || '127.0.0.1',
      database: process.env.SQL_DB_NAME || 'postgres',
      user: process.env.SQL_USER || 'postgres',
      password: process.env.SQL_PASSWORD || 'postgres',
      port: 5432,
    });
  }
  return global._postgresPool;
};

export const db = drizzle(createPool(), { schema });
