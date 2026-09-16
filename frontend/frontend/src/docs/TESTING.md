# Testing Documentation

## Overview

This project uses **Vitest** with **React Testing Library** and **MSW (Mock Service Worker)** for deterministic, fast, and reliable component and service testing.

**Key Stack:**

- **Vitest 4.1.11** - Unit and component test runner with jsdom environment
- **React Testing Library** - Component rendering and user interaction testing
- **MSW 2.15.0** - Mock Service Worker for API mocking
- **@testing-library/user-event** - Realistic user interactions

##

### Prerequisites

Ensure you have Node.js 16+ installed and dependencies installed:

```bash
npm install
```

### Install the Testing Infrastructure

```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom @testing-library/dom
npm install --save-dev msw
npm install --save-dev @vitest/ui
```

### Run Tests Locally

**Run all tests with watch mode:**

```bash
npm test
```

**Run all tests once (CI mode):**

```bash
npm run test:ci
```

**Run tests for a specific file:**

```bash
npm test -- LoginForm.test.jsx
```

**Run tests with coverage report:**

```bash
npm test -- --coverage
```

**Run tests in debug mode:**

```bash
npm test -- --inspect-brk
```

## CI/CD Integration

### GitHub Actions Workflow

Tests run automatically on:

- **Push to main/develop:** Full test suite with coverage
- **Pull Requests:** All tests must pass before merge
- **Scheduled:** Daily test run at 2 AM UTC

**Single CI Command:**

```bash
npm run test:ci
```

This runs the complete test suite once, generates coverage reports, and exits with appropriate code (0 for pass, 1 for fail).

### Local CI Testing

To test locally as CI would:

```bash
npm run test:ci
```

This runs without watch mode and generates coverage reports in `coverage/` directory.

## Some Important Points

### 1. Global Test Setup (src/tests/setup.js)

MSW server is initialized globally for all tests:

```javascript
import { setupServer } from "msw/node";
import { handlers } from "../mocks/handler";

export const server = setupServer(...handlers);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorage.clear();
});
```

**Why:** Ensures all HTTP requests are intercepted and mocked consistently across tests without actual network calls.

### 2. Mock Data Fixtures (src/mocks/data.js)

Realistic mock API responses for all backend endpoints:

```javascript
export const mockAuthSession = {
  /* auth data */
};
export const mockThreatList = {
  /* threats */
};
export const mockDashboardOverview = {
  /* dashboard */
};
// ... 15+ more fixtures
```

**Why:** Ensures tests use consistent, realistic data that mirrors actual API responses.

### 3. MSW Request Handlers (src/mocks/handler.js)

HTTP request interceptors that return mock responses:

```javascript
export const handlers = [
  http.post("/api/users/auth/login", ({ request }) => {
    // Intercept POST /api/users/auth/login
    // Return mockAuthSession or error
  }),
  // ... 12+ more endpoints
];
```

**Why:** Intercepts all fetch/axios calls without modifying application code. Tests are deterministic and fast.

### 4. Test Patterns

#### Service Tests (API Layer)

```javascript
it("should fetch dashboard overview", async () => {
  const data = await getDashboardOverview();
  expect(data).toHaveProperty("overview");
  expect(data.overview.total_threats).toBe(5);
});

it("should throw on 401 auth error", async () => {
  localStorage.clear();
  await expect(getDashboardOverview()).rejects.toThrow("Please sign in");
});
```

**Key Pattern:** Service tests verify API contract - data structure, error handling, auth checks.

#### Component Tests (UI Layer)

```javascript
it("should render login form and handle submission", async () => {
  const user = userEvent.setup();
  render(<LoginForm onLogin={mockOnLogin} />);

  const emailInput = screen.getByRole("textbox", { name: /email/i });
  await user.type(emailInput, "test@example.com");

  const submitBtn = screen.getByRole("button", { name: /login/i });
  await user.click(submitBtn);

  expect(mockOnLogin).toHaveBeenCalledWith({
    email: "test@example.com",
    password: expect.any(String),
  });
});
```

**Key Pattern:**

- Use `userEvent.setup()` for realistic interactions
- Query by semantic roles: `getByRole("button")`, `getByRole("textbox")`
- Verify component behavior via callbacks/state changes

#### Error Scenarios

```javascript
it("should display error message on fetch failure", async () => {
  server.use(
    http.get("/api/users/threats", () => {
      return HttpResponse.json({ error: "Server error" }, { status: 500 });
    }),
  );

  render(<Alerts />);
  expect(await screen.findByText(/error/i)).toBeTruthy();
});
```

**Key Pattern:** Override specific handlers in individual tests for error scenarios.

## Common Testing Tasks

### Adding a New Component Test

1. **Create file:** `src/tests/MyComponent.test.jsx`

```javascript
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyComponent from "../../MyComponent.jsx";
import { AUTH_STORAGE_KEY } from "../../services/authApi.js";
import { mockAuthSession } from "../../mocks/data.js";

describe("MyComponent", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));
  });

  it("should render", () => {
    render(<MyComponent />);
    expect(screen.getByText(/my content/i)).toBeTruthy();
  });

  it("should handle user interaction", async () => {
    const user = userEvent.setup();
    render(<MyComponent />);

    const button = screen.getByRole("button");
    await user.click(button);

    expect(screen.getByText(/clicked/i)).toBeTruthy();
  });
});
```

