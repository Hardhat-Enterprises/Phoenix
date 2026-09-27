/**
 * CY017 — Security logger core.
 *
 * Provides:
 * - a sanitiser that removes control characters, truncates long strings, and
 *   redacts sensitive keys to reduce log-injection and secret-leakage risk;
 * - a generic `logSecurityEvent()` for building structured log records;
 * - eight typed helper functions, one per security event type;
 * - a configurable transport that defaults to NDJSON console output.
 *
 * The logger records decisions made by other controls. It does not decide
 * whether a request should be blocked, delayed, accepted, flagged, or escalated.
 */


import {
  ASYNC_RESTRICTION_REASON_VALUES,
  type AccessRestrictedAsyncReason,
  type AccessRestrictedInput,
  type AccessRestrictedReason,
  type AccessRestrictedSyncReason,
  type AuthFailureInput,
  type AuthFailureReason,
  type ComponentName,
  type DuplicateAlertInput,
  type LogDetails,
  type RbacDeniedInput,
  type RateLimitExceededInput,
  type RateLimitExceededReason,
  type SecurityEventType,
  type SecurityLogRecord,
  type SecurityOutcome,
  type SecurityReason,
  type SecurityRule,
  type SecuritySeverity,
  type TokenInvalidInput,
  type TokenInvalidReason,
  type TokenIssuedInput,
  type ValidationFailureInput,
  type Role
} from './securityLogTypes';

import {
  ConsoleJsonTransport,
  type LogTransport,
} from './logTransport';

const DEFAULT_COMPONENT: ComponentName = 'teavs-backend';


let activeTransport: LogTransport = new ConsoleJsonTransport();
let defaultComponent: ComponentName = DEFAULT_COMPONENT;

export function setLogTransport(transport: LogTransport): void {
  activeTransport = transport;
}

export function setDefaultComponent(component: ComponentName): void {
  defaultComponent = component;
}

// ---------------------------------------------------------------------------
// Sanitisation.
// ---------------------------------------------------------------------------

const SENSITIVE_DETAIL_KEYS = new Set([
  'password',
  'passwd',
  'pwd',
  'token',
  'jwt',
  'authorization',
  'authheader',
  'cookie',
  'secret',
  'privatekey',
  'apikey',
  'apisecret',
  'credential',
  'credentials',
  'refreshtoken',
  'accesstoken',
  'body',
  'rawbody',
  'requestbody',
  'rawpayload',
]);

function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_DETAIL_KEYS.has(normaliseKey(key));
}

const DEFAULT_DETAIL_MAX_STRING_LENGTH = 500;
function sanitiseString(value: string, max = DEFAULT_DETAIL_MAX_STRING_LENGTH): string {
  const stripped = value.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
  return stripped.length > max ? `${stripped.slice(0, max)}\u2026` : stripped;
}

const MAX_DETAILS_DEPTH = 6;
function sanitiseValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (typeof value === 'string') return sanitiseString(value);
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
  if (value === undefined) return undefined;
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (depth > MAX_DETAILS_DEPTH) return '[MaxDepthExceeded]';

  if (Array.isArray(value)) {
    return value.map((item) => sanitiseValue(item, depth + 1, seen));
  }

  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    seen.add(value);

    const out: Record<string, unknown> = {};
    for (const [key, childValue] of Object.entries(value as Record<string, unknown>)) {
      const cleanKey = sanitiseString(key, 100);
      if (isSensitiveKey(key)) {
        out[cleanKey] = '[REDACTED]';
      } else {
        out[cleanKey] = sanitiseValue(childValue, depth + 1, seen);
      }
    }
    return out;
  }

  return String(value);
}

