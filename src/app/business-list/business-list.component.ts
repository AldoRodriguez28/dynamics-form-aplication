import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, map, Observable, of, switchMap, tap, catchError, finalize } from 'rxjs';
import { Business } from '../models/business.model';
import { BusinessService } from '../services/business.service';
import { BusinessInterface, ContactBlockResponse } from '../Interfaces/business/response/business.interface';
import { AuthService } from '../services/Auth.service';
import { OtpRedirectTarget, TokenStorageService } from '../services/shared/token-storage.service';
import { BusinessMapping } from '../mapping/business/business.map';
import { LegacyBusinessInterface } from '../Interfaces/business/response/legacy-business.interface';
import { ClientNotFoundComponent } from '../components/client-not-found/client-not-found.component';
import { BusinessEmptyStateComponent } from '../components/business-empty-state/business-empty-state.component';
import {
  FormRecord,
  StatusHistoryComponent,
  transitionsFromAudit,
} from '../components/status-history/status-history.component';
import { decodeJwtPayload } from '../utils/jwt.utils';

@Component({
  selector: 'app-business-list',
  standalone: true,
  imports: [
    CommonModule,
    ClientNotFoundComponent,
    BusinessEmptyStateComponent,
    StatusHistoryComponent,
  ],
  templateUrl: './business-list.component.html',
  styleUrl: './business-list.component.scss'
})
export class BusinessListComponent {
  private readonly historyDrawer = viewChild(StatusHistoryComponent);

  private readonly route = inject(ActivatedRoute);
  private readonly businessService = inject(BusinessService);
  private readonly router = inject(Router);
  private readonly tokenStore = inject(TokenStorageService);
  private readonly authService = inject(AuthService);

  clientId: string | null = null;
  clientName:string | null = null;
  userName: string | null = this.tokenStore.getAdvertiserName();
  userRole: string | null = this.tokenStore.getRole();
  errorCode: '' | 'CLIENT_NOT_FOUND' | 'GENERIC' = '';
  isSharingList = false;
  isUnlockingList = false;
  shareUrl: string | null = null;
  shareModalOpen = false;
  shareCopied = false;

  clientData$: Observable<LegacyBusinessInterface | null> = EMPTY;

  constructor() {
    this.loadClientData();
  }

  goToForm(clientId: string, business: Business, advertiserName: string): void {
    const versionNumber =
      (business as any)?.versionNumber ?? (business as any)?.businessVersion ?? 1;
    console.info('[UI] click ver formulario', {
      clientId,
      businessId: business?.businessId,
      versionNumber
    });
    const role = (this.tokenStore.getRole() ?? '').toUpperCase();
    if (role === 'CLIENT') {
      this.requestOtpAndRedirect(clientId, business, advertiserName);
      return;
    }

    this.router.navigate(['/', clientId, business.businessId], {
      state: {
        commercialName: business.commercialName,
        advertiserName: advertiserName,
        versionNumber,
        externalData: business.externalData ?? null,
        categoryName: business.categoryName ?? null,
        categoryCode: business.categoryCode ?? null,
        townName: business.townName ?? null,
        townCode: business.townCode ?? null
      }
    });
  }

  goHome(): void {
    this.router.navigateByUrl('/');
  }

  /**
   * Abre el panel de historial y carga las transiciones desde el API de auditoría.
   */
  openBusinessStatusHistory(business: BusinessInterface): void {
    const drawer = this.historyDrawer();
    if (!drawer) {
      return;
    }
    const businessId = business.businessId;
    if (businessId == null) {
      drawer.beginHistoryLoad(this.businessToFormRecordSkeleton(business));
      drawer.setHistoryError('No hay identificador de negocio para consultar el historial.');
      return;
    }

    drawer.beginHistoryLoad(this.businessToFormRecordSkeleton(business));
    this.businessService
      .getBusinessStateAuditHistory(businessId)
      .pipe(
        catchError((err: unknown) => {
          drawer.setHistoryError(this.formatHistoryAuditError(err));
          return EMPTY;
        })
      )
      .subscribe((entries) => {
        drawer.setHistorial(transitionsFromAudit(entries));
      });
  }

