import fs from "node:fs/promises";
import path from "node:path";
import { constants } from "node:fs";
import { parseArgs, isDeepStrictEqual } from "node:util";
import { randomUUID, createHash } from "node:crypto";
import { loadConfig, backendRoot } from "../src/config.mjs";
import { openStore } from "../src/store.mjs";
import { makeInitialState } from "../src/seed.mjs";

const { values } = parseArgs({ options: { source: { type: "string" } } });
const config = loadConfig();
if (config.mediaDriver !== "local") throw new Error("For this local migration set MEDIA_DRIVER=local. Use migrate:online for S3.");
const sourceFile = path.resolve(values.source || path.join(backendRoot, "../var/makanlah.sqlite"));
await fs.access(sourceFile);
const { DatabaseSync } = await import("node:sqlite");
const source = new DatabaseSync(sourceFile, { readOnly: true });
let state;
try { state = JSON.parse(source.prepare("SELECT data FROM app_state WHERE id=1").get().data); }
finally { source.close(); }
if (!state || !Array.isArray(state.users) || !Array.isArray(state.media)) throw new Error("The source is not a Makanlah database.");
const populated = s => Object.values(s).some(value => Array.isArray(value) && value.length > 0);
const destination = await openStore(config, makeInitialState(false));
try {
  if (populated(await destination.read())) throw new Error("Destination contains records. Migration refuses to overwrite them.");
  const backupDir = path.join(config.dataDir, "backups");
  await fs.mkdir(backupDir, { recursive: true });
  const backup = path.join(backupDir, "sqlite-migration-" + randomUUID() + ".json");
  await fs.writeFile(backup, JSON.stringify({ exportVersion: 1, createdAt: new Date().toISOString(), state }, null, 2), { flag: "wx", mode: 0o600 });
  const oldUploads = path.join(path.dirname(sourceFile), "uploads");
  const newUploads = path.join(config.dataDir, "uploads");
  await fs.mkdir(newUploads, { recursive: true });
  let copiedFiles = 0;
  const entries = await fs.readdir(oldUploads, { withFileTypes: true }).catch(error => {
    if (error.code === "ENOENT" && state.media.length === 0) return [];
    throw error;
  });
  for (const entry of entries) {
    if (!entry.isFile()) throw new Error("Unexpected subdirectory or link in the uploads folder.");
    const original = path.join(oldUploads, entry.name), target = path.join(newUploads, entry.name);
    try { await fs.copyFile(original, target, constants.COPYFILE_EXCL); }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      const hash = bytes => createHash("sha256").update(bytes).digest("hex");
      if (hash(await fs.readFile(original)) !== hash(await fs.readFile(target))) throw new Error("A destination upload differs. Migration stopped without overwriting it.");
    }
    copiedFiles++;
  }
  for (const item of state.media) {
    if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(item.key)) throw new Error("Unexpected media filename.");
    await fs.access(path.join(newUploads, item.key));
  }
  await destination.transact(current => {
    if (populated(current)) throw new Error("Destination changed during migration. Stop the backend first.");
    for (const key of Object.keys(current)) delete current[key];
    Object.assign(current, structuredClone(state));
  });
  if (!isDeepStrictEqual(await destination.read(), state)) throw new Error("PostgreSQL verification failed. The SQLite source and backup are preserved.");
  console.log(JSON.stringify({ database: "postgres", verified: true, users: state.users.length, posts: state.posts.length, orders: state.orders.length, payments: state.payments?.length || 0, copiedFiles, backup, sourcePreserved: true, sessionsPreserved: true }));
} finally { await destination.close(); }
