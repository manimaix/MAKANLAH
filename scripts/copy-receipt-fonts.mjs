import fs from "node:fs/promises";
for (const target of ["public/fonts", "backend/public/fonts"]) {
  await fs.mkdir(target, { recursive: true });
  for (const font of ["dm-sans", "bricolage-grotesque"]) await fs.copyFile("node_modules/@fontsource-variable/" + font + "/files/" + font + "-latin-wght-normal.woff2", target + "/" + font + ".woff2");
}
console.log("Copied the installed receipt fonts to frontend and standalone backend public folders.");
