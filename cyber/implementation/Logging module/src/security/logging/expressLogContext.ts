/**
 * CY017 — Express request context helper.
 *
 * This adapter extracts safe request context from an Express Request so each
 * middleware or handler does not need to repeat the same logic. The core logger
 * does not depend on Express; only this helper imports Express types.
 */

import type {Role} from './securityLogTypes'

interface AuthenticatedUser {
  user_id?: string;
  role?: Role;
}

interface RequestWithUser {
  ip?: string;
  method?: string;
  path?: string;
  route?: { path: string };
  user?: AuthenticatedUser;
}

export interface ExpressLogContext {
  ip_address: string;
  endpoint: string;
  method: string;
  user_id?: string;
  role?: Role;
}

export function fromRequest(req: Request): ExpressLogContext {
  const reqWithUser = req as RequestWithUser;
  return {
    ip_address: reqWithUser.ip ?? 'unknown',
    endpoint: getEndpoint(reqWithUser),
    method: reqWithUser.method ?? 'unknown',
    user_id: reqWithUser.user?.user_id,
    role: reqWithUser.user?.role,
  };
}

function getEndpoint(req: RequestWithUser): string {
  // The matched route path (e.g. "/api/alerts/:id") is the most useful endpoint label,
  // but it is only set after Express finishes routing. Fall back to the raw path otherwise.
  const routePath = req.route?.path;
  if (typeof routePath === 'string') return routePath;
  return req.path ?? 'unknown';
}
