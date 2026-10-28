import fs from "node:fs/promises";
await fs.mkdir("public/fonts", { recursive: true });
for (const font of ["dm-sans", "bricolage-grotesque"]) {
  await fs.copyFile(`node_modules/@fontsource-variable/${font}/files/${font}-latin-wght-normal.woff2`, `public/fonts/${font}.woff2`);
}
console.log("Receipt fonts copied from the installed font packages.");
