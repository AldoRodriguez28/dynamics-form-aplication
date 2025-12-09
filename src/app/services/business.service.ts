import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, mergeMap, of, throwError, map } from 'rxjs';
import { ClientData } from '../models/business.model';
import { BusinessForm } from '../models/form-schema.model';

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  constructor(private http: HttpClient) { }

  /**
   * Obtiene los negocios de un cliente a partir del mock local.
   * Simula "cliente no encontrado" cuando el id solicitado no coincide con el mock disponible.
   */
  getClientBusinesses(idClient: string): Observable<ClientData> {
    return this.http.get<ClientData>('assets/data/mock-client.json').pipe(
      mergeMap((data) => {
        if (idClient && idClient !== data.advertiserId) {
          return throwError(() => ({ code: 'CLIENT_NOT_FOUND', message: 'Cliente no encontrado', status: 404 }));
        }

        return of({
          ...data,
          advertiserId: idClient || data.advertiserId
        });
      })
    );
  }

  /**
   * Obtiene el esquema de formulario para un negocio específico (mock local).
   */
  getBusinessForm(_businessId: string): Observable<BusinessForm> {
    return this.http
      .get<BusinessForm>('assets/data/mock-business-form-update.json')
      .pipe(
        map((data: BusinessForm) => ({
          actorType: data.actorType || 'AGENT',
          actorId: data.actorId || _businessId || 'demo',
          ...data
        }))
      );
  }
}
