/**
 * CY017 - gRPC request context helper.
 *
 * The counterpart to `expressLogContext.ts`. Some security decisions can only be
 * made accurately inside a downstream service -- a login failure is the clearest
 * case, because only `user-service` knows whether the username was unknown or
 * the password was wrong, while the api-gateway deliberately returns one generic
 * message for both so the API cannot be used to enumerate accounts.
 *
 * That downstream service has no Express request, and gRPC request messages
 * carry no caller context: no client IP, no correlation ID. Rather than change
 * the shared `.proto` contract (which other workstreams also depend on), the
 * gateway attaches this context as gRPC *metadata* -- the transport-level
 * key/value channel that exists for exactly this kind of cross-cutting concern.
 * Metadata needs no schema change and is ignored by any service that does not
 * read it.
 *
 * This file deliberately does not import `@grpc/grpc-js`. It types the metadata
 * argument structurally, so the security-logging module stays framework-agnostic
 * and remains unit-testable with a plain object.
 */

import type { Role } from './securityLogTypes';

/** Metadata header names used to carry caller context between services. */
export const SECURITY_CONTEXT_HEADERS = {
  ip: 'x-forwarded-for',
  requestId: 'x-request-id',
  endpoint: 'x-original-endpoint',
  method: 'x-original-method',
  userId: 'x-actor-user-id',
  role: 'x-actor-role',
} as const;

/**
 * Structural stand-in for `grpc.Metadata`. Anything exposing `get(key)` works,
 * including a hand-built object in a test.
 */
export interface MetadataLike {
  get(key: string): ReadonlyArray<string | Buffer>;
}

export interface GrpcLogContext {
  ip_address: string;
  endpoint: string;
  method: string;
  user_id?: string;
  role?: Role;
  request_id?: string;
}

function readFirst(
  metadata: MetadataLike | undefined,
  key: string,
): string | undefined {
  const values = metadata?.get(key);
  if (!values || values.length === 0) return undefined;

  const first = values[0];
  const asString = typeof first === 'string' ? first : first?.toString('utf8');

  const trimmed = asString?.trim();
  return trimmed ? trimmed : undefined;
}

export interface GrpcLogContextOptions {
  /**
   * Label for the RPC being served, e.g. "grpc:LoginUser". Used only when the
   * caller did not supply the originating HTTP endpoint via metadata.
   */
  fallbackEndpoint: string;
}

export function fromGrpcMetadata(
  metadata: MetadataLike | undefined,
  options: GrpcLogContextOptions,
): GrpcLogContext {
  // `x-forwarded-for` may be a comma-separated chain; the original client is first.
  const forwarded = readFirst(metadata, SECURITY_CONTEXT_HEADERS.ip);
  const clientIp = forwarded?.split(',')[0]?.trim();

  return {
    ip_address: clientIp || 'unknown',
    endpoint:
      readFirst(metadata, SECURITY_CONTEXT_HEADERS.endpoint) ??
      options.fallbackEndpoint,
    method: readFirst(metadata, SECURITY_CONTEXT_HEADERS.method) ?? 'RPC',
    user_id: readFirst(metadata, SECURITY_CONTEXT_HEADERS.userId),
    role: readFirst(metadata, SECURITY_CONTEXT_HEADERS.role),
    request_id: readFirst(metadata, SECURITY_CONTEXT_HEADERS.requestId),
  };
}
