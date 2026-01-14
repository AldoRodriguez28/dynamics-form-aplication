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
import { BusinessDetailWithBlocksResponse } from './response/business/Business-detail-withBlocks.response';

export type DomainCheckResponse = string | string[] | { message?: string };
export interface UploadFilesPayload {
  files: File | File[];
  businessId: string | number;
  versionNumber: number;
  fieldName: string;
  usage?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private readonly baseUrl = `${environment.API_URI}/v1` ;
  constructor(
    private http: HttpClient,
    private authHeader: AuthHeaderService
  ) { }


  getLegacy(businessId: string | number): Observable<LegacyBusinessResponse> {
    const url = `${this.baseUrl}/legacy-advertisers/${businessId}/businesses`;
    return this.http.get<LegacyBusinessResponse>(url, {
      headers: this.authHeader.build()
    });
  }

  /** GET /businesses/{id} con Authorization: Bearer <token> */
  getbusinessesById(businessId: string | number): Observable<BlocksResponse> {
    const url = `${this.baseUrl}/businesses/${businessId}`;
    return this.http.get<BusinessDetailWithBlocksResponse>(url, { headers: this.authHeader.build() });
  }
  //   getbusinessesById(businessId: string | number): Observable<BlocksResponse> {
  //   const url = `assets/data/mock-blocks.json`;
  //   return this.http.get<BusinessDetailWithBlocksResponse>(url, { headers: this.authHeader.build() });
  // }

   /**
   * PUT /api/business/{businessId}/blocks
   * En el backend espera: SaveBlocksRequest { actorType, actorId, blocks }
   * Retorna: boolean
   */
  saveBlocks(businessId: string | number, request: SaveBlocksRequest): Observable<boolean> {
    const url = `${this.baseUrl}/businesses/${businessId}/blocks`;
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
    const url = `${this.baseUrl}/businesses/initialize`;
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
    const url = `${this.baseUrl}/businesses/initialize-token`;
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
   * POST /api/domain
   * Body: { domain: string }
   * Respuesta: "Dominio disponible." o array de sugerencias.
   */
  checkDomainAvailability(domain: string): Observable<DomainCheckResponse> {
    const url = `${this.baseUrl}/domain`;
    return this.http.post<DomainCheckResponse>(
      url,
      { domain },
      { headers: this.authHeader.build() }
    );
  }

  uploadFiles(payload: UploadFilesPayload): Observable<unknown> {
    const { businessId, files, versionNumber, fieldName, usage } = payload;
    const url = `${this.baseUrl}/business/${businessId}/files`;
    const formData = new FormData();
    const filesArray = Array.isArray(files) ? files : [files];

    filesArray.forEach((file) => formData.append('files', file));
    formData.append('versionNumber', versionNumber.toString());
    formData.append('fieldName', fieldName);
    if (usage !== undefined && usage !== null) {
      formData.append('usage', usage);
    }

    return this.http.post(url, formData, {
      headers: this.authHeader.build({ contentType: 'form-data' })
    });
  }
}
