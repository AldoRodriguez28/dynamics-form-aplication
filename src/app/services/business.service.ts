import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, mergeMap, of, throwError, map } from 'rxjs';
import { ClientData } from '../models/business.model';
import { BusinessForm } from '../models/form-schema.model';
import { environment } from '../../environments/environment';
import { AuthHeaderService } from './shared/auth-header.service';
import { BlocksResponse } from './response/business/blocks-response';
import { LegacyBusinessResponse } from './response/business/legacy-business.response';
import { SaveBlocksRequest } from './request/save-blocks.request';
import { CreateBusinesessResponse } from './response/business/create-businesses.response';
import { ResolveTokenRequest } from './request/resolve-token.request';

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private readonly baseUrl = environment.API_URI;
  constructor(
    private http: HttpClient,
    private authHeader: AuthHeaderService
  ) { }

  /**
   * GET /api/business/legacy/{businessId}
   * Devuelve la respuesta sin modificar (usa el token de AuthHeaderService).
  */
  getLegacy(businessId: string | number): Observable<LegacyBusinessResponse> {
    const url = `${this.baseUrl}/api/business/legacy/${businessId}`;
    return this.http.get<LegacyBusinessResponse>(url, {
      headers: this.authHeader.build()
    });
  }

  /** GET /business/{id}/blocks con Authorization: Bearer <token> */
  getBlocks(businessId: string | number): Observable<BlocksResponse> {
    const url = `${this.baseUrl}/business/${businessId}/blocks`;
    return this.http.get<BlocksResponse>(url, { headers: this.authHeader.build() });
  }

   /**
   * PUT /api/business/{businessId}/blocks
   * En el backend espera: SaveBlocksRequest { actorType, actorId, blocks }
   * Retorna: boolean
   */
  saveBlocks(businessId: string | number, request: SaveBlocksRequest): Observable<boolean> {
    const url = `${this.baseUrl}/api/business/${businessId}/blocks`;
    return this.http.put<boolean>(url, request, {
      headers: this.authHeader.build()
    });
  }

  /**
   * POST /api/business/initialize
   * Retorna: CreateBusinesessResponse
   * ResolveTokenRequest para request espera: { token: 'ssssss'}.
   */
  initialize(request: ResolveTokenRequest): Observable<CreateBusinesessResponse> {
    const url = `${this.baseUrl}/api/business/initialize`;
    return this.http.post<CreateBusinesessResponse>(url, request, {
      headers: this.authHeader.build()
    });
  }

   /**
   * POST /api/business/initialize-token
   * Body: ResolveTokenRequest { token: string }
   * Retorna: CreateBusinesessResponse
   */
  initializeToken(request: ResolveTokenRequest): Observable<CreateBusinesessResponse> {
    const url = `${this.baseUrl}/api/business/initialize-token`;
    return this.http.post<CreateBusinesessResponse>(url, request, {
      headers: this.authHeader.build()
    });
  }

  /**
   * Obtiene los negocios de un cliente a partir del mock local.
   * Simula "cliente no encontrado" cuando el id solicitado no coincide con el mock disponible.
   */
  getClientBusinesses(idClient: string): Observable<ClientData> {
    return this.http.get<ClientData>('assets/data/mock-client.json').pipe(
      mergeMap((data) => {
        // if (idClient && idClient !== data.advertiserId) {
        //   return throwError(() => ({ code: 'CLIENT_NOT_FOUND', message: 'Cliente no encontrado', status: 404 }));
        // }
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
