import fs from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { loadConfig } from "../src/config.mjs";
import { openStore } from "../src/store.mjs";
import { openMediaStorage } from "../src/media.mjs";
import { makeInitialState } from "../src/seed.mjs";
const config = loadConfig({ mediaDriver: "local" });
const targetUrl = process.env.TARGET_DATABASE_URL;
if (!targetUrl || targetUrl === config.databaseUrl) throw new Error("Set TARGET_DATABASE_URL to a different, empty PostgreSQL database.");
if (!process.argv.includes("--copy-media")) throw new Error("Use --copy-media to copy local uploads to the configured S3 bucket.");
const source = await openStore(config, makeInitialState(false));
let state;
try { state = await source.read(); } finally { await source.close(); }
state.sessions = [];
const targetConfig = { ...config, databaseUrl: targetUrl, databaseSchema: process.env.TARGET_DATABASE_SCHEMA || "public", mediaDriver: "s3" };
if (!/^[A-Za-z_][A-Za-z0-9_]{0,62}$/.test(targetConfig.databaseSchema)) throw new Error("Invalid TARGET_DATABASE_SCHEMA.");
const target = await openStore(targetConfig, makeInitialState(false));
const populated = s => Object.values(s).some(value => Array.isArray(value) && value.length);
try {
  if (populated(await target.read())) throw new Error("Destination is not empty. Migration refuses to overwrite existing data.");
  const uploads = await openMediaStorage(targetConfig);
  for (const file of state.media) {
    if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(file.key)) throw new Error("Unexpected media key.");
    await uploads.put(file.key, await fs.readFile(path.join(config.dataDir, "uploads", file.key)), file.mime);
  }
  await target.transact(current => {
    if (populated(current)) throw new Error("Destination changed. Stop its backend before migrating.");
    for (const key of Object.keys(current)) delete current[key];
    Object.assign(current, state);
  });
  if (!isDeepStrictEqual(await target.read(), state)) throw new Error("Destination verification failed.");
  console.log("Copied and verified " + state.users.length + " users, " + state.posts.length + " posts and " + state.media.length + " uploads. Source data was preserved. Update the deployed backend's DATABASE_URL and MEDIA_DRIVER=s3.");
} finally { await target.close(); }
