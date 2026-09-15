# Notification API — backend requirements for a future sprint

## Why this document exists

The notification panel reads live data from `GET /api/notifications`. Every
interaction it offers beyond reading — mark as read, dismiss, clear all —
changes local React state only, because the gateway exposes no endpoint that
would persist them. The panel states this in its own UI rather than implying a
save that never happens.

This document records what the backend needs to add for those controls to
become real, and what the frontend will do once they exist.

## What exists today

**Gateway** — `backend/api-gateway/src/routes/notification.routes.ts`

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/notifications/health` | none |
| GET | `/api/notifications` | none |

**gRPC contract** — `backend/libs/proto/notification.proto`

```proto
message Notification {
  int32  id        = 1;
  string title     = 2;
  string body      = 3;
  string recipient = 4;
}
```

**Current behaviour:** `notification-service/src/services/notification.service.ts`
is still a stub. It logs `"Fetching notifications from database..."` but queries
nothing and returns no `notifications` field, so the endpoint always responds
with an empty array. Any work below should start there.

## Gap 1 — fields missing from the read model

The panel is built to display five things. The contract supplies two of them.

| Field | Needed for | Suggested addition |
| --- | --- | --- |
| `severity` | severity badge, visual triage | `string severity = 5;` |
| `created_at` | timestamp display, newest-first ordering | `int64 created_at = 6;` (epoch ms, UTC) |
| read state | unread count, unread dot | `bool read = 7;` or `int64 read_at = 7;` |

Until `created_at` exists the panel cannot order by recency; it falls back to
the order the backend returns and keeps that order stable across refetches.

**No frontend change is needed when these land.** `src/services/notificationAdapter.js`
already accepts each field under several names (`created_at` / `createdAt` /
`timestamp`, `severity` / `level` / `priority`, `read` / `is_read` / `status`),
and hides any field the record does not carry.

## Gap 2 — no mutation endpoints

| Purpose | Suggested REST | Suggested rpc | Notes |
| --- | --- | --- | --- |
| Mark one read | `PATCH /api/notifications/:id/read` | `MarkNotificationRead` | should be idempotent |
| Mark one unread | `PATCH /api/notifications/:id/unread` | `MarkNotificationUnread` | needed to undo a misclick |
| Mark all read | `POST /api/notifications/read-all` | `MarkAllNotificationsRead` | returns the updated count |
| Dismiss one | `DELETE /api/notifications/:id` | `DeleteNotification` | decide soft vs hard delete |
| Clear all | `DELETE /api/notifications` | `ClearNotifications` | destructive; consider confirmation semantics |

Each should return the updated record (or an updated count) so the panel can
reconcile rather than guess.

## Open questions for the backend team

1. **Per-user scoping.** `GET /api/notifications` is currently unauthenticated
   and returns a global list. Mutations only make sense per user, so they need
   the `authenticate` middleware that `user.routes.ts` already uses — and the
   read endpoint probably needs it too.
2. **Soft or hard delete.** If dismiss hard-deletes, an audit trail is lost. A
   `dismissed_at` column keeps the record and is reversible.
3. **Where notifications originate.** RabbitMQ is already wired into the
   service. If notifications are produced by events, dismissal state belongs to
   the user, not the event.

## How the frontend switches on

`src/services/phoenixApi.js` exports two flags:

```js
export const NOTIFICATION_MUTATIONS_SUPPORTED = false;
export const NOTIFICATION_SEND_SUPPORTED = false;
```

The panel branches on them for button labels, `aria-label` text, toast wording,
and the explanatory footer note. To adopt the new endpoints: add the request
functions beside `getNotifications()`, flip the relevant flag to `true`, and
call the new function from the existing handler in `src/components/notifier.jsx`.
The wording that admits the change is local-only disappears on its own.

## Out of scope here: sending alerts

The panel previously offered a "prepare demo alert" action. It was removed
because no endpoint sends anything and the button implied otherwise. If
outbound alerting is wanted, it needs its own endpoint — recipient, channel,
body, and a delivery status — and `NOTIFICATION_SEND_SUPPORTED` exists to gate
the UI on it.
