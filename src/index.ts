import Fastify from "fastify";
import process from 'node:process';
import fastifyPostgress from "@fastify/postgres";

const fastify = Fastify({ logger: true });

fastify.register(fastifyPostgress, {
  connectionString: "postgres://todo_user:todo_pass@localhost:5432/todo_db",
});

fastify.get("/todos", async () => {
  const client = await fastify.pg.connect();
  try {
    const { rows } = await client.query("SELECT * FROM todos ORDER BY id");
    return rows;
  } finally {
    client.release();
  }
});

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

fastify.delete("/todos/:id", async (request, reply) => {
  const { id } = request.params as { id: string };
  const client = await fastify.pg.connect();
  try {
    const { rowCount } = await client.query("DELETE FROM todos WHERE id = $1", [
      id,
    ]);
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

fastify.listen({ port: 3000 }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`Server listening at ${address}`);
});
