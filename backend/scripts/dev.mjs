import { spawn } from "node:child_process";
import { backendRoot } from "../src/config.mjs";
import { startManagedPostgres } from "./local-postgres.mjs";
await startManagedPostgres();
const child = spawn(process.execPath, ["--watch", "src/index.mjs"], { cwd: backendRoot, stdio: "inherit", windowsHide: true });
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code || 0; });
for (const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => child.kill(signal));
