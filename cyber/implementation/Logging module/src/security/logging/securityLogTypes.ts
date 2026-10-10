/**
 * CY017 — Security logging type definitions.
 *
 * This file is the single source of truth for the structured security log
 * record shape and the allowed reason sub-classifiers for each event type.
 * It is framework-agnostic: Express-specific types are only used by
 * `expressLogContext.ts`.
 * */

// ---------------------------------------------------------------------------
// Event types: the eight security event categories used by the logger.
// ---------------------------------------------------------------------------

export type SecurityEventType =
  | 'auth_failure'
  | 'token_invalid'
  | 'token_issued'
  | 'rbac_denied'
  | 'validation_failure'
  | 'rate_limit_exceeded'
  | 'duplicate_alert'
  | 'access_restricted';

// ---------------------------------------------------------------------------
// Severity vocabulary
// The caller chooses final severity; helpers provide sensible defaults
// ---------------------------------------------------------------------------

export type SecuritySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

// ---------------------------------------------------------------------------
// Outcome vocabulary.
// ---------------------------------------------------------------------------

export type SecurityOutcome =
  | 'success'
  | 'failure'
  | 'blocked'
  | 'delayed'
  | 'flagged'
  | 'restricted'
  | 'escalated';

// ---------------------------------------------------------------------------
// Rule references.
// The union includes the main CY010/CY017 references but still permits future
// project-specific rule strings without requiring this file to change.
// ---------------------------------------------------------------------------

export type SecurityRule =
  | 'CY010 Rule 1 - Authentication Required' 
  | 'CY010 Rule 2 - Role-Based Alert Creation Restriction'
  | 'CY010 Rule 3 - Alert Creation Rate Limit' 
  | 'CY010 Rule 4 - Alert Submission Throttling'
  | 'CY010 Rule 5 - Duplicate Alert Detection'
  | 'CY010 Rule 6 - Input Validation Before Processing'
  | 'CY010 Rule 7 - Request Size Enforcement' 
  | 'CY010 Rule 8 - Suspicious Activity Logging'
  | 'CY010 Rule 9 - Temporary Access Restriction' 
  | 'CY017 - Logging and Monitoring'
  | 'CY008 - JWT Authentication / Token Issuance' 
  | 'CY008 - JWT Authentication / Token Validation'
  | 'CY009 - Input Validation and Security Rules' 
  | (string & {});

// ---------------------------------------------------------------------------
// Reason sub-classifiers per event type.
// ---------------------------------------------------------------------------

/**
 * Login-credential failure reasons.
 *
 * `account_locked`  — this request triggered the lockout (the N-th consecutive failed attempt that locks the account).
 * `lockout_active`  — a subsequent attempt arrived while the account was already locked.
 */
export type AuthFailureReason =
  | 'bad_password'
  | 'unknown_user'
  | 'account_locked'
  | 'lockout_active';

/** JWT verification failure reasons, including refresh-token failures. */
export type TokenInvalidReason =
  | 'expired'
  | 'malformed'
  | 'bad_signature'
  | 'tampered_claims'
  | 'refresh_expired'
  | 'refresh_replay';

/** Validation failure reasons covering CY010 Rule 6 and Rule 7. */
export type ValidationFailureReason =
  | 'missing_field'
  | 'invalid_type'
  | 'invalid_enum'
  | 'length_exceeded'
  | 'bad_format'
  | 'size_exceeded';

/** Rate limiter outputs: hard cap versus progressive throttling. */
export type RateLimitExceededReason = 'rate_limit_hit' | 'throttled';

/** Exactly four synchronous access-restriction reasons. */
export type AccessRestrictedSyncReason =
  | 'authentication_failure'
  | 'rate_limit_hit'
  | 'throttling'
  | 'duplicate_request';

/**
 * Asynchronous access-restriction reasons used by the persistent-violation monitor.
 *
 * One source list. The TypeScript type is derived from the array via
 * `typeof ASYNC_RESTRICTION_REASON_VALUES[number]`, and runtime membership checks
 */
export const ASYNC_RESTRICTION_REASON_VALUES = [
  'repeated_rate_limit_hit',
  'repeated_throttling',
  'repeated_duplicate_request',
  'repeated_invalid_input',
  'repeated_authentication_failure',
  'repeated_rbac_denied',
  'sustained_abuse_pattern',
] as const;

export type AccessRestrictedAsyncReason = typeof ASYNC_RESTRICTION_REASON_VALUES[number];

export type AccessRestrictedReason =
  | AccessRestrictedSyncReason
  | AccessRestrictedAsyncReason;

/** Union of every legal 'reason' value. */
export type SecurityReason =
  | AuthFailureReason
  | TokenInvalidReason
  | ValidationFailureReason
  | RateLimitExceededReason
  | AccessRestrictedReason;

// ---------------------------------------------------------------------------
// Component and details types.
// ---------------------------------------------------------------------------

export type ComponentName =
  | 'teavs-backend'
  | 'adcrs-ingestion'
  | 'auth-service'
  | 'teavs-security-monitor'
  | (string & {});

export type LogDetails = Record<string, unknown> | string;

// ---------------------------------------------------------------------------
// Structured security log record.
// ---------------------------------------------------------------------------

export interface SecurityLogRecord {
  timestamp: string;
  component: ComponentName;
  event_type: SecurityEventType;
  severity: SecuritySeverity;
  outcome: SecurityOutcome;
  user_id?: string;
  role?: Role;
  ip_address: string;
  endpoint: string;
  method: string;
  response_code?: number;
  rule_triggered?: SecurityRule;
  request_id?: string;
  reason?: SecurityReason;
  details?: LogDetails;
}

// ---------------------------------------------------------------------------
// Helper input shapes.
// ---------------------------------------------------------------------------
export type Role = 'council_officer' | 'public_user' | 'admin' | 'emergency_services'
export interface BaseLogInput {
  component?: ComponentName;
  severity?: SecuritySeverity;
  outcome?: SecurityOutcome;
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

export interface AuthFailureInput extends BaseLogInput {
  reason: AuthFailureReason;
}

export interface TokenInvalidInput extends BaseLogInput {
  reason: TokenInvalidReason;
}

/** `token_issued` carries no reason because it is a positive audit event. */
export type TokenIssuedInput = BaseLogInput;

/** `rbac_denied` carries no reason for now. */
export type RbacDeniedInput = BaseLogInput;

export interface ValidationFailureInput extends BaseLogInput {
  reason: ValidationFailureReason;
}

export interface RateLimitExceededInput extends BaseLogInput {
  reason: RateLimitExceededReason;
}

/** `duplicate_alert` carries no reason for now. */
export type DuplicateAlertInput = BaseLogInput;

export interface AccessRestrictedInput extends BaseLogInput {
  reason: AccessRestrictedReason;
}
