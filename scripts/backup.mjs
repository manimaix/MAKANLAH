import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../server/config.mjs";
import { openStore } from "../server/store.mjs";
import { makeInitialState } from "../server/seed.mjs";
const config = loadConfig();
if (config.databaseDriver !== "sqlite" || config.mediaDriver !== "local")
  throw new Error(
    "Use your database and bucket backup tools for cloud storage. This helper backs up local SQLite and uploads.",
  );
const store = await openStore(config, makeInitialState(config.demoMode));
const state = await store.read();
await store.close();
const destination = path.join(
  config.dataDir,
  "backups",
  new Date().toISOString().replaceAll(":", "-"),
);
await fs.mkdir(path.join(destination, "uploads"), { recursive: true });
for (const file of state.media)
  await fs.copyFile(
    path.join(config.dataDir, "uploads", file.key),
    path.join(destination, "uploads", file.key),
  );
await fs.writeFile(
  path.join(destination, "state.json"),
  JSON.stringify(
    { exportVersion: 1, createdAt: new Date().toISOString(), state },
    null,
    2,
  ),
);
console.log(
  `Backed up ${state.posts.length} posts and ${state.media.length} uploads to ${destination}`,
);