2. **Add mock data** to `src/mocks/data.js` if needed
3. **Add API handler** to `src/mocks/handler.js` if component fetches data
4. **Run:** `npm test -- MyComponent.test.jsx`

### Adding a New API Endpoint Mock

1. **Add fixture** to `src/mocks/data.js`:

```javascript
export const mockNewFeature = {
  id: "feature-1",
  name: "Feature Name",
  status: "active",
};
```

2. **Add handler** to `src/mocks/handler.js`:

```javascript
http.get('/api/users/new-feature', ({ request }) => {
  const auth = request.headers.get('Authorization');
  if (!auth) {
    return HttpResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return HttpResponse.json({ status: 200, data: mockNewFeature });
}),
```

3. **Test the service** in appropriate `.test.jsx` file

### Debugging Test Failures

**1. Check auth setup:**

```javascript
beforeEach(() => {
  localStorage.clear();
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(mockAuthSession));
});
```

**2. Use screen debugging:**

```javascript
screen.debug(); // Print entire DOM
screen.debug(screen.getByRole("button")); // Print specific element
```

**3. Check query timing:**

```javascript
// Use findBy for async queries
const element = await screen.findByText(/text/i);

// Use queryBy for optional elements
const optional = screen.queryByText(/text/i);
expect(optional || screen.getByText(/fallback/i)).toBeTruthy();
```

**4. Verify MSW is intercepting:**

```bash
npm test -- --reporter=verbose
# Look for "GET /api/..." in console output
```

## Package.json Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:ci": "vitest run --reporter=verbose --coverage",
    "test:ui": "vitest --ui",
    "test:debug": "vitest --inspect-brk"
  }
}
```

| Script       | Purpose              |
| ------------ | -------------------- |
| `test`       | Local development    |
| `test:ci`    | CI/CD pipelines      |
| `test:ui`    | Visual test explorer |
| `test:debug` | Debug breakpoints    |

## Test Metrics

**Current Coverage:**

- **108 total tests** across 6 test files
- **passing tests** Right now 100%
- **Services:** authApi (17/17) + PhoenixApi (25+/25+)
- **Regression:** 20 data integrity tests

## Troubleshooting

| Issue                                            | Solution                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------- |
| **"Please sign in before loading backend data"** | Add `localStorage.setItem(AUTH_STORAGE_KEY, ...)` in `beforeEach()`          |
| **"Cannot find module" errors**                  | Run `npm install` and check import paths                                     |
| **Timeout errors (>1s)**                         | Use `waitFor()` for async operations, check MSW handlers exist               |
| **"ReferenceError: React is not defined"**       | Add `import React from "react"` for class components                         |
| **MSW not intercepting requests**                | Verify handler exists in `src/mocks/handler.js` and matches exact URL/method |
| **Test shows 0 tests**                           | Check for syntax errors with `npm test -- --reporter=verbose`                |

## Best Practices for Future Editors

### Do

- Use semantic queries: `getByRole("button", { name: /submit/i })`
- Set up auth in `beforeEach()` for protected endpoints
- Use `userEvent` instead of `fireEvent` for realistic interactions
- Check component props/callbacks for expected behavior
- Add mock data to `data.js` before creating handlers
- Use `waitFor()` for async operations
- Keep tests focused: one behavior per test
- Name tests as "should [behavior]"

### Don't

- Use `getByTestId` unless absolutely necessary (prefer roles/labels)
- Put `await` expressions inside `waitFor()` callbacks (use `findBy` instead)
- Test implementation details (test behavior, not internals)
- Mock more than needed (use real MSW handlers for integration tests)
- Copy test code without understanding the pattern
- Leave `console.log` statements in test files
- Create handlers without corresponding mock data fixtures

## Resources

- [Vitest Documentation](https://vitest.dev)
- [React Testing Library Queries](https://testing-library.com/docs/queries/about)
- [MSW Documentation](https://mswjs.io)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## Contributing Tests

When adding new features:

1. Write service tests first (API layer)
2. Write component tests (UI layer)
3. Add regression tests if data contract changes
4. Ensure all tests pass: `npm run test:ci`
5. Commit with message: "test: add [feature] tests"

If confused - Check existing test files in `src/tests/` for examples.

## Test Structure

### Directory Organization

```
src/
├── tests/
│   ├── setup.js                    # Global MSW server initialization
│   ├── services/
│   │   ├── authApi.test.jsx        # Authentication API tests (17 tests)
│   │   └── PhoenixApi.test.jsx     # All backend endpoints (25+ tests)
│   ├── LoginForm.test.jsx      # Login component tests
│   ├── ThreatDetails.test.jsx  # Threat detail tests
│   ├── Alerts.test.jsx         # Alert/Hazard component tests
│   └── ErrorBoundary.test.jsx  # Error boundary fallback tests
│   └── integrationLogsVsRiskAssessments.test.js # Data integrity tests (20 tests)
└── mocks/
    ├── data.js                     # Mock API response fixtures (15+ types)
    └── handler.js                  # MSW HTTP request interceptors (12+ endpoints)
```
