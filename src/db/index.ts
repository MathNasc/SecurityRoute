import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
dotenv.config();

let db: any;
try {
  const pool = new Pool({
    host: process.env.SQL_HOST || '127.0.0.1',
    database: process.env.SQL_DB_NAME || 'postgres',
    user: process.env.SQL_USER || 'postgres',
    password: process.env.SQL_PASSWORD || 'postgres',
    port: 5432,
    connectionTimeoutMillis: 1000,
  });
  db = drizzle(pool, { schema });
} catch {
  console.warn('[AI Studio] Database not connected — using mock');
  const noOp = {
    findMany: async () => [],
    findFirst: async () => null,
    findUnique: async () => null,
    create: async (d: any) => d?.data ?? {},
    update: async (d: any) => d?.data ?? {},
    delete: async () => ({}),
  };
  db = new Proxy({}, {
    get: (_, prop) => prop === 'query'
      ? new Proxy({}, { get: () => noOp }) : async () => [],
  });
}

export { db };
