import ffmpeg from "@ffmpeg-installer/ffmpeg";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { loadConfig } from "../server/config.mjs";
import { openStore } from "../server/store.mjs";
import { makeInitialState } from "../server/seed.mjs";
await fs.mkdir("public/assets", { recursive: true });
const target = "public/assets/makanlah-preview.mp4";
const args = [
  "-y",
  "-loglevel",
  "error",
  "-loop",
  "1",
  "-i",
  "public/assets/nasi.jpg",
  "-vf",
  "scale=360:640:force_original_aspect_ratio=increase,crop=360:640,zoompan=z='1+0.0003*on':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=125:s=360x640:fps=25",
  "-t",
  "5",
  "-c:v",
  "libx264",
  "-pix_fmt",
  "yuv420p",
  "-movflags",
  "+faststart",
  target,
];
await new Promise((resolve, reject) => {
  const child = spawn(ffmpeg.path, args, {
    stdio: "inherit",
    windowsHide: true,
  });
  child.on("error", reject);
  child.on("exit", (code) =>
    code === 0
      ? resolve()
      : reject(new Error("Video generation failed: " + code)),
  );
});
const config = loadConfig();
if (config.demoMode) {
  const store = await openStore(config, makeInitialState(true));
  await store.transact((s) => {
    const sample = makeInitialState(true).posts.find(
      (p) => p.id === "post-motion",
    );
    if (!s.posts.some((p) => p.id === sample.id)) s.posts.unshift(sample);
  });
  await store.close();
}
console.log(
  "Created a 5-second sample motion clip from the credited nasi lemak photograph.",
);
