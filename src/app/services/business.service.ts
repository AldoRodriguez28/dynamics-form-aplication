import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, mergeMap, of } from 'rxjs';
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


  getLegacy(businessId: string | number): Observable<LegacyBusinessResponse> {
    const url = `${this.baseUrl}/business/legacy/${businessId}`;
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
    const url = `${this.baseUrl}/business/${businessId}/blocks`;
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
    const url = `${this.baseUrl}/business/initialize`;
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
    const url = `${this.baseUrl}/business/initialize-token`;
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
  getBusinessForm(businessId: string | number): Observable<BusinessForm> {
    const url = `${this.baseUrl}/business/${businessId}/blocks`;
    return this.http.get<BusinessForm>(url, {
      headers: this.authHeader.build()
    });
  }
}
