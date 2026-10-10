import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

export let pool: Pool | null = null;
export let db: any = null;

if (connectionString) {
  try {
    pool = new Pool({ connectionString, connectionTimeoutMillis: 3000 });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.warn('[AI Studio] Database connection initialization failed — using mock store:', err);
    pool = null;
    db = null;
  }
} else {
  console.warn('[AI Studio] DATABASE_URL not set — using in-memory store');
}

export * from './databaseService.ts';
