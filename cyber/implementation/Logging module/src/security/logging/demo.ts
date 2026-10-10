/**
 * CY017  demo for the security logging module.
 *
 * Run from the `module/` directory:
 *   npm run demo
 */

import type { Request } from 'express';
import type { Role } from './securityLogTypes';
import {
  fromRequest,
  logAccessRestricted,
  logAuthFailure,
  logDuplicateAlert,
  logRateLimitExceeded,
  logRbacDenied,
  logSecurityEvent,
  logTokenInvalid,
  logTokenIssued,
  logValidationFailure,
} from './index';

// ---------------------------------------------------------------------------
// dummy express request obj
// ---------------------------------------------------------------------------
function makeReq(
  ip: string,
  method: string,
  path: string,
  user?: { user_id?: string; role?: Role },
): Request {
  return { ip, method, path, user } as unknown as Request;
}

// One stub per distinct (endpoint, identity) scenario used in the demo.
const unauthLoginReq      = makeReq('203.0.113.42', 'POST', '/api/login');
const officerAlertsReq    = makeReq('203.0.113.42', 'POST', '/api/alerts', { user_id: 'usr_8821', role: 'council_officer' });
const publicUserAlertsReq = makeReq('203.0.113.42', 'POST', '/api/alerts', { user_id: 'usr_9999', role: 'public_user' });


const testReq= makeReq('198.162.4.1', "POST", '/api/alerts', {user_id:'sayek17', role: 'admin'} );


logValidationFailure({...fromRequest(testReq), reason: 'size_exceeded'})
// ---------------------------------------------------------------------------
// Demo cases — context (ip, endpoint, method, user_id, role, request_id)
// comes from fromRequest(); only event-specific fields are passed directly.
// ---------------------------------------------------------------------------

// console.log('\n--- 1. auth_failure: bad password ---');
// logAuthFailure({ ...fromRequest(unauthLoginReq), reason: 'bad_password' });

// console.log('\n--- 2. auth_failure: account locked (severity should be critical) ---');
// logAuthFailure({ ...fromRequest(identifiedLoginReq), reason: 'account_locked' });

// console.log('\n--- 3. token_invalid: expired (severity low) ---');
// logTokenInvalid({ ...fromRequest(unauthAlertsReq), reason: 'expired' });

// console.log('\n--- 4. token_invalid: bad signature (severity high) ---');
// logTokenInvalid({ ...fromRequest(unauthAlertsReq), reason: 'bad_signature' });

// console.log('\n--- 5. token_invalid: tampered claims (severity critical) ---');
// logTokenInvalid({ ...fromRequest(unauthAlertsReq), reason: 'tampered_claims' });

// console.log('\n--- 6. token_issued: successful login ---');
// logTokenIssued({ ...fromRequest(successfulLoginReq) });

// console.log('\n--- 7. rbac_denied: wrong role ---');
// logRbacDenied({ ...fromRequest(publicUserAlertsReq) });

// console.log('\n--- 8. validation_failure: missing field ---');
// logValidationFailure({
//   ...fromRequest(officerAlertsReq),
//   reason: 'missing_field',
//   details: { field: 'title' },
// });

// console.log('\n--- 9. validation_failure: size exceeded (outcome should be blocked) ---');
// logValidationFailure({
//   ...fromRequest(officerAlertsReq),
//   reason: 'size_exceeded',
//   details: { max_size: '5KB', observed_bytes: 7000 },
// });

// console.log('\n--- 10. rate_limit_exceeded: hard cap hit (severity high, 429) ---');
// logRateLimitExceeded({ ...fromRequest(officerAlertsReq), reason: 'rate_limit_hit' });

// console.log('\n--- 11. rate_limit_exceeded: throttled (delayed, no HTTP code) ---');
// logRateLimitExceeded({ ...fromRequest(officerAlertsReq), reason: 'throttled' });

// console.log('\n--- 12. duplicate_alert: same alert within 5 minutes (response_code 202) ---');
// logDuplicateAlert({ ...fromRequest(officerAlertsReq) });

// console.log('\n--- 13. access_restricted (sync): rate_limit_hit (severity high, 429) ---');
// logAccessRestricted({ ...fromRequest(officerAlertsReq), reason: 'rate_limit_hit' });

// console.log('\n--- 14. access_restricted (sync): duplicate_request (flagged, 202) ---');
// logAccessRestricted({ ...fromRequest(officerAlertsReq), reason: 'duplicate_request' });

// console.log('\n--- 15. access_restricted (async): repeated_duplicate_request (critical, escalated) ---');
// logAccessRestricted({
//   ...fromRequest(officerAlertsReq),
//   component: 'teavs-security-monitor',
//   reason: 'repeated_duplicate_request',
// });

// console.log('\n--- 16. access_restricted (async): sustained_abuse_pattern (critical, escalated) ---');
// logAccessRestricted({
//   ...fromRequest(officerAlertsReq),
//   component: 'teavs-security-monitor',
//   reason: 'sustained_abuse_pattern',
// });

// console.log('\n--- 17. sanitisation: password / token / body should appear as [REDACTED] ---');
// logSecurityEvent({
//   ...fromRequest(unauthLoginReq),
//   event_type: 'auth_failure',
//   severity: 'medium',
//   outcome: 'failure',
//   reason: 'bad_password',
//   details: {
//     attempted_username: 'alice@example.com',
//     password: 'super-secret-password',
//     token: 'eyJhbGciOi...',
//     body: 'raw request body',
//     note: 'control chars\nshould be stripped\rfrom output',
//   },
// });

console.log('\n--- end of demo ---');
