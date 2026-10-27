import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { makePreviewCatalog } from "./preview-data.mjs";

const base = "/MAKANLAH/";
for (const args of [["node_modules/typescript/bin/tsc", "-b"], ["node_modules/vite/bin/vite.js", "build", "--outDir", "dist-pages"]]) {
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    env: { ...process.env, VITE_BASE_PATH: base, VITE_STATIC_PREVIEW: "true", VITE_API_URL: "" },
  });
  if (result.status !== 0) process.exit(result.status || 1);
}
const catalog = makePreviewCatalog();
const json = JSON.stringify(catalog);
if (/"(?:passwordHash|email|preferences|sessions|trackingHash)"\s*:/.test(json))
  throw new Error("Private fields must not enter the public preview.");
await fs.mkdir("dist-pages/preview", { recursive: true });
await fs.writeFile("dist-pages/preview/catalog.json", json);
const html = await fs.readFile("dist-pages/index.html", "utf8");
const routes = ["discover", "nearby", "feed", "community", "about", "sign-in", "merchant", "admin", "post", "profile", "preferences", "saved", ...catalog.places.map((p) => "place/" + p.id), ...catalog.tables.map((t) => "order/" + t.token)];
for (const route of routes) {
  const dir = path.join("dist-pages", route);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "index.html"), html);
}
await fs.writeFile("dist-pages/404.html", html);
await fs.writeFile("dist-pages/.nojekyll", "");
console.log(`Pages preview ready: ${catalog.places.length} labelled places, ${catalog.posts.length} labelled posts; no local records exported.`);
