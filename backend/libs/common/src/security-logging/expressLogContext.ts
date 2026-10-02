/**
 * CY017 — Express request context helper.
 *
 * This adapter extracts safe request context from an Express Request so each
 * middleware or handler does not need to repeat the same logic. The core logger
 * does not depend on Express; only this helper imports Express types.
 */

import type { Request } from 'express';
import type {Role} from './securityLogTypes'
interface AuthenticatedUser {
  user_id?: string;
  role?: Role;
}

interface RequestWithUser extends Request {
  user?: AuthenticatedUser;
}

export interface ExpressLogContext {
  ip_address: string;
  endpoint: string;
  method: string;
  user_id?: string;
  role?: Role;
  request_id?: string;
}

export function fromRequest(req: Request): ExpressLogContext {
  const user = (req as RequestWithUser).user;
  
  return {
    ip_address: req.ip ?? 'unknown',
    endpoint: getEndpoint(req),
    method: req.method,
    user_id: user?.user_id,
    role: user?.role,
    request_id: Array.isArray(req.headers?.['x-request-id']) //checking if header is an array
      ? req.headers['x-request-id'][0] // handling array
      : req.headers?.['x-request-id'],
  };
}

function getEndpoint(req: Request): string {
  // The matched route path (e.g. "/api/alerts/:id") is the most useful endpoint label,
  // but it is only set after Express finishes routing. Fall back to the raw path otherwise.
  const routePath = req.route?.path;
  if (typeof routePath === 'string') {
    // `req.route.path` is relative to the router the route was registered on, so
    // a route mounted at "/api/users" reports only "/user". Prefixing `baseUrl`
    // restores the full path the client actually called, which is what a log
    // reader (or SIEM correlation rule) needs to see.
    const base = req.baseUrl ?? '';
    const full = `${base}${routePath}`.replace(/\/{2,}/g, '/');
    return full === '' ? '/' : full;
  }
  return req.originalUrl?.split('?')[0] ?? req.path ?? 'unknown';
}
