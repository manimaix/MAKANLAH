import pg from "pg";
// Row locks preserve atomic operations across API processes.
export async function openStore(config, initialState) {
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: config.databasePoolSize, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 });
  pool.on("error", error => console.error("PostgreSQL idle connection error:", error.code || error.message));
  const schema = '"' + config.databaseSchema + '"', table = schema + ".makanlah_state";
  try {
    await pool.query("CREATE SCHEMA IF NOT EXISTS " + schema);
    await pool.query("CREATE TABLE IF NOT EXISTS " + table + " (id INTEGER PRIMARY KEY CHECK (id = 1), data JSONB NOT NULL)");
    await pool.query("INSERT INTO " + table + " (id, data) VALUES (1, $1) ON CONFLICT (id) DO NOTHING", [JSON.stringify(initialState)]);
  } catch (error) { await pool.end(); throw error; }
  return {
    read: async () => structuredClone((await pool.query("SELECT data FROM " + table + " WHERE id=1")).rows[0].data),
    ping: async () => { await pool.query("SELECT 1"); },
    async transact(fn) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const state = (await client.query("SELECT data FROM " + table + " WHERE id=1 FOR UPDATE")).rows[0].data;
        const result = await fn(state);
        await client.query("UPDATE " + table + " SET data=$1 WHERE id=1", [JSON.stringify(state)]);
        await client.query("COMMIT");
        return structuredClone(result);
      } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
      finally { client.release(); }
    },
    close: () => pool.end(),
  };
}
