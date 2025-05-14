# Bun Fastify TODO API

This project is a Bun-based Fastify REST API for managing TODOs, with a Postgres database managed via Docker Compose.

## Features

- Fastify REST API (CRUD for TODOs)
- Bun runtime
- Postgres database (Docker Compose)

## Getting Started

### 1. Start Postgres with Docker Compose

```sh
docker compose up -d
```

### 2. Initialize the Database

You can run the SQL in `db-init.sql` using a Postgres client or:

```sh
docker exec -i <container_id> psql -U todo_user -d todo_db < db-init.sql
```

### 3. Install Dependencies

```sh
bun install
```

### 4. Start the API

```sh
bun run src/index.ts
```

The API will be available at <http://localhost:3000>

## Endpoints

- `GET /todos` - List all TODOs
- `POST /todos` - Create a new TODO (`{ title: string }`)
- `PUT /todos/:id` - Update a TODO (`{ title: string, completed: boolean }`)
- `DELETE /todos/:id` - Delete a TODO

---

**Note:** Ensure Postgres is running and the `todos` table is created before starting the API.

## References

- <https://www.prisma.io/fastify>
