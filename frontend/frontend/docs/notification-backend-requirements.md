# Notification API — backend requirements for a future sprint

## Why this document exists

The notification panel reads live data from `GET /api/notifications`. Every
interaction it offers beyond reading — mark as read, mark all read, delete —
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

The panel is built to display seven things. The contract supplies two of them.

| Field | Needed for | Suggested addition |
| --- | --- | --- |
| `severity` | severity badge, visual triage | `string severity = 5;` |
| `created_at` | timestamp display, newest-first ordering | `int64 created_at = 6;` (epoch ms, UTC) |
| read state | unread count, unread dot, mark-as-read | `bool read = 7;` or `int64 read_at = 7;` |
| `event_type` | the event classification, shown as its own field | `string event_type = 8;` |
| `metadata` | the per-event detail shown in the details view | `string metadata = 9;` (JSON object) |

Until `created_at` exists the panel cannot order by recency; it falls back to
the order the backend returns and keeps that order stable across refetches.

**No frontend change is needed when these land.**
`src/services/notificationAdapter.js` already accepts each field under several
names (`created_at` / `createdAt` / `timestamp`, `severity` / `level` /
`priority`, `read` / `is_read` / `status`, `event_type` / `eventType` / `type`,
`metadata` / `meta` / `context`), and hides any field the record does not carry.

### The metadata field in particular

`metadata` is the one field whose shape the frontend cannot assume, so
`src/services/notificationMetadata.js` accepts all of the following and none of
them can break a render:

| What arrives | What the panel does |
| --- | --- |
| a JSON object string, `{"source_ip":"10.0.0.4"}` | parses it and lists each key as a labelled row |
| an already-decoded object | lists it the same way |
| `null`, absent, `""` | shows no details section |
| a JSON array or scalar | lists the entries, or shows the single value |
| anything that fails to parse | shows the raw text, labelled as unreadable |

Preferences for the backend, in order: send it decoded, or send a JSON **object**
as a string. Keys may be `snake_case` or `camelCase` — both are turned into
words for display. Values should be scalars or shallow objects; deep structures
are serialised rather than expanded.

## Gap 2 — no mutation endpoints

| Purpose | Suggested REST | Suggested rpc | Notes |
| --- | --- | --- | --- |
| Mark one read | `PATCH /api/notifications/:id/read` | `MarkNotificationRead` | should be idempotent |
| Mark all read | `POST /api/notifications/read-all` | `MarkAllNotificationsRead` | returns the updated count |
| Delete one | `DELETE /api/notifications/:id` | `DeleteNotification` | decide soft vs hard delete |

Each should return the updated record (or an updated count) so the panel can
reconcile rather than guess.

The panel applies each of these optimistically and rolls the list back to its
previous state if the request fails, so a rejection is safe — but it does mean
**the response status matters**. `401` is reported to the reader as an expired
session with a sign-in action, `400` / `422` as a rejected request quoting the
message in `data.errors`, and `5xx` as a server-side failure worth retrying.

Mark-one-unread is deliberately not listed: the panel has no control for it
today. If one is wanted, `PATCH /api/notifications/:id/unread` is the obvious
shape and `markUnreadInList` already exists in
`src/services/notificationListState.js`.

## Open questions for the backend team

1. **Per-user scoping.** `GET /api/notifications` is currently unauthenticated
   and returns a global list. Mutations only make sense per user, so they need
   the `authenticate` middleware that `user.routes.ts` already uses — and the
   read endpoint probably needs it too.
2. **Soft or hard delete.** If delete hard-deletes, an audit trail is lost. A
   `dismissed_at` column keeps the record and is reversible.
3. **Where notifications originate.** RabbitMQ is already wired into the
   service. If notifications are produced by events, read and dismissal state
   belongs to the user, not the event.

## How the frontend switches on

The panel is split so that only one small file knows about transport:

- `src/components/NotificationList.jsx` — renders everything, from injected
  records and injected callbacks. It imports no API module.
- `src/components/useNotificationFeed.js` — turns a *provider* into those
  records and callbacks.
- `src/services/notificationApiProvider.js` — the provider backed by the
  gateway. **This is the only file that needs to change.**

The request functions already exist in `src/services/phoenixApi.js`
(`markNotificationRead`, `markAllNotificationsRead`, `deleteNotification`) and
point at the paths proposed above. Nothing calls them, because
`NOTIFICATION_MUTATIONS_SUPPORTED` is `false`; the provider substitutes a local
no-op and reports `persists: false`.

So the switch-on is:

1. Confirm the deployed paths match the ones in `phoenixApi.js`, and correct
   them there if they do not.
2. Set `NOTIFICATION_MUTATIONS_SUPPORTED = true`.

That is all. The provider starts sending real requests, `persists` becomes true,
and every piece of wording that admits the change is local — the footer note and
the per-record control labels — disappears on its own, because all of it is
derived from that one flag.

## Running the panel without a backend

`VITE_NOTIFICATION_PROVIDER=mock` serves notification records from memory
(`src/services/mockNotificationProvider.js`), including records that exercise
malformed metadata and an unparseable timestamp. The mock reports
`persists: false`, so the panel never describes a mock action as saved.

## Out of scope here: sending alerts

The panel previously offered a "prepare demo alert" action. It was removed
because no endpoint sends anything and the button implied otherwise. If
outbound alerting is wanted, it needs its own endpoint — recipient, channel,
body, and a delivery status — and `NOTIFICATION_SEND_SUPPORTED` exists to gate
the UI on it.
