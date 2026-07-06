import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

let connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (connectionString && !connectionString.startsWith('postgres://') && !connectionString.startsWith('postgresql://')) {
  connectionString = null;
}

let config;
if (connectionString) {
  config = {
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    schemaFilter: ["public"],
    dbCredentials: {
      url: connectionString,
    },
    verbose: true,
  };
} else {
  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER;
  const password = process.env.SQL_ADMIN_PASSWORD;

  if (!sqlHost) {
    throw new Error("DATABASE_URL or SQL_HOST must be set in environment variables.");
  }
  if (!sqlDbName) {
    throw new Error("SQL_DB_NAME must be set in environment variables.");
  }
  if (!user) {
    throw new Error("SQL_ADMIN_USER must be set in environment variables.");
  }
  if (!password) {
    throw new Error("SQL_ADMIN_PASSWORD must be set in environment variables.");
  }

  console.log(`Using user: ${user} to connect to database.`);

  config = {
    schema: "./src/db/schema.ts",
    out: "./drizzle",
    dialect: "postgresql",
    schemaFilter: ["public"],
    dbCredentials: {
      host: sqlHost,
      user: user,
      password: password,
      database: sqlDbName,
      ssl: false,
    },
    verbose: true,
  };
}

export default defineConfig(config as any);
