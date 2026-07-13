import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthHeaderService } from './shared/auth-header.service';
import { AuditEventEntry, AuditEventDetail } from '../Interfaces/business/response/audit-event.response';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly baseUrl = `${environment.API_URI}/v1`;

  constructor(
    private http: HttpClient,
    private authHeader: AuthHeaderService
  ) {}

  /** GET /v1/logs/audit/business/{businessId} — lista de eventos sin detalle */
  getAuditEvents(businessId: string | number): Observable<AuditEventEntry[]> {
    const url = `${this.baseUrl}/logs/audit/business/${businessId}`;
    return this.http.get<AuditEventEntry[]>(url, {
      headers: this.authHeader.build()
    });
  }

  /** GET /v1/logs/audit/{auditId} — detalle de un evento */
  getAuditDetail(auditId: number): Observable<AuditEventDetail> {
    const url = `${this.baseUrl}/logs/audit/${auditId}`;
    return this.http.get<AuditEventDetail>(url, {
      headers: this.authHeader.build()
    });
  }
}
