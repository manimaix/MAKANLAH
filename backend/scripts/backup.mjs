import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../src/config.mjs";
import { openStore } from "../src/store.mjs";
import { makeInitialState } from "../src/seed.mjs";
const config = loadConfig();
const store = await openStore(config, makeInitialState(false));
let state;
try { state = await store.read(); } finally { await store.close(); }
const destination = path.join(config.dataDir, "backups", new Date().toISOString().replaceAll(":", "-"));
await fs.mkdir(path.join(destination, "uploads"), { recursive: true });
if (config.mediaDriver === "local") {
  for (const file of state.media) {
    if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(file.key)) throw new Error("Unexpected media filename.");
    await fs.copyFile(path.join(config.dataDir, "uploads", file.key), path.join(destination, "uploads", file.key));
  }
}
await fs.writeFile(path.join(destination, "state.json"), JSON.stringify({ exportVersion: 1, createdAt: new Date().toISOString(), state }, null, 2), { flag: "wx", mode: 0o600 });
console.log("Backed up PostgreSQL application records" + (config.mediaDriver === "local" ? " and local uploads" : "; use bucket versioning for S3 media") + " to " + destination);
