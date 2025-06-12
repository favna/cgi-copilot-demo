# Testing Guide

This project uses [Bun's built-in test runner](https://bun.sh/docs/cli/test) for testing the TODO API.

## Test Structure

### Test Files

- `test/app.test.ts` - Unit tests for individual API endpoints
- `test/integration.test.ts` - Integration tests for complete workflows
- `test/helpers.ts` - Utility functions and test helpers

### Test Categories

1. **Unit Tests** - Test individual endpoints in isolation
2. **Integration Tests** - Test complete CRUD workflows
3. **Error Handling** - Test database connection and query failures
4. **Edge Cases** - Test special characters, long inputs, concurrent requests

## Running Tests

```bash
# Run all tests
bun test

# Run tests in watch mode (re-run on file changes)
bun test --watch

# Run specific test file
bun test test/app.test.ts

# Run tests with verbose output
bun test --verbose
```

## Test Features

### Database Mocking

The tests use mock database connections instead of requiring a real PostgreSQL instance:

- Mock clients are created for each test
- Database responses are mocked to return predictable data
- Connection cleanup is verified to prevent memory leaks

### Test Coverage

The tests cover:

- ✅ GET /todos - Retrieve all todos
- ✅ POST /todos - Create new todo
- ✅ PUT /todos/:id - Update existing todo
- ✅ DELETE /todos/:id - Delete todo
- ✅ Error handling for database failures
- ✅ Input validation scenarios
- ✅ Edge cases (long titles, special characters)
- ✅ Concurrent request handling

### Mocking Strategy

```typescript
// Example of mocking a database query
mockClient.query.mockResolvedValue({
  rows: [{ id: 1, title: "Test todo", completed: false }],
});

// Example of mocking a database error
mockClient.query.mockRejectedValue(new Error("Database connection failed"));
```

## Writing New Tests

### Basic Test Structure

```typescript
import { beforeEach, describe, expect, it } from "bun:test";
import { createApp } from "../src/app.js";
import { createMockClient, setupDatabaseMock } from "./helpers.js";

describe("Your Test Suite", () => {
  let app: FastifyInstance;
  let mockClient: MockClient;

  beforeEach(async () => {
    mockClient = createMockClient();
    app = await createApp({
      logger: false,
      connectionString: "postgres://mock:mock@localhost:5432/mock",
    });
    setupDatabaseMock(app, mockClient);
  });

  it("should do something", async () => {
    // Arrange
    mockClient.query.mockResolvedValue({ rows: [] });

    // Act
    const response = await app.inject({
      method: "GET",
      url: "/todos",
    });

    // Assert
    expect(response.statusCode).toBe(200);
  });
});
```

### Test Helpers

Use the helper functions from `test/helpers.ts`:

- `createMockClient()` - Creates a new mock database client
- `setupDatabaseMock(app, mockClient)` - Sets up database mocking
- `sampleTodos` - Predefined sample data
- `createSampleTodo(title, completed)` - Creates new sample todo
- `assertClientCleanup(mockClient)` - Verifies client cleanup
- `assertTodoResponse(response, expectedTodo)` - Common response assertions

## Best Practices

1. **Isolation** - Each test should be independent and not rely on other tests
2. **Cleanup** - Always verify that database clients are properly released
3. **Mocking** - Mock external dependencies (database) consistently
4. **Descriptive Names** - Use clear, descriptive test names
5. **AAA Pattern** - Structure tests with Arrange, Act, Assert sections
6. **Edge Cases** - Test boundary conditions and error scenarios

## Continuous Integration

The test suite is designed to run in CI environments without requiring external dependencies like PostgreSQL. All database interactions are mocked, making tests fast and reliable.
