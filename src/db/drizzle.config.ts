import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const sqlHost = process.env.SQL_HOST;

if (!databaseUrl && !sqlHost) {
  throw new Error("DATABASE_URL or SQL_HOST must be set in environment variables.");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials: databaseUrl ? {
    url: databaseUrl,
    ssl: { rejectUnauthorized: false }
  } : {
    host: sqlHost!,
    user: process.env.SQL_ADMIN_USER || process.env.SQL_USER!,
    password: process.env.SQL_ADMIN_PASSWORD || process.env.SQL_PASSWORD!,
    database: process.env.SQL_DB_NAME!,
    ssl: false,
  },
  verbose: true,
});
