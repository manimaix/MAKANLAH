import fs from "node:fs/promises";
await fs.mkdir("public/licenses", { recursive: true });
for (const name of ["bricolage-grotesque", "dm-sans"])
  await fs.copyFile(
    `node_modules/@fontsource-variable/${name}/LICENSE`,
    `public/licenses/${name}-OFL.txt`,
  );
const response = await fetch(
  "https://raw.githubusercontent.com/spdx/license-list-data/main/text/GFDL-1.3-or-later.txt",
  { signal: AbortSignal.timeout(20000) },
);
if (!response.ok) throw new Error("GNU FDL licence download failed.");
const license = await response.text();
if (
  !license.includes("GNU Free Documentation License") ||
  license.length < 10000
)
  throw new Error("Unexpected licence response.");
await fs.writeFile("public/licenses/GFDL-1.3.txt", license);
console.log("Included full font and GNU FDL licence texts.");
