export type SecurityEvent =
  | "FAILED_LOGIN"
  | "INVALID_JWT"
  | "UNAUTHORIZED_ACCESS"
  | "FORBIDDEN_ACCESS"
  | "RATE_LIMIT_EXCEEDED"
  | "VALIDATION_FAILED"
  | "LOGIN_SUCCESS"
  | "DATA_INGESTION_FAILURE";

export type Severity = "LOW" | "MEDIUM" | "HIGH";

export interface SecurityNotification {
  event: SecurityEvent;
  severity: Severity;
  message: string;
  endpoint: string;
  method: string;
  timestamp: string;
  ip?: string;
  userId?: string;
}