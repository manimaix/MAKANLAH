import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { testDatabase } from "./database-helper.mjs";
import { openStore } from "../src/store.mjs";
import { loadConfig, backendRoot } from "../src/config.mjs";
import { makeInitialState } from "../src/seed.mjs";
const run = promisify(execFile);
test("runtime configuration rejects SQLite and unsafe schema names", () => {
  assert.throws(() => loadConfig({ databaseDriver: "sqlite" }), /requires PostgreSQL/);
  assert.throws(() => loadConfig({ databaseSchema: 'public"; DROP TABLE x' }), /Invalid DATABASE_SCHEMA/);
});
test("independent PostgreSQL pools serialize concurrent writes and roll back failed mutations", async t => {
  const database = await testDatabase();
  const config = loadConfig(database.config);
  const first = await openStore(config, { count: 0 }), second = await openStore(config, { count: 0 });
  t.after(async () => { await first.close(); await second.close(); await database.cleanup(); });
  await Promise.all(Array.from({ length: 24 }, (_, i) => (i % 2 ? first : second).transact(async state => {
    const before = state.count;
    await new Promise(resolve => setTimeout(resolve, 1));
    state.count = before + 1;
  })));
  assert.equal((await first.read()).count, 24);
  await assert.rejects(first.transact(state => { state.count = 900; throw new Error("stop"); }), /stop/);
  assert.equal((await second.read()).count, 24);
});
test("legacy migration preserves state and files, refuses overwrite and leaves the SQLite source intact", async t => {
  const database = await testDatabase();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "makanlah-migration-"));
  const sourceDir = path.join(dir, "source"), targetDir = path.join(dir, "target");
  await fs.mkdir(path.join(sourceDir, "uploads"), { recursive: true });
  const file = path.join(sourceDir, "old.sqlite");
  const state = makeInitialState(false);
  state.users = [{ id: "existing", name: "Existing user", passwordHash: "unchanged-hash", role: "user" }];
  state.sessions = [{ userId: "existing", tokenHash: "unchanged-session-hash" }];
  const key = "12345678-1234-1234-1234-123456789abc.jpg";
  state.media = [{ id: "existing-media", key, mime: "image/jpeg" }];
  state.orders = [{ id: "existing-order", totalCents: 1700 }];
  state.payments = [{ id: "existing-payment", totalCents: 1700 }];
  const original = Buffer.from("Existing upload bytes.");
  await fs.writeFile(path.join(sourceDir, "uploads", key), original);
  const sqlite = new DatabaseSync(file);
  sqlite.exec("CREATE TABLE app_state (id INTEGER PRIMARY KEY, data TEXT NOT NULL)");
  sqlite.prepare("INSERT INTO app_state VALUES (1, ?)").run(JSON.stringify(state));
  sqlite.close();
  const env = { ...process.env, DATABASE_URL: database.config.databaseUrl, DATABASE_SCHEMA: database.config.databaseSchema, DATA_DIR: targetDir, MEDIA_DRIVER: "local", DEMO_MODE: "false" };
  t.after(async () => { await database.cleanup(); await fs.rm(dir, { recursive: true, force: true }); });
  const args = [fileURLToPath(new URL("../scripts/migrate-sqlite.mjs", import.meta.url)), "--source", file];
  const result = await run(process.execPath, args, { cwd: backendRoot, env, windowsHide: true });
  assert.match(result.stdout, /"verified":true/);
  const store = await openStore(loadConfig(database.config), makeInitialState(false));
  try { assert.deepEqual(await store.read(), state); } finally { await store.close(); }
  assert.deepEqual(await fs.readFile(path.join(targetDir, "uploads", key)), original);
  await assert.rejects(run(process.execPath, args, { cwd: backendRoot, env, windowsHide: true }), /Destination contains records/);
  const reopened = new DatabaseSync(file, { readOnly: true });
  try { assert.deepEqual(JSON.parse(reopened.prepare("SELECT data FROM app_state").get().data), state); } finally { reopened.close(); }
});
