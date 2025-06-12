import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { FastifyInstance } from "fastify";
import { createApp } from "../src/app.js";
import type { MockClient } from "./helpers.js";

/**
 * Mock database data for testing.
 */
const mockTodos = [
  { id: 1, title: "Test todo 1", completed: false },
  { id: 2, title: "Test todo 2", completed: true },
];

describe("TODO API", () => {
  let app: FastifyInstance;
  let mockClient: MockClient;

  beforeEach(async () => {
    // Create mock client
    mockClient = {
      query: mock(),
      release: mock(),
    };

    // Create app with a mock connection string (won't be used due to mocking)
    app = await createApp({
      logger: false,
      connectionString: "postgres://mock:mock@localhost:5432/mock",
    });

    // Mock the pg.connect method to return our mock client
    app.pg.connect = mock().mockResolvedValue(mockClient);
  });

  describe("GET /todos", () => {
    it("should return all todos", async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rows: mockTodos });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(mockTodos);
      expect(mockClient.query).toHaveBeenCalledWith(
        "SELECT * FROM todos ORDER BY id"
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should return empty array when no todos exist", async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rows: [] });

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual([]);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("POST /todos", () => {
    it("should create a new todo", async () => {
      // Arrange
      const newTodo = { id: 3, title: "New todo", completed: false };
      mockClient.query.mockResolvedValue({ rows: [newTodo] });

      // Act
      const response = await app.inject({
        method: "POST",
        url: "/todos",
        payload: { title: "New todo" },
      });

      // Assert
      expect(response.statusCode).toBe(201);
      expect(JSON.parse(response.payload)).toEqual(newTodo);
      expect(mockClient.query).toHaveBeenCalledWith(
        "INSERT INTO todos (title, completed) VALUES ($1, $2) RETURNING *",
        ["New todo", false]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("PUT /todos/:id", () => {
    it("should update an existing todo", async () => {
      // Arrange
      const updatedTodo = { id: 1, title: "Updated todo", completed: true };
      mockClient.query.mockResolvedValue({ rows: [updatedTodo] });

      // Act
      const response = await app.inject({
        method: "PUT",
        url: "/todos/1",
        payload: { title: "Updated todo", completed: true },
      });

      // Assert
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual(updatedTodo);
      expect(mockClient.query).toHaveBeenCalledWith(
        "UPDATE todos SET title = $1, completed = $2 WHERE id = $3 RETURNING *",
        ["Updated todo", true, "1"]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should return 404 when todo not found", async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rows: [] });

      // Act
      const response = await app.inject({
        method: "PUT",
        url: "/todos/999",
        payload: { title: "Updated todo", completed: true },
      });

      // Assert
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toEqual({ error: "TODO not found" });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("DELETE /todos/:id", () => {
    it("should delete an existing todo", async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rowCount: 1 });

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: "/todos/1",
      });

      // Assert
      expect(response.statusCode).toBe(204);
      expect(response.payload).toBe("");
      expect(mockClient.query).toHaveBeenCalledWith(
        "DELETE FROM todos WHERE id = $1",
        ["1"]
      );
      expect(mockClient.release).toHaveBeenCalled();
    });

    it("should return 404 when todo not found", async () => {
      // Arrange
      mockClient.query.mockResolvedValue({ rowCount: 0 });

      // Act
      const response = await app.inject({
        method: "DELETE",
        url: "/todos/999",
      });

      // Assert
      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toEqual({ error: "TODO not found" });
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe("Error handling", () => {
    it("should handle database connection errors gracefully", async () => {
      // Arrange
      const error = new Error("Database connection failed");
      app.pg.connect = mock().mockRejectedValue(error);

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      // Assert
      expect(response.statusCode).toBe(500);
    });

    it("should release client even when query fails", async () => {
      // Arrange
      const error = new Error("Query failed");
      mockClient.query.mockRejectedValue(error);

      // Act
      const response = await app.inject({
        method: "GET",
        url: "/todos",
      });

      // Assert
      expect(response.statusCode).toBe(500);
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
