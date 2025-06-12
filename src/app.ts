import fastifyPostgres from "@fastify/postgres";
import Fastify, { type FastifyInstance } from "fastify";

/**
 * Configuration options for creating the Fastify app.
 */
export interface AppConfig {
  /** Enable logging */
  logger?: boolean;
  /** Postgres connection string */
  connectionString: string;
}

/**
 * Creates and configures a Fastify application instance.
 * @param config - Configuration options for the app
 * @returns A promise that resolves to the configured Fastify instance
 */
export async function createApp(config: AppConfig): Promise<FastifyInstance> {
  /**
   * Fastify instance with configurable logger.
   */
  const fastify = Fastify({ logger: config.logger ?? false });

  /**
   * Registers the fastify-postgres plugin for database connectivity.
   */
  await fastify.register(fastifyPostgres, {
    connectionString: config.connectionString,
  });

  /**
   * Route to get all TODO items.
   * @returns A promise that resolves to an array of TODO items.
   */
  fastify.get("/todos", async () => {
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query("SELECT * FROM todos ORDER BY id");
      return rows;
    } finally {
      client.release();
    }
  });

  /**
   * Route to create a new TODO item.
   * @param request - The Fastify request object.
   * @param reply - The Fastify reply object.
   * @returns A promise that resolves to the created TODO item.
   */
  fastify.post("/todos", async (request, reply) => {
    const { title } = request.body as { title: string };
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        "INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING *",
        [title, false]
      );
      reply.code(201);
      return rows[0];
    } finally {
      client.release();
    }
  });

  /**
   * Route to update an existing TODO item.
   * @param request - The Fastify request object.
   * @param reply - The Fastify reply object.
   * @returns A promise that resolves to the updated TODO item or an error if not found.
   */
  fastify.put("/todos/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const { title, completed } = request.body as {
      title: string;
      completed: boolean;
    };
    const client = await fastify.pg.connect();
    try {
      const { rows } = await client.query(
        "UPDATE todos SET title = $1, completed = $2 WHERE id = $3 RETURNING *",
        [title, completed, id]
      );
      if (rows.length === 0) {
        reply.code(404);
        return { error: "TODO not found" };
      }
      return rows[0];
    } finally {
      client.release();
    }
  });

  /**
   * Route to delete a TODO item.
   * @param request - The Fastify request object.
   * @param reply - The Fastify reply object.
   * @returns A promise that resolves to an empty string or an error if not found.
   */
  fastify.delete("/todos/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const client = await fastify.pg.connect();
    try {
      const { rowCount } = await client.query(
        "DELETE FROM todos WHERE id = $1",
        [id]
      );
      if (rowCount === 0) {
        reply.code(404);
        return { error: "TODO not found" };
      }
      reply.code(204);
      return "";
    } finally {
      client.release();
    }
  });

  return fastify;
}
