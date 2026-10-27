import "dotenv/config";
import path from "node:path";
export function loadConfig(overrides = {}) {
  const production = process.env.NODE_ENV === "production";
  const dataDir = path.resolve(process.env.DATA_DIR || "./var");
  return {
    port: Number(process.env.PORT || 3001),
    host: process.env.HOST || "127.0.0.1",
    production,
    dataDir,
    appOrigin: process.env.APP_ORIGIN || "http://localhost:5173",
    databaseDriver: process.env.DATABASE_DRIVER || "sqlite",
    databaseUrl: process.env.DATABASE_URL,
    mediaDriver: process.env.MEDIA_DRIVER || "local",
    demoPassword: process.env.DEMO_PASSWORD,
    demoMode: process.env.DEMO_MODE
      ? process.env.DEMO_MODE === "true"
      : !production,
    maxUploadBytes: 80 * 1024 * 1024,
    ...overrides,
  };
}
