import { DatabaseSync } from "node:sqlite";
import fs from "node:fs/promises";
import path from "node:path";

// Both destinations implement the same atomic state repository. Callers never know paths or SQL.
// A single document keeps this first version portable; see docs/STORAGE.md for scaling guidance.
export async function openStore(config, initialState) {
  if (config.databaseDriver === "postgres") {
    if (!config.databaseUrl)
      throw new Error("DATABASE_URL is required for PostgreSQL.");
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: config.databaseUrl });
    await pool.query(
      "CREATE TABLE IF NOT EXISTS makanlah_state (id INTEGER PRIMARY KEY, data JSONB NOT NULL)",
    );
    await pool.query(
      "INSERT INTO makanlah_state (id, data) VALUES (1, $1) ON CONFLICT DO NOTHING",
      [JSON.stringify(initialState)],
    );
    return {
      read: async () =>
        structuredClone(
          (await pool.query("SELECT data FROM makanlah_state WHERE id=1"))
            .rows[0].data,
        ),
      async transact(fn) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          const state = (
            await client.query(
              "SELECT data FROM makanlah_state WHERE id=1 FOR UPDATE",
            )
          ).rows[0].data;
          const result = await fn(state);
          await client.query("UPDATE makanlah_state SET data=$1 WHERE id=1", [
            JSON.stringify(state),
          ]);
          await client.query("COMMIT");
          return structuredClone(result);
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
      close: () => pool.end(),
    };
  }
  if (config.databaseDriver !== "sqlite")
    throw new Error("Unknown DATABASE_DRIVER. Use sqlite or postgres.");
  await fs.mkdir(config.dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(config.dataDir, "makanlah.sqlite"));
  db.exec(
    "PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY, data TEXT NOT NULL)",
  );
  db.prepare("INSERT OR IGNORE INTO app_state (id, data) VALUES (1, ?)").run(
    JSON.stringify(initialState),
  );
  let queue = Promise.resolve();
  return {
    read: async () =>
      JSON.parse(
        db.prepare("SELECT data FROM app_state WHERE id=1").get().data,
      ),
    transact(fn) {
      const run = queue.then(async () => {
        db.exec("BEGIN IMMEDIATE");
        try {
          const state = JSON.parse(
            db.prepare("SELECT data FROM app_state WHERE id=1").get().data,
          );
          const result = await fn(state);
          db.prepare("UPDATE app_state SET data=? WHERE id=1").run(
            JSON.stringify(state),
          );
          db.exec("COMMIT");
          return structuredClone(result);
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        }
      });
      queue = run.catch(() => {});
      return run;
    },
    close: async () => {
      await queue;
      db.close();
    },
  };
}
