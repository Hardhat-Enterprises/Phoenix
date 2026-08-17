# CY017 — Reusable Security Logging Module

TypeScript implementation of the Project Phoenix security logging module

## Files

| File | Purpose |
|---|---|
| `securityLogTypes.ts` | Typed union types for event types, severity, outcome, rules, reason sub-classifiers, and the `SecurityLogRecord` shape. |
| `logTransport.ts` | `LogTransport` interface, default `ConsoleJsonTransport`, and `NullTransport` for tests. |
| `expressLogContext.ts` | `fromRequest(req)` extracts `ip_address`, `endpoint`, `method`, `user_id`, `role`, and `request_id` from an Express request. |
| `securityLogger.ts` | Core `logSecurityEvent()` plus eight typed helper functions. |
| `examples.ts` | Minimal Express examples showing each helper called from middleware or handlers. |
| `index.ts` | Convenience re-export file. |

## Helper functions

| Helper | Event type | Reason values |
|---|---|---|
| `logAuthFailure` | `auth_failure` | `bad_password`, `unknown_user`, `account_locked`, `lockout_active` |
| `logTokenInvalid` | `token_invalid` | `expired`, `malformed`, `bad_signature`, `tampered_claims`, `refresh_expired`, `refresh_replay` |
| `logTokenIssued` | `token_issued` | none |
| `logRbacDenied` | `rbac_denied` | none |
| `logValidationFailure` | `validation_failure` | `missing_field`, `invalid_type`, `invalid_enum`, `length_exceeded`, `bad_format`, `size_exceeded` |
| `logRateLimitExceeded` | `rate_limit_exceeded` | `rate_limit_hit`, `throttled` |
| `logDuplicateAlert` | `duplicate_alert` | none |
| `logAccessRestricted` | `access_restricted` | Sync: `authentication_failure`, `rate_limit_hit`, `throttling`, `duplicate_request`; Async: `repeated_rate_limit_hit`, `repeated_throttling`, `repeated_duplicate_request`, `repeated_invalid_input`, `repeated_authentication_failure`, `repeated_rbac_denied`, `sustained_abuse_pattern` |

## Output format

The module creates structured JSON records. The default transport prints each record as one line:

```ts
console.log(JSON.stringify(record));
```

That means the current output is NDJSON: newline-delimited JSON. `console.log` is only the temporary output method; the log format is still structured JSON.

## Quick start

```ts
import { fromRequest } from './expressLogContext';
import { logAuthFailure } from './securityLogger';

const ctx = fromRequest(req);

logAuthFailure({
  ...ctx,
  reason: 'unknown_user',
  details: { attempted_username: 'example@example.com' },
});
```

## Transport replacement

When database, SIEM, Winston, Pino, or multi-output logging is added later, implement `LogTransport` and set it once at startup:

```ts
import { setLogTransport } from './securityLogger';
import { MyDatabaseTransport } from './myDatabaseTransport';

setLogTransport(new MyDatabaseTransport());
```

Existing middleware and handlers do not need to change.


## Safety notes

- The logger records security decisions; it does not make blocking or detection decisions itself.
- It does not write to a database, SIEM, dashboard, or remote service in this phase.
- It does not aggregate repeated events across windows; the async monitor will consume these records later.
- The `details` field is sanitised: control characters are removed, long strings are truncated, circular references are handled, and sensitive keys such as passwords, tokens, secrets, cookies, authorization headers, and raw request bodies are redacted.
