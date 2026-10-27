import fs from "node:fs/promises";
await fs.mkdir(".impeccable/review", { recursive: true });
for (const file of await fs.readdir("C:/FINAL YEAR PROJECT")) {
  if (!/^makanlah-[a-z-]+\.png$/.test(file)) continue;
  await fs.copyFile(
    "C:/FINAL YEAR PROJECT/" + file,
    ".impeccable/review/" + file.replace("makanlah-", ""),
  );
}
console.log("Saved browser review screenshots.");
