const FINALIZE_ALLOWED_ROLES = new Set(['IC_OPERATOR', 'IC_EDITOR']);

/** Estado en el que solo el rol CLIENT puede editar el formulario; el resto en solo lectura. */
export const FORM_STATUS_SHARED_WITH_CLIENT = 'SHARED_WITH_CLIENT';

export function normalizeFormStatus(status?: string | null): string {
  return String(status ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

/**
 * Regla **solo** para el estado SHARED_WITH_CLIENT: personal interno en solo lectura;
 * el rol CLIENT puede editar.
 *
 * Para **cualquier otro** `status` devuelve `false`: no altera el comportamiento previo.
 * En `DynamicFormComponent` siguen aplicándose en cascada, sin cambios:
 * - `schema.canEdit === false`
 * - `readOnlyRoles` por bloque (`Block AccessPolicy`)
 * - validaciones de envío, `formReadOnly`, etc.
 */
export function isReadOnlyForSharedWithClientState(
  status?: string | null,
  userRole?: string | null
): boolean {
  if (normalizeFormStatus(status) !== FORM_STATUS_SHARED_WITH_CLIENT) {
    return false;
  }
  const role = String(userRole ?? '')
    .trim()
    .toUpperCase();
  return role !== 'CLIENT';
}

export function canFinalizeForm(userRole?: string | null, status?: string | null): boolean {
  if (!userRole) return false;
  const normalizedRole = String(userRole).trim().toUpperCase();
  if (!FINALIZE_ALLOWED_ROLES.has(normalizedRole)) return false;

  const normalizedStatus = String(status ?? '').trim().toUpperCase();
  if (!normalizedStatus) return true;
  return normalizedStatus !== 'LOCKED';
}