  private businessToFormRecordSkeleton(business: BusinessInterface): FormRecord {
    const id = String(business.businessId ?? '');
    const nombre = business.commercialName?.trim() || 'Sin nombre';
    const estadoActual = this.statusLabel(this.getBusinessStatus(business));
    return { id, nombre, estadoActual, historial: [] };
  }

  private formatHistoryAuditError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      if (err.status === 0) {
        return 'No se pudo conectar al servidor. Revisa tu red o intenta más tarde.';
      }
      const body = err.error;
      if (typeof body === 'string' && body.trim()) {
        return body;
      }
      if (
        body &&
        typeof body === 'object' &&
        'message' in body &&
        typeof (body as { message?: unknown }).message === 'string'
      ) {
        return (body as { message: string }).message;
      }
      return `El servidor respondió con error (${err.status}).`;
    }
    return 'Ocurrió un error al cargar el historial.';
  }

  retry(): void {
    this.loadClientData();
  }

  statusLabel(status: string | null | undefined): string {
    return status ?? 'Sin estado';
  }

  statusVariant(status: string | null | undefined): string {
    return this.normalizeStatus(status) || 'DRAFT';
  }

  canShare(business: BusinessInterface | null | undefined): boolean {
    if (!business) return false;
    const role = this.normalizeRole(this.userRole);
    if (!['CAC', 'IC_EDITOR', 'IC_OPERATOR'].includes(role)) return false;
    const status = this.normalizeStatus(this.getBusinessStatus(business));
    return ['IN_PROGRESS', 'CONTENT_IN_CREATION', 'DRAFT'].includes(status);
  }

  canShareList(clientData: LegacyBusinessInterface | null): boolean {
    const role = this.normalizeRole(this.userRole);
    if (!['CAC', 'IC_EDITOR', 'IC_OPERATOR'].includes(role)) return false;
    const list = clientData?.businesses ?? [];
    if (!Array.isArray(list) || list.length === 0) return false;
    return list.some((business) => this.canShare(business));
  }

  canUnlock(business: BusinessInterface | null | undefined): boolean {
    if (!business) return false;
    const role = this.normalizeRole(this.userRole);
    if (!['CAC', 'IC_EDITOR', 'IC_OPERATOR'].includes(role)) return false;
    const status = this.normalizeStatus(this.getBusinessStatus(business));
    return status === 'LOCKED';
  }

  canUnlockList(clientData: LegacyBusinessInterface | null): boolean {
    const role = this.normalizeRole(this.userRole);
    if (!['CAC', 'IC_EDITOR', 'IC_OPERATOR'].includes(role)) return false;
    const list = clientData?.businesses ?? [];
    if (!Array.isArray(list) || list.length === 0) return false;
    return list.some((business) => this.canUnlock(business));
  }

  shareBusinessList(clientData: LegacyBusinessInterface | null): void {
    if (!clientData?.businesses?.length) return;
    if (!this.canShareList(clientData)) return;
    if (this.isSharingList) return;

    const bearer = this.tokenStore.getToken();
    const payload = bearer ? decodeJwtPayload(bearer) : null;
    const bcmToken = payload?.['bcm.token'] ?? payload?.bcm?.token;
    if (!bcmToken) {
      console.error('No se pudo obtener el token BCM para compartir.');
      return;
    }

    const businesses = clientData.businesses.map((business) => ({
      businessId: business.businessId ?? '',
      versionNumber: business.versionNumber ?? business.businessVersion ?? 1
    }));
    const host = window.location.origin;

    this.shareUrl = null;
    this.shareModalOpen = true;
    this.isSharingList = true;
    this.businessService
      .createShareUrl(String(bcmToken), businesses, host)
      .pipe(finalize(() => (this.isSharingList = false)))
      .subscribe({
        next: (response) => {
          const shareUrl = this.extractShareUrl(response);
          if (!shareUrl) {
            console.error('No se pudo obtener la URL.');
            return;
          }
          this.shareUrl = shareUrl;
          clientData.businesses?.forEach((business) => {
            this.setBusinessState(business, this.extractState(response) ?? 'LOCKED');
          });
        },
        error: (error) => {
          console.error('Error al crear URL de compartición', error);
        }
      });
  }

  unlockBusinessList(clientData: LegacyBusinessInterface | null): void {
    if (!clientData?.businesses?.length) return;
    if (!this.canUnlockList(clientData)) return;
    if (this.isUnlockingList) return;

    const bearer = this.tokenStore.getToken();
    const payload = bearer ? decodeJwtPayload(bearer) : null;
    const bcmToken = payload?.['bcm.token'] ?? payload?.bcm?.token;
    if (!bcmToken) {
      console.error('No se pudo obtener el token BCM para desbloquear.');
      return;
    }

    const businesses = clientData.businesses
      .filter((business) => this.canUnlock(business))
      .map((business) => ({
        businessId: business.businessId ?? '',
        versionNumber: business.versionNumber ?? business.businessVersion ?? 1
      }));

    if (!businesses.length) return;

    this.isUnlockingList = true;
    this.businessService
      .unlockShareUrl(String(bcmToken), businesses)
      .pipe(finalize(() => (this.isUnlockingList = false)))
      .subscribe({
        next: (response) => {
          const state = this.extractState(response);
          if (state) {
            clientData.businesses?.forEach((business) => {
              if (this.canUnlock(business)) this.setBusinessState(business, state);
            });
          } else {
            this.loadClientData();
          }
        },
        error: (error) => {
          console.error('Error al desbloquear negocios', error);
        }
      });
  }

  closeShareModal(): void {
    this.shareModalOpen = false;
    this.shareCopied = false;
  }

  async copyShareUrl(): Promise<void> {
    if (!this.shareUrl) return;
    const copied = await this.copyToClipboard(this.shareUrl);
    if (!copied) return;
    this.shareCopied = true;
    setTimeout(() => {
      this.shareCopied = false;
    }, 2000);
  }


  loadClientData(): void {

    this.clientData$ = this.route.paramMap.pipe(
      map(() => {

        this.clientId = this.tokenStore.getAdvertiserId();
        this.clientName = this.tokenStore.getAdvertiserName();
        this.errorCode = '';
        this.shareUrl = null;
        this.shareModalOpen = false;
        this.shareCopied = false;
        return this.clientId;
      }),
      switchMap(clientId => {
        if (!clientId) return of(null);

        return this.businessService
          .getLegacy(clientId)
          .pipe(
            tap(response => console.log('dataClient', response)),
            map(BusinessMapping.MapLegacyResponseToLegacyInterface),
            catchError((err: any) => {
              this.errorCode = err?.status === 404 ? 'CLIENT_NOT_FOUND' : 'GENERIC';
              return of<LegacyBusinessInterface | null>(null);
            })
          );
      })
    );    
  }

  formatDate(dateIso: string | Date | null): string {
    if (!dateIso) return 'Sin actualización';
    const date = new Date(dateIso);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  private requestOtpAndRedirect(clientId: string, business: Business, advertiserName: string): void {
    const targetClientId = clientId || this.clientId || '';
    console.info('[OTP] requestOtpAndRedirect start', { targetClientId, businessId: business?.businessId });
    if (!targetClientId || !business?.businessId) {
      console.warn('No se pudo iniciar OTP: falta clientId o businessId.');
      return;
    }

    const versionNumber =
      (business as any)?.versionNumber ?? (business as any)?.businessVersion ?? 1;

    this.businessService
      .getContactBlock(business.businessId, versionNumber, ['nombreTitular', 'telWA'])
      .pipe(
        tap((response) => console.info('[ContactBlock] response raw', response)),
        map((response) => this.extractContactPhone(response)),
        switchMap((phone) => {
          console.info('[ContactBlock] extracted phone', { phone });
          if (!phone) {
            console.error('No se pudo obtener el teléfono de contacto para OTP.');
            return EMPTY;
          }

          const role = (this.tokenStore.getRole() ?? '').toUpperCase();
          if (role !== 'CLIENT') {
            this.router.navigate(['/', targetClientId, business.businessId], {
              state: {
                commercialName: business.commercialName ?? '',
                advertiserName: advertiserName || this.clientName || '',
                versionNumber
              }
            });
            return EMPTY;
          }

          if (this.tokenStore.isOtpNumberVerified(phone)) {
            this.router.navigate(['/', targetClientId, business.businessId], {
              state: {
                commercialName: business.commercialName ?? '',
                advertiserName: advertiserName || this.clientName || '',
                versionNumber
              }
            });
            return EMPTY;
          }

          console.info('[OTP] calling AuthService.getOtpUrl', { phone, businessId: business.businessId });
          return this.authService.getOtpUrl(phone, business.businessId).pipe(
            map((otpUrl) => ({ otpUrl, phone }))
          );
        })
      )
      .subscribe({
        next: (result) => {
          if (!result) return;
          const { otpUrl, phone } = result;
          if (!otpUrl) {
            console.error('La respuesta de OTP no incluye url de redireccion.');
            return;
          }

          const target: OtpRedirectTarget = {
            clientId: targetClientId,
            businessId: business.businessId,
            advertiserName: advertiserName || this.clientName || '',
            commercialName: business.commercialName ?? '',
            phone
          };

          this.tokenStore.setOtpTarget(target);
          window.location.assign(otpUrl);
        },
        error: (error) => {
          console.error('Error al solicitar URL de OTP', error);
        }
      });
  }

  private extractContactPhone(response: ContactBlockResponse | null | undefined): string | null {
    const direct = response?.values?.telWA ?? response?.blocks?.[0]?.values?.telWA;
    if (!direct) return null;
    const normalized = this.normalizePhoneValue(direct);
    return normalized.length ? normalized : null;
  }

  private normalizePhoneValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return '';
      const parsed = this.tryParseJson(trimmed);
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        const number = record['number'] ?? record['numero'];
        return number ? String(number).trim() : '';
      }
      return trimmed;
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      const number = record['number'] ?? record['numero'];
      return number ? String(number).trim() : '';
    }
    return String(value).trim();
  }

  private tryParseJson(raw: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }

  private getBusinessId(business: BusinessInterface | null | undefined): string | null {
    if (!business?.businessId) return null;
    return String(business.businessId);
  }

  private getBusinessStatus(business: BusinessInterface | null | undefined): string | null {
    if (!business) return null;
    return (business as any)?.state ?? (business as any)?.formStatus ?? null;
  }

  private normalizeRole(role: string | null | undefined): string {
    return (role ?? '').toString().trim().toUpperCase();
  }

  private normalizeStatus(status: string | null | undefined): string {
    return (status ?? '').toString().trim().toUpperCase().replace(/[\s-]+/g, '_');
  }

  private extractShareUrl(
    response: string | { url?: string; shareUrl?: string; link?: string } | null | undefined
  ): string | null {
    if (!response) return null;
    if (typeof response === 'string') {
      const trimmed = response.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed) as { url?: string; shareUrl?: string; link?: string };
          return parsed.url ?? parsed.shareUrl ?? parsed.link ?? trimmed;
        } catch {
          return trimmed;
        }
      }
      return trimmed;
    }
    return response.url ?? response.shareUrl ?? response.link ?? null;
  }

  private extractState(
    response: string | { state?: string; status?: string } | boolean | null | undefined
  ): string | null {
    if (!response || typeof response === 'string' || typeof response === 'boolean') return null;
    return response.state ?? response.status ?? null;
  }

  private setBusinessState(business: BusinessInterface, state: string): void {
    (business as any).state = state;
  }

  private async copyToClipboard(text: string): Promise<boolean> {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Ignore and fallback
    }
    window.prompt('URL para compartir', text);
    return false;
  }
}
