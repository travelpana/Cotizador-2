import app from "./app";
import { logger } from "./lib/logger";
import { seedUsers } from "./lib/seed";
import { ensureDevelopmentSchema } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function startServer(): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    await ensureDevelopmentSchema();
    logger.info("Development database schema is ready");
  }

  await new Promise<void>((resolve, reject) => {
    const server = app.listen(port, () => resolve());
    server.once("error", reject);
  });

  logger.info({ port }, "Server listening");
  await seedUsers();
}

startServer().catch((err) => {
  logger.error({ err }, "Unable to initialize API server");
  process.exit(1);
});