function sanitiseDetails(details: LogDetails | undefined): LogDetails | undefined {
  if (details === undefined) return undefined;
  if (typeof details === 'string') return sanitiseString(details);
  return sanitiseValue(details, 0, new WeakSet<object>()) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Generic input parameter structure for the logger
// ---------------------------------------------------------------------------

export interface CoreLogPayload {
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  outcome: SecurityOutcome;
  reason?: SecurityReason;
  component?: ComponentName;
  user_id?: string;
  role?: Role;
  ip_address: string;
  endpoint: string;
  method: string;
  response_code?: number;
  rule_triggered?: SecurityRule;
  request_id?: string;
  details?: LogDetails;
}

/**
 * Build a SecurityLogRecord and pass it to the active transport.
 * Prefer the typed helpers for standard events; use this only when full control over every field is needed.
 */
export function logSecurityEvent(payload: CoreLogPayload): void {
  const record: SecurityLogRecord = {
    timestamp: new Date().toISOString(),
    component: payload.component ?? defaultComponent,
    event_type: payload.event_type,
    severity: payload.severity,
    outcome: payload.outcome,
    user_id: payload.user_id,
    role: payload.role,
    ip_address: payload.ip_address,
    endpoint: payload.endpoint,
    method: payload.method,
    response_code: payload.response_code,
    rule_triggered: payload.rule_triggered,
    request_id: payload.request_id,
    reason: payload.reason,
    details: sanitiseDetails(payload.details),
  };

  for (const key of Object.keys(record) as (keyof SecurityLogRecord)[]) {
    if (record[key] === undefined) delete record[key];
  }

  activeTransport.emit(record);
}

// ---------------------------------------------------------------------------
// Default tables used by the typed helpers.
// Each table reads as: "for this reason, here are the sensible default fields."
// Callers can override any default by passing the field on the input object.
// ---------------------------------------------------------------------------

const AUTH_FAILURE_SEVERITY: Record<AuthFailureReason, SecuritySeverity> = {
  bad_password: 'medium',
  unknown_user: 'medium',
  account_locked: 'critical',
  lockout_active: 'high',
};

const TOKEN_INVALID_SEVERITY: Record<TokenInvalidReason, SecuritySeverity> = {
  expired: 'low',
  malformed: 'medium',
  bad_signature: 'high',
  tampered_claims: 'critical',
  refresh_expired: 'medium',
  refresh_replay: 'critical',
};

interface ReasonDefaults {
  severity: SecuritySeverity;
  outcome: SecurityOutcome;
  responseCode?: number;
  rule: SecurityRule;
}

const RATE_LIMIT_DEFAULTS: Record<RateLimitExceededReason, ReasonDefaults> = {
  rate_limit_hit: {
    severity: 'high',
    outcome: 'blocked',
    responseCode: 429,
    rule: 'CY010 Rule 3 - Alert Creation Rate Limit',
  },
  throttled: {
    severity: 'medium',
    outcome: 'delayed',
    rule: 'CY010 Rule 4 - Alert Submission Throttling',
  },
};

const SYNC_ACCESS_DEFAULTS: Record<AccessRestrictedSyncReason, ReasonDefaults> = {
  authentication_failure: {
    severity: 'medium',
    outcome: 'blocked',
    responseCode: 401,
    rule: 'CY010 Rule 1 - Authentication Required',
  },
  rate_limit_hit: {
    severity: 'high',
    outcome: 'blocked',
    responseCode: 429,
    rule: 'CY010 Rule 3 - Alert Creation Rate Limit',
  },
  throttling: {
    severity: 'medium',
    outcome: 'delayed',
    rule: 'CY010 Rule 4 - Alert Submission Throttling',
  },
  duplicate_request: {
    severity: 'medium',
    outcome: 'flagged',
    responseCode: 202,
    rule: 'CY010 Rule 5 - Duplicate Alert Detection',
  },
};

const ASYNC_ACCESS_DEFAULTS: ReasonDefaults = {
  severity: 'critical',
  outcome: 'escalated',
  rule: 'CY010 Rule 9 - Temporary Access Restriction',
};

function isAsyncRestrictionReason(
  reason: AccessRestrictedReason,
): reason is AccessRestrictedAsyncReason {
  return (ASYNC_RESTRICTION_REASON_VALUES as readonly string[]).includes(reason);
}

// ---------------------------------------------------------------------------
// Typed helper functions.
// ---------------------------------------------------------------------------

export function logAuthFailure(input: AuthFailureInput): void {
  logSecurityEvent({
    ...input,
    event_type: 'auth_failure',
    severity: input.severity ?? AUTH_FAILURE_SEVERITY[input.reason],
    outcome: input.outcome ?? 'failure',
    response_code: input.response_code ?? 401,
    rule_triggered: input.rule_triggered ?? 'CY010 Rule 1 - Authentication Required',
  });
}

export function logTokenInvalid(input: TokenInvalidInput): void {
  logSecurityEvent({
    ...input,
    event_type: 'token_invalid',
    severity: input.severity ?? TOKEN_INVALID_SEVERITY[input.reason],
    outcome: input.outcome ?? 'blocked',
    response_code: input.response_code ?? 401,
    rule_triggered: input.rule_triggered ?? 'CY008 - JWT Authentication / Token Validation',
  });
}

export function logTokenIssued(input: TokenIssuedInput): void {
  logSecurityEvent({
    ...input,
    event_type: 'token_issued',
    severity: input.severity ?? 'info',
    outcome: input.outcome ?? 'success',
    response_code: input.response_code ?? 200,
    rule_triggered: input.rule_triggered ?? 'CY008 - JWT Authentication / Token Issuance',
  });
}

export function logRbacDenied(input: RbacDeniedInput): void {
  logSecurityEvent({
    ...input,
    event_type: 'rbac_denied',
    severity: input.severity ?? 'medium',
    outcome: input.outcome ?? 'blocked',
    response_code: input.response_code ?? 403,
    rule_triggered: input.rule_triggered ?? 'CY010 Rule 2 - Role-Based Alert Creation Restriction',
  });
}

export function logValidationFailure(input: ValidationFailureInput): void {
  const isSizeExceeded = input.reason === 'size_exceeded';
  const inferredRule: SecurityRule = isSizeExceeded
    ? 'CY010 Rule 7 - Request Size Enforcement'
    : 'CY010 Rule 6 - Input Validation Before Processing';

  logSecurityEvent({
    ...input,
    event_type: 'validation_failure',
    severity: input.severity ?? 'medium',
    outcome: input.outcome ?? (isSizeExceeded ? 'blocked' : 'failure'),
    response_code: input.response_code ?? 400,
    rule_triggered: input.rule_triggered ?? inferredRule,
  });
}

export function logRateLimitExceeded(input: RateLimitExceededInput): void {
  const defaults = RATE_LIMIT_DEFAULTS[input.reason];
  logSecurityEvent({
    ...input,
    event_type: 'rate_limit_exceeded',
    severity: input.severity ?? defaults.severity,
    outcome: input.outcome ?? defaults.outcome,
    response_code: input.response_code ?? defaults.responseCode,
    rule_triggered: input.rule_triggered ?? defaults.rule,
  });
}

export function logDuplicateAlert(input: DuplicateAlertInput): void {
  logSecurityEvent({
    ...input,
    event_type: 'duplicate_alert',
    severity: input.severity ?? 'medium',
    outcome: input.outcome ?? 'flagged',
    response_code: input.response_code ?? 202,
    rule_triggered: input.rule_triggered ?? 'CY010 Rule 5 - Duplicate Alert Detection',
  });
}

export function logAccessRestricted(input: AccessRestrictedInput): void {
  // Asynchronous escalation from the persistent-violation monitor.
  if (isAsyncRestrictionReason(input.reason)) {
    logSecurityEvent({
      ...input,
      event_type: 'access_restricted',
      severity: input.severity ?? ASYNC_ACCESS_DEFAULTS.severity,
      outcome: input.outcome ?? ASYNC_ACCESS_DEFAULTS.outcome,
      rule_triggered: input.rule_triggered ?? ASYNC_ACCESS_DEFAULTS.rule,
    });
    return;
  }

  // Synchronous restriction during a request. Look up the per-reason defaults.
  const defaults = SYNC_ACCESS_DEFAULTS[input.reason];
  const outcome = input.outcome ?? defaults.outcome;
  // Throttling has no fixed HTTP code: 429 only when the request is blocked, otherwise the call is just delayed.
  const isBlockedThrottling = input.reason === 'throttling' && outcome === 'blocked';

  logSecurityEvent({
    ...input,
    event_type: 'access_restricted',
    severity: input.severity ?? defaults.severity,
    outcome,
    response_code: input.response_code ?? (isBlockedThrottling ? 429 : defaults.responseCode),
    rule_triggered: input.rule_triggered ?? defaults.rule,
  });
}

