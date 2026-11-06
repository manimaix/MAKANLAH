import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { backendRoot } from "../src/config.mjs";
import { startManagedPostgres } from "./local-postgres.mjs";
await startManagedPostgres();
const files = (await fs.readdir(new URL("../tests/", import.meta.url))).filter(name => name.endsWith(".test.mjs")).map(name => "tests/" + name);
const child = spawn(process.execPath, ["--test", "--test-concurrency=1", ...files], { cwd: backendRoot, stdio: "inherit", windowsHide: true });
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code || 0; });
