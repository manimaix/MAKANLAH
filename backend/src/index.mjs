import { createApp } from "./app.mjs";
const application = await createApp();
const server = application.app.listen(
  application.config.port,
  application.config.host,
  () =>
    console.log(
      `Makanlah API: http://localhost:${application.config.port} (${application.config.databaseDriver} + ${application.config.mediaDriver})`,
    ),
);
const shutdown = () =>
  server.close(async () => {
    await application.close();
    process.exit(0);
  });
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
