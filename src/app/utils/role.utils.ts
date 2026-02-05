const FINALIZE_ALLOWED_ROLES = new Set(['IC_OPERATOR', 'IC_EDITOR']);

export function canFinalizeForm(userRole?: string | null): boolean {
  if (!userRole) return false;
  const normalized = String(userRole).trim().toUpperCase();
  return FINALIZE_ALLOWED_ROLES.has(normalized);
}
