import fs from "node:fs/promises";
import path from "node:path";
import net from "node:net";
import { randomBytes } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL, fileURLToPath } from "node:url";
import dotenv from "dotenv";
import pg from "pg";
const run = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const defaultData = process.platform === "win32" ? path.join(process.env.LOCALAPPDATA, "Makanlah", "PostgreSQL-17") : path.join(root, "var", "postgres");
const dataFor = settings => path.resolve(settings.LOCAL_PG_DATA_DIR || process.env.LOCAL_PG_DATA_DIR || defaultData);
const envFile = path.join(root, ".env");
const adminFile = path.join(root, "var", "local-postgres-admin.json");
const exists = async file => !!(await fs.stat(file).catch(() => null));
const readEnv = async () => dotenv.parse(await fs.readFile(envFile).catch(() => Buffer.from("")));
const binary = (bin, name) => bin ? path.join(bin, name + (process.platform === "win32" ? ".exe" : "")) : name;
async function findBin() {
  if (process.env.POSTGRES_BIN) return process.env.POSTGRES_BIN;
  if (process.platform === "win32") {
    const base = path.join(process.env.ProgramFiles || "C:/Program Files", "PostgreSQL");
    const versions = await fs.readdir(base).catch(() => []);
    for (const version of versions.sort((a, b) => Number(b) - Number(a))) {
      const dir = path.join(base, version, "bin");
      if (await exists(path.join(dir, "initdb.exe"))) return dir;
    }
    throw new Error("PostgreSQL is not installed. Install PostgreSQL or set POSTGRES_BIN to its bin directory.");
  }
  return "";
}
const command = (bin, name, args) => run(binary(bin, name), args, { windowsHide: true, timeout: 60000, maxBuffer: 1024 * 1024 });
async function start(settings) {
  const data = dataFor(settings);
  if (!await exists(path.join(data, "PG_VERSION"))) throw new Error("Run npm run db:setup first.");
  const bin = settings.LOCAL_PG_BIN || await findBin();
  const status = await command(bin, "pg_ctl", ["-D", data, "status"]).then(() => true).catch(() => false);
  if (!status) await command(bin, "pg_ctl", ["-D", data, "-l", path.join(path.dirname(data), "postgres.log"), "-o", "-h 127.0.0.1 -p " + settings.LOCAL_PG_PORT, "-w", "start"]);
}
export async function startManagedPostgres() {
  const settings = await readEnv();
  if (process.env.LOCAL_PG_MANAGED === "false" || settings.LOCAL_PG_MANAGED !== "true") return;
  await start(settings);
}
async function freePort(port) {
  return new Promise(resolve => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.listen(port, "127.0.0.1", () => server.close(() => resolve(true)));
  });
}
async function ensureDatabase(settings) {
  const admin = JSON.parse(await fs.readFile(adminFile, "utf8"));
  const pool = new pg.Pool({ host: "127.0.0.1", port: Number(settings.LOCAL_PG_PORT), user: admin.user, password: admin.password, database: "postgres", connectionTimeoutMillis: 5000 });
  try {
    const password = decodeURIComponent(new URL(settings.DATABASE_URL).password);
    if (!(await pool.query("SELECT 1 FROM pg_roles WHERE rolname=$1", ["makanlah"])).rowCount) {
      await pool.query("CREATE ROLE makanlah LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '" + password.replaceAll("'", "''") + "'");
    }
    if (!(await pool.query("SELECT 1 FROM pg_database WHERE datname=$1", ["makanlah"])).rowCount) await pool.query("CREATE DATABASE makanlah OWNER makanlah");
  } finally { await pool.end(); }
}
async function setup() {
  const current = await readEnv();
  const data = dataFor(current);
  if (current.DATABASE_URL && current.LOCAL_PG_MANAGED !== "true") throw new Error("backend/.env already specifies another database. Setup will not replace that connection.");
  if (current.LOCAL_PG_MANAGED === "true") {
    await start(current);
    await ensureDatabase(current);
    console.log("Existing Makanlah PostgreSQL instance is ready on port " + current.LOCAL_PG_PORT + ".");
    return;
  }
  if (await exists(path.join(data, "PG_VERSION"))) throw new Error("An existing PostgreSQL cluster has no matching configuration. Restore backend/.env before proceeding.");
  const bin = await findBin();
  let port = 5433;
  while (port < 5443 && !await freePort(port)) port++;
  if (port === 5443) throw new Error("No free local PostgreSQL port in 5433-5442.");
  await fs.mkdir(path.join(root, "var"), { recursive: true });
  const admin = await fs.readFile(adminFile, "utf8").then(JSON.parse).catch(() => ({ user: "makanlah_admin", password: randomBytes(32).toString("hex") }));
  const password = randomBytes(32).toString("hex");
  const pwFile = path.join(root, "var", ".initdb-password");
  if (!await exists(adminFile)) await fs.writeFile(adminFile, JSON.stringify(admin), { mode: 0o600, flag: "wx" });
  await fs.mkdir(path.dirname(data), { recursive: true });
  await fs.writeFile(pwFile, admin.password, { mode: 0o600, flag: "wx" });
  try {
    await command(bin, "initdb", ["-D", data, "--encoding=UTF8", "--no-locale", "--auth=scram-sha-256", "--username=" + admin.user, "--pwfile=" + pwFile]);
  } finally { await fs.rm(pwFile, { force: true }); }
  const legacyPath = path.resolve(root, "../.env");
  const legacy = dotenv.parse(await fs.readFile(legacyPath).catch(() => Buffer.from("")));
  const settings = { ...Object.fromEntries(Object.entries(legacy).filter(([key]) => !key.startsWith("VITE_"))),
    PORT: "3001", HOST: "127.0.0.1", APP_ORIGIN: "http://127.0.0.1:5173",
    DATABASE_DRIVER: "postgres", DATABASE_URL: "postgresql://makanlah:" + password + "@127.0.0.1:" + port + "/makanlah",
    DATABASE_SCHEMA: "public", DATABASE_POOL_SIZE: "10", DATA_DIR: "./var", MEDIA_DRIVER: "local",
    DEMO_MODE: legacy.DEMO_MODE || "true", LOCAL_PG_MANAGED: "true",
    LOCAL_PG_DATA_DIR: data.replaceAll("\\", "/"), LOCAL_PG_BIN: bin.replaceAll("\\", "/"), LOCAL_PG_PORT: String(port) };
  await fs.writeFile(envFile, Object.entries(settings).map(([key, value]) => key + "=" + JSON.stringify(value)).join("\n") + "\n", { mode: 0o600, flag: "wx" });
  await start(settings);
  await ensureDatabase(settings);
  console.log("Makanlah PostgreSQL is ready on 127.0.0.1:" + port + ", database makanlah. Credentials were saved privately in backend/.env.");
}
async function main(action) {
  if (action === "setup") return setup();
  const settings = await readEnv();
  const data = dataFor(settings);
  if (settings.LOCAL_PG_MANAGED !== "true") throw new Error("This command only manages the dedicated Makanlah local instance. Set DATABASE_URL for an external PostgreSQL service.");
  if (action === "start") { await start(settings); console.log("Local PostgreSQL is ready on port " + settings.LOCAL_PG_PORT + "."); }
  else if (action === "stop") { await command(settings.LOCAL_PG_BIN, "pg_ctl", ["-D", data, "-m", "fast", "-w", "stop"]); console.log("Stopped the Makanlah local PostgreSQL instance."); }
  else if (action === "status") { const status = await command(settings.LOCAL_PG_BIN, "pg_ctl", ["-D", data, "status"]); console.log(status.stdout.trim()); }
  else throw new Error("Use setup, start, stop or status.");
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main(process.argv[2]).catch(error => { console.error(error.message); process.exitCode = 1; });
