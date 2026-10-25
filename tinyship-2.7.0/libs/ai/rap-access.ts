/** Server-only exception, pinned to the already registered account as well as
 * its email. Request-body fields and new accounts cannot grant this access. */
export function hasComplimentaryRapAccess(user: { id: string; email: string; isAnonymous?: boolean | null } | null | undefined): boolean {
  return Boolean(user && user.isAnonymous === false
    && user.id === 'pcdkUArAoCwru9R2jZvgghjK8SX9QFli'
    && user.email.trim().toLowerCase() === '1127512642@qq.com');
}
