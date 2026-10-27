import fs from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../server/config.mjs";
import { openStore } from "../server/store.mjs";
import { openMediaStorage } from "../server/media.mjs";
import { makeInitialState } from "../server/seed.mjs";
if (!process.env.DATABASE_URL)
  throw new Error(
    "Set DATABASE_URL to your empty PostgreSQL destination first.",
  );
const copyMedia = process.argv.includes("--copy-media");
if (!copyMedia)
  throw new Error(
    "Run with --copy-media to explicitly copy local uploads to the configured S3 bucket.",
  );
const sourceConfig = loadConfig({
  databaseDriver: "sqlite",
  mediaDriver: "local",
});
const source = await openStore(sourceConfig, makeInitialState(false));
const state = await source.read();
await source.close();
state.sessions = [];
const targetConfig = loadConfig({
  databaseDriver: "postgres",
  mediaDriver: "s3",
  demoMode: false,
});
const destination = await openStore(targetConfig, makeInitialState(false));
try {
  const existing = await destination.read();
  if (existing.users.length || existing.places.length || existing.posts.length)
    throw new Error(
      "Destination is not empty. Migration refuses to overwrite existing data.",
    );
  const uploads = await openMediaStorage(targetConfig);
  for (const file of state.media) {
    if (!/^[a-f0-9-]+\.[a-z0-9]+$/i.test(file.key))
      throw new Error("Unexpected media key.");
    const bytes = await fs.readFile(
      path.join(sourceConfig.dataDir, "uploads", file.key),
    );
    await uploads.put(file.key, bytes, file.mime);
  }
  await destination.transact((s) => {
    if (s.users.length || s.posts.length)
      throw new Error(
        "Destination changed during migration. Stop the online server first.",
      );
    for (const key of Object.keys(s)) delete s[key];
    Object.assign(s, state);
  });
  console.log(
    `Copied ${state.users.length} users, ${state.posts.length} posts and ${state.media.length} uploads. Local data was preserved. Set DATABASE_DRIVER=postgres and MEDIA_DRIVER=s3, then restart.`,
  );
} finally {
  await destination.close();
}
