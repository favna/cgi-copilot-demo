import process from "node:process";
import { createApp } from "./app.js";

/**
 * Main entry point for the application.
 * Creates and starts the Fastify server.
 */
async function main() {
  const app = await createApp({
    logger: true,
    connectionString: "postgres://todo_user:todo_pass@localhost:5432/todo_db",
  });

  /**
   * Starts the Fastify server.
   * @param err - An error object if an error occurred during startup.
   * @param address - The address the server is listening on.
   */
  app.listen({ port: 3000 }, (err: Error | null, address: string) => {
    if (err) {
      app.log.error(err);
      process.exit(1);
    }
    app.log.info(`Server listening at ${address}`);
  });
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
