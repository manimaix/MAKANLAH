import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const backendRoot = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(backendRoot, ".env"), quiet: true });
export function loadConfig(overrides = {}) {
  const production = process.env.NODE_ENV === "production";
  const config = {
    port: Number(process.env.PORT || 3001), host: process.env.HOST || "127.0.0.1", production,
    dataDir: path.resolve(backendRoot, process.env.DATA_DIR || "./var"),
    appOrigin: process.env.APP_ORIGIN || "http://127.0.0.1:5173",
    databaseDriver: process.env.DATABASE_DRIVER || "postgres", databaseUrl: process.env.DATABASE_URL,
    databaseSchema: process.env.DATABASE_SCHEMA || "public", databasePoolSize: Number(process.env.DATABASE_POOL_SIZE || 10),
    mediaDriver: process.env.MEDIA_DRIVER || "local", demoPassword: process.env.DEMO_PASSWORD,
    demoMode: process.env.DEMO_MODE ? process.env.DEMO_MODE === "true" : !production,
    maxUploadBytes: 80 * 1024 * 1024, ...overrides,
  };
  if (config.databaseDriver !== "postgres") throw new Error("Makanlah now requires PostgreSQL. Use npm run migrate:sqlite to import an old SQLite database.");
  if (!config.databaseUrl) throw new Error("Set DATABASE_URL in backend/.env. For a local database, run npm run db:setup from backend/ first.");
  if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(config.databaseSchema)) throw new Error("Invalid DATABASE_SCHEMA.");
  if (!Number.isInteger(config.databasePoolSize) || config.databasePoolSize < 1 || config.databasePoolSize > 100) throw new Error("DATABASE_POOL_SIZE must be between 1 and 100.");
  return config;
}
