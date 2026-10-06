import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: connectionString
    ? { url: connectionString }
    : {
        host: process.env.DATABASE_HOST || process.env.SQL_HOST || '127.0.0.1',
        port: Number(process.env.DATABASE_PORT || process.env.SQL_PORT || 5435),
        user: process.env.DATABASE_USER || process.env.SQL_USER || process.env.SQL_ADMIN_USER || 'securityroute_user',
        password: process.env.DATABASE_PASSWORD || process.env.SQL_PASSWORD || process.env.SQL_ADMIN_PASSWORD || '',
        database: process.env.DATABASE_NAME || process.env.SQL_DB_NAME || 'securityroute_db',
        ssl: false,
      },
});
