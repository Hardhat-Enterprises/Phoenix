# PHOENIX Frontend Structure

PHOENIX uses React with Vite for the frontend application.

## Components

`src/components` contains reusable React user interface components.

Application-level rendering errors are handled by `ErrorBoundary.jsx`, while
`ErrorFallback.jsx` provides a safe recovery interface for users.

## Configuration

`src/config` contains shared application configuration.

The configuration includes:

- page identifiers
- navigation labels
- user roles
- environment-specific frontend configuration

Shared configuration should be used instead of repeating hard-coded values
across multiple components.

## Utilities

`src/utils` contains reusable helper functions that do not render React
components.

The current utilities include:

- development-only logging
- date formatting
- text formatting
- general value formatting

## Services

`src/services` contains frontend communication with PHOENIX backend services.

Environment-specific hosts and local-network addresses should not be
hard-coded directly inside UI components or service logic. Vite environment
variables and the shared environment configuration should be used instead.

## Error Handling

The PHOENIX application is wrapped in an application-level React error
boundary.

If an unexpected rendering failure occurs, users are shown a friendly recovery
page with:

- Try Again
- Return to Dashboard

Technical stack traces are not displayed to normal users.

Detailed error information is logged only when the application is running in
development mode.

## Not Found Page

`NotFound.jsx` provides a reusable application fallback for unknown pages.

The component remains independent from URL routing so it can be connected to
the routing implementation when the team's URL-based routing work is
integrated.

## Environment Configuration

Developer-specific environment values belong in `.env.local`.

Supported environment variables are documented using `.env.example`.

`.env.local` must not be committed to the repository.

## Quality Checks

Before frontend changes are committed, run:

```bash
npm run lint