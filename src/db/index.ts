import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool(
  connectionString
    ? { connectionString, connectionTimeoutMillis: 5000 }
    : {
        host: process.env.DATABASE_HOST || process.env.SQL_HOST || '127.0.0.1',
        port: Number(process.env.DATABASE_PORT || process.env.SQL_PORT || 5435),
        database: process.env.DATABASE_NAME || process.env.SQL_DB_NAME || 'securityroute_db',
        user: process.env.DATABASE_USER || process.env.SQL_USER || 'securityroute_user',
        password: process.env.DATABASE_PASSWORD || process.env.SQL_PASSWORD || '',
        connectionTimeoutMillis: 5000,
      }
);

export const db = drizzle(pool, { schema });
export * from './databaseService.js';
