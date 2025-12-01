import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ClientData } from '../models/business.model';
import { BusinessForm } from '../models/form-schema.model';

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  constructor(private http: HttpClient) { }

  /**
   * Obtiene los negocios de un cliente a partir del mock local.
   * Si el id solicitado no coincide, de momento se entrega igualmente el mock
   * (para conectar luego con el backend real).
   */
  getClientBusinesses(idClient: string): Observable<ClientData> {
    return this.http.get<ClientData>('assets/data/mock-client.json').pipe(
      map((data) => ({
        ...data,
        advertiserId: idClient || data.advertiserId
      }))
    );
  }

  /**
   * Obtiene el esquema de formulario para un negocio específico (mock local).
   */
  getBusinessForm(_businessId: string): Observable<BusinessForm> {
    return this.http
      .get<BusinessForm>('assets/data/mock-business-form-update.json')
      .pipe(
        map((data) => ({
          actorType: data.actorType || 'AGENT',
          actorId: data.actorId || _businessId || 'demo',
          ...data
        }))
      );
  }
}
