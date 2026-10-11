import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

export let pool: Pool | null = null;
export let db: any = null;

function isValidDatabaseUrl(url?: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    // Reject dummy placeholder hosts like 'host', 'example.com' or missing host
    if (!parsed.hostname || parsed.hostname === 'host' || parsed.hostname === 'example.com') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function disableDb() {
  db = null;
  if (pool) {
    try { pool.end().catch(() => {}); } catch {}
    pool = null;
  }
}

if (isValidDatabaseUrl(connectionString)) {
  try {
    pool = new Pool({ connectionString, connectionTimeoutMillis: 2000 });
    db = drizzle(pool, { schema });
  } catch (err) {
    console.warn('[AI Studio] Database connection initialization failed — using mock store:', err);
    disableDb();
  }
} else {
  console.log('[AI Studio] No external database configured or placeholder host detected — using in-memory store.');
  pool = null;
  db = null;
}

export * from './databaseService.ts';
