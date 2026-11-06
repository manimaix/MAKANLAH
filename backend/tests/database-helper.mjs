import pg from "pg";
import { randomUUID } from "node:crypto";
import { loadConfig } from "../src/config.mjs";
export async function testDatabase() {
  const config = loadConfig({ databaseUrl: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL });
  const schema = "makanlah_test_" + randomUUID().replaceAll("-", "");
  const pool = new pg.Pool({ connectionString: config.databaseUrl, connectionTimeoutMillis: 5000 });
  try { await pool.query('CREATE SCHEMA "' + schema + '"'); } catch (error) { await pool.end(); throw error; }
  return {
    config: { databaseUrl: config.databaseUrl, databaseSchema: schema, databasePoolSize: 5 },
    async cleanup() {
      if (!/^makanlah_test_[a-f0-9]{32}$/.test(schema)) throw new Error("Invalid test schema.");
      try { await pool.query('DROP SCHEMA "' + schema + '" CASCADE'); } finally { await pool.end(); }
    },
  };
}
