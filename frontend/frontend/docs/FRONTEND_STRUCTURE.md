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

## Notifications

The notification panel is split so that presentation, data and transport are
separate concerns:

- `src/components/NotificationList.jsx` renders everything. It takes records and
  callbacks as props and imports no API module, so it can be developed and
  tested before any backend or control it depends on exists.
- `src/components/useNotificationFeed.js` turns a *provider* into those records
  and callbacks, and owns the difference between a first load and a background
  refresh.
- `src/components/notifier.jsx` is wiring only: it picks a provider and hands it
  to the list.
- `src/services/notificationAdapter.js` maps a backend record onto the shape the
  list renders, reading each field from a list of accepted aliases.
- `src/services/notificationMetadata.js` parses the metadata field, which may
  arrive as a JSON string, an object, empty, or malformed.
- `src/services/notificationListState.js` holds the list transformations as pure
  functions, which is what makes the optimistic path and its rollback testable
  without a DOM.

A provider is any object shaped like
`{ list(), markRead(id), markAllRead(), remove(id), persists, isMock, label }`.
Two exist: `mockNotificationProvider.js` (in memory, `persists: false`) and
`notificationApiProvider.js` (the gateway). Set
`VITE_NOTIFICATION_PROVIDER=mock` to run the panel without a backend.

`persists` is what the panel's wording follows: while it is false, no
confirmation says a change was saved, and the footer says so too.

## Quality Checks

Before frontend changes are committed, run:

```bash
npm run lint
npm test
```