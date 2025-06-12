import { expect, mock } from "bun:test";
import type { FastifyInstance } from "fastify";

/**
 * Mock client interface for testing database operations.
 */
export interface MockClient {
  query: ReturnType<typeof mock>;
  release: ReturnType<typeof mock>;
}

/**
 * Creates a mock database client with common behavior.
 * @returns A mock client object with query and release methods
 */
export function createMockClient(): MockClient {
  return {
    query: mock(),
    release: mock(),
  };
}

/**
 * Sets up database mocking for a Fastify app instance.
 * @param app - The Fastify app instance to mock
 * @param mockClient - The mock client to use
 */
export function setupDatabaseMock(
  app: FastifyInstance,
  mockClient: MockClient
): void {
  app.pg.connect = mock().mockResolvedValue(mockClient);
}

/**
 * Sample TODO data for testing.
 */
export const sampleTodos = [
  { id: 1, title: "Learn TypeScript", completed: true },
  { id: 2, title: "Build REST API", completed: false },
  { id: 3, title: "Write tests", completed: true },
  { id: 4, title: "Deploy to production", completed: false },
] as const;

/**
 * Creates a new sample TODO with a unique ID.
 * @param title - The title for the new TODO
 * @param completed - Whether the TODO is completed
 * @returns A new TODO object
 */
export function createSampleTodo(title: string, completed = false) {
  return {
    id: Math.floor(Math.random() * 1000) + 100,
    title,
    completed,
  };
}

/**
 * Asserts that a mock client was properly cleaned up (release was called).
 * @param mockClient - The mock client to check
 */
export function assertClientCleanup(mockClient: MockClient): void {
  expect(mockClient.release).toHaveBeenCalled();
}

/**
 * Common assertions for successful TODO responses.
 * @param response - The response to check
 * @param expectedTodo - The expected TODO data
 */
export function assertTodoResponse(response: any, expectedTodo: any): void {
  expect(response.statusCode).toBe(200);
  expect(JSON.parse(response.payload)).toEqual(expectedTodo);
}

/**
 * Common assertions for 404 error responses.
 * @param response - The response to check
 */
export function assert404Response(response: any): void {
  expect(response.statusCode).toBe(404);
  expect(JSON.parse(response.payload)).toEqual({ error: "TODO not found" });
}
