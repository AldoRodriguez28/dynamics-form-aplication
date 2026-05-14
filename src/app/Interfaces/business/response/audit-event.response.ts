/** Fila devuelta por GET /v1/logs/audit/business/{businessId} */
export interface AuditEventEntry {
  auditId: number;
  businessId: number;
  version: number;
  estado: string;
  businessStatus: string;
  action: string;
  creationDate: string;
}

/** Detalle devuelto por GET /v1/logs/audit/{auditId} */
export interface AuditEventDetail {
  auditId: number;
  businessId: number;
  actorType: string;
  actorId: string;
  detailsJson: string;
}
