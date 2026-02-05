const FINALIZE_ALLOWED_ROLES = new Set(['IC_OPERATOR', 'IC_EDITOR']);

export function canFinalizeForm(userRole?: string | null, status?: string | null): boolean {
  if (!userRole) return false;
  const normalizedRole = String(userRole).trim().toUpperCase();
  if (!FINALIZE_ALLOWED_ROLES.has(normalizedRole)) return false;

  const normalizedStatus = String(status ?? '').trim().toUpperCase();
  if (!normalizedStatus) return true;
  return normalizedStatus !== 'LOCKED';
}
