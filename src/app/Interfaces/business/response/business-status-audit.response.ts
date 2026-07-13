/** Fila devuelta por GET .../logs/audit/business/{id}/history-state */
export interface BusinessStatusAuditEntry {
  auditId: number;
  businessVersionId: number;
  action: string;
  actorType: string;
  actorId: string;
  createdAt: string;
  oldState: string;
  newState: string;
}
