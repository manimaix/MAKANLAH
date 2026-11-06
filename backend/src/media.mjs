import fs from "node:fs/promises";
import path from "node:path";
export async function openMediaStorage(config) {
  if (config.mediaDriver === "s3") {
    const {
      S3Client,
      PutObjectCommand,
      GetObjectCommand,
      DeleteObjectCommand,
    } = await import("@aws-sdk/client-s3");
    if (!process.env.S3_BUCKET)
      throw new Error("S3_BUCKET is required for S3 uploads.");
    const client = new S3Client({
      endpoint: process.env.S3_ENDPOINT || undefined,
      region: process.env.S3_REGION || "auto",
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
      ...(process.env.S3_ACCESS_KEY_ID
        ? {
            credentials: {
              accessKeyId: process.env.S3_ACCESS_KEY_ID,
              secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
            },
          }
        : {}),
    });
    const bucket = process.env.S3_BUCKET;
    return {
      async put(key, bytes, mime) {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: bytes,
            ContentType: mime,
          }),
        );
      },
      async serve(key, req, res) {
        const item = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: key,
            ...(req.headers.range ? { Range: req.headers.range } : {}),
          }),
        );
        res.status(item.ContentRange ? 206 : 200);
        res.set("Accept-Ranges", "bytes");
        if (item.ContentLength)
          res.set("Content-Length", String(item.ContentLength));
        if (item.ContentRange) res.set("Content-Range", item.ContentRange);
        item.Body.pipe(res);
      },
      async remove(key) {
        await client.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: key }),
        );
      },
    };
  }
  if (config.mediaDriver !== "local")
    throw new Error("Unknown MEDIA_DRIVER. Use local or s3.");
  const directory = path.join(config.dataDir, "uploads");
  await fs.mkdir(directory, { recursive: true });
  return {
    put: (key, bytes) =>
      fs.writeFile(path.join(directory, key), bytes, { flag: "wx" }),
    serve: (key, req, res) => res.sendFile(key, { root: directory }),
    remove: (key) => fs.rm(path.join(directory, key), { force: true }),
  };
}
