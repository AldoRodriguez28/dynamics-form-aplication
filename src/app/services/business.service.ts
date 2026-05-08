import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, mergeMap, map, of } from 'rxjs';
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
import { ContactBlockResponse } from '../Interfaces/business/response/business.interface';
import { BusinessVersionStateResponse } from '../Interfaces/business/response/business-version-state.response';
import { BusinessVersionDetailResponse } from '../Interfaces/business/response/business-version-detail.response';
import { UploadFilesPayload } from '../Interfaces/business/request/upload-files.request';
import { BusinessStatusAuditEntry } from '../Interfaces/business/response/business-status-audit.response';

export type DomainCheckResponse =
  | string
  | string[]
  | { message?: string }
  | { available: boolean; domains?: string[]; message?: string };

export type ShareUrlResponse =
  | string
  | { url?: string; shareUrl?: string; link?: string; state?: string; status?: string };

export type UnlockShareResponse =
  | boolean
  | string
  | { state?: string; status?: string };

@Injectable({
  providedIn: 'root'
})
export class BusinessService {
  private readonly baseUrl = `${environment.API_URI}/v1` ;
  constructor(
    private http: HttpClient,
    private authHeader: AuthHeaderService
  ) { }


  /**
   * GET /api/v1/logs/audit/business/{businessId}/history-state
   * Historial de transiciones de estado del negocio.
   */
  getBusinessStateAuditHistory(
    businessId: string | number
  ): Observable<BusinessStatusAuditEntry[]> {
    const url = `${this.baseUrl}/logs/audit/business/${businessId}/history-state`;
    return this.http.get<unknown>(url, { headers: this.authHeader.build() }).pipe(
      map((body) => this.normalizeStateAuditHistoryBody(body))
    );
  }

  private normalizeStateAuditHistoryBody(body: unknown): BusinessStatusAuditEntry[] {
    if (Array.isArray(body)) {
      return body as BusinessStatusAuditEntry[];
    }
    if (body && typeof body === 'object') {
      const o = body as Record<string, unknown>;
      for (const key of ['data', 'items', 'history', 'result'] as const) {
        const v = o[key];
        if (Array.isArray(v)) {
          return v as BusinessStatusAuditEntry[];
        }
      }
    }
    return [];
  }

  getLegacy(businessId: string | number): Observable<LegacyBusinessResponse> {
    const url = `${this.baseUrl}/legacy-advertisers/${businessId}/businesses`;
    return this.http.get<LegacyBusinessResponse>(url, {
      headers: this.authHeader.build()
    });
  }

  // getLegacy(businessId: string | number): Observable<LegacyBusinessResponse> {
  //   const url = `assets/data/mock-legacy.json`;
  //   return this.http.get<LegacyBusinessResponse>(url, { headers: this.authHeader.build() });
  // }


  /** GET /businesses/{id}/versions/{version}/blocks con Authorization: Bearer <token> */
  getbusinessesById(
    businessId: string | number,
    versionNumber: string | number = 1
  ): Observable<BlocksResponse> {
    const url = `${this.baseUrl}/businesses/${businessId}/versionNumber/${versionNumber}/blocks?expand=definition`;
    return this.http.get<BusinessDetailWithBlocksResponse>(url, { headers: this.authHeader.build() });
  }

  getBusinessVersionState(
    businessId: string | number,
    versionNumber: string | number = 1
  ): Observable<BusinessVersionStateResponse> {
    const url = `${this.baseUrl}/businesses/${businessId}/VersionNumber/${versionNumber}`;
    return this.http.get<BusinessVersionStateResponse>(url, { headers: this.authHeader.build() });
  }

  getBusinessVersionDetail(
    businessId: string | number,
    versionNumber: string | number = 1
  ): Observable<BusinessVersionDetailResponse> {
    const url = `${this.baseUrl}/businesses/${businessId}/VersionNumber/${versionNumber}`;
    return this.http.get<BusinessVersionDetailResponse>(url, { headers: this.authHeader.build() });
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
    const payload: SaveBlocksRequest = { ...request, finalizeTask: false };
    console.log("request: ", payload)
    return this.http.put<boolean>(url, payload, {
      headers: this.authHeader.build()
    });
  }

  saveBlocksAndFinish(businessId: string | number, request: SaveBlocksRequest): Observable<boolean> {
    const url = `${this.baseUrl}/businesses/${businessId}/blocks`;
    const payload: SaveBlocksRequest = { ...request, finalizeTask: true };
    console.log("request: ", payload)
    return this.http.put<boolean>(url, payload, {
      headers: this.authHeader.build()
    });
  }

  saveSingleBlock(
    businessId: string | number,
    versionNumber: string | number,
    blockCode: string,
    request: SaveBlocksRequest
  ): Observable<boolean> {
    const url = `${this.baseUrl}/businesses/${businessId}/VersionNumber/${versionNumber}/blocks/${blockCode}?skipRequiredValidation=true`;
    return this.http.put<boolean>(url, request, {
      headers: this.authHeader.build()
    });
  }

  getContactBlock(
    businessId: string | number,
    versionNumber: string | number,
    fields: string[] = ['nombreTitular', 'telWA']
  ): Observable<ContactBlockResponse> {
    const url = `${this.baseUrl}/businesses/${businessId}/VersionNumber/${versionNumber}/blocks/datos_contacto/query`;
    console.info('[ContactBlock] request', { url, businessId, versionNumber, fields });
    return this.http.post<ContactBlockResponse>(
      url,
      { fields },
      { headers: this.authHeader.build() }
    );
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
    const { businessId, files, versionNumber, fieldName, usage, blockCode } = payload;
    const url = `${environment.API_URI}/Files/upload`;
    const formData = new FormData();
    const filesArray = Array.isArray(files) ? files : [files];

    filesArray.forEach((file) => formData.append('Files', file));
    formData.append('BusinessId', businessId.toString());
    formData.append('VersionNumber', versionNumber.toString());
    formData.append('FieldName', fieldName);
    if (usage !== undefined && usage !== null) {
      formData.append('Usage', usage);
    }
    if (blockCode) {
      formData.append('BlockCode', blockCode);
    }
    formData.append('FileIds', '');
    console.log("formData",formData);

    return this.http.post(url, formData, {
      headers: this.authHeader.build({ contentType: 'form-data' })
    });
  }

  createShareUrl(
    token: string,
    businesses: Array<{ businessId: string | number; versionNumber?: string | number }>,
    host: string
  ): Observable<ShareUrlResponse> {
    const url = `${environment.API_URI}/Auth/share/client?host=${encodeURIComponent(host)}`;
    const payload = {
      token,
      business: businesses.map((item) => ({
        businessId: item.businessId,
        versionNumber: item.versionNumber ?? 1
      }))
    };
    return this.http.post<ShareUrlResponse>(url, payload, {
      headers: this.authHeader.build(),
      responseType: 'text' as 'json'
    });
  }

  unlockShareUrl(
    token: string,
    businesses: Array<{ businessId: string | number; versionNumber?: string | number }>
  ): Observable<UnlockShareResponse> {
    const url = `${this.baseUrl}/businesses/revocation`;
    const payload = {
      token,
      business: businesses.map((item) => ({
        businessId: item.businessId,
        versionNumber: item.versionNumber ?? 1
      }))
    };
    return this.http.post<UnlockShareResponse>(url, payload, {
      headers: this.authHeader.build()
    });
  }
}
