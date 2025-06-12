import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app.js";

/**
 * Integration tests for the TODO API with more complex scenarios.
 */
describe("TODO API Integration Tests", () => {
  let app: FastifyInstance;
  let mockClient: any;
  let todoIdCounter = 1;

  beforeEach(async () => {
    // Reset counter
    todoIdCounter = 1;

    // Create mock client with more sophisticated behavior
    mockClient = {
      query: mock(),
      release: mock(),
    };

    // Create app
    app = await createApp({
      logger: false,
      connectionString: "postgres://mock:mock@localhost:5432/mock",
    });

    // Mock the pg.connect method
    app.pg.connect = mock().mockResolvedValue(mockClient);
  });

  describe("CRUD Operations Flow", () => {
    it("should handle a complete CRUD flow", async () => {
      // 1. Initially no todos
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      let response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual([]);

      // 2. Create a new todo
      const newTodo = {
        id: todoIdCounter++,
        title: "Learn Bun",
        completed: false,
      };
      mockClient.query.mockResolvedValueOnce({ rows: [newTodo] });

      response = await app.inject({
        method: "POST",
        url: "/todos",
        payload: { title: "Learn Bun" },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual(newTodo);

      // 3. Get all todos (should now include the new one)
      mockClient.query.mockResolvedValueOnce({ rows: [newTodo] });

      response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual([newTodo]);

      // 4. Update the todo
      const updatedTodo = {
        ...newTodo,
        title: "Learn Bun thoroughly",
        completed: true,
      };
      mockClient.query.mockResolvedValueOnce({ rows: [updatedTodo] });

      response = await app.inject({
        method: "PUT",
        url: "/todos/1",
        payload: { title: "Learn Bun thoroughly", completed: true },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(updatedTodo);

      // 5. Delete the todo
      mockClient.query.mockResolvedValueOnce({ rowCount: 1 });

      response = await app.inject({
        method: "DELETE",
        url: "/todos/1",
      });

      expect(response.statusCode).toBe(204);
      expect(response.payload).toBe("");

      // 6. Verify it's deleted (should return empty array)
      mockClient.query.mockResolvedValueOnce({ rows: [] });

      response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual([]);
    });

    it("should handle multiple todos", async () => {
      const todos = [
        { id: 1, title: "Todo 1", completed: false },
        { id: 2, title: "Todo 2", completed: true },
        { id: 3, title: "Todo 3", completed: false },
      ];

      mockClient.query.mockResolvedValue({ rows: todos });

      const response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(todos);
      expect(mockClient.query).toHaveBeenCalledWith(
        "SELECT * FROM todos ORDER BY id"
      );
    });
  });

  describe("Input Validation", () => {
    it("should handle missing title in POST request", async () => {
      await app.inject({
        method: "POST",
        url: "/todos",
        payload: {}, // Missing title
      });

      // The API doesn't validate this currently, but the database would handle it
      // This test documents current behavior
      expect(mockClient.query).toHaveBeenCalledWith(
        "INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING *",
        [undefined, false]
      );
    });

    it("should handle invalid JSON in request body", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/todos",
        payload: "invalid json",
        headers: {
          "content-type": "application/json",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("Database Error Scenarios", () => {
    it("should handle database timeout", async () => {
      const timeoutError = new Error("Connection timeout");
      timeoutError.name = "TimeoutError";

      app.pg.connect = mock().mockRejectedValue(timeoutError);

      const response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      expect(response.statusCode).toBe(500);
    });

    it("should handle query syntax errors", async () => {
      const syntaxError = new Error("Syntax error in SQL");
      syntaxError.name = "DatabaseError";

      mockClient.query.mockRejectedValue(syntaxError);

      const response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      expect(response.statusCode).toBe(500);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very long todo titles", async () => {
      const longTitle = "A".repeat(1000);
      const newTodo = { id: 1, title: longTitle, completed: false };

      mockClient.query.mockResolvedValue({ rows: [newTodo] });

      const response = await app.inject({
        method: "POST",
        url: "/todos",
        payload: { title: longTitle },
      });

      expect(response.statusCode).toBe(201);
      expect(mockClient.query).toHaveBeenCalledWith(
        "INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING *",
        [longTitle, false]
      );
    });

    it("should handle special characters in todo titles", async () => {
      const specialTitle =
        "Special chars: !@#$%^&*()_+{}|:<>?[]\\;',./ 中文 🎉";
      const newTodo = { id: 1, title: specialTitle, completed: false };

      mockClient.query.mockResolvedValue({ rows: [newTodo] });

      const response = await app.inject({
        method: "POST",
        url: "/todos",
        payload: { title: specialTitle },
      });

      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual(newTodo);
    });

    it("should handle concurrent requests", async () => {
      // Simulate multiple concurrent requests
      const promises = Array.from({ length: 5 }, (_, i) => {
        const todo = {
          id: i + 1,
          title: `Concurrent todo ${i + 1}`,
          completed: false,
        };
        mockClient.query.mockResolvedValueOnce({ rows: [todo] });

        return app.inject({
          method: "POST",
          url: "/todos",
          payload: { title: `Concurrent todo ${i + 1}` },
        });
      });

      const responses = await Promise.all(promises);

      responses.forEach((response, index) => {
        expect(response.statusCode).toBe(201);
        const payload = JSON.parse(response.payload);
        expect(payload.title).toBe(`Concurrent todo ${index + 1}`);
      });
    });
  });
});
