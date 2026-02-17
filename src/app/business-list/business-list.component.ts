import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, map, Observable, of, switchMap, tap } from 'rxjs';
import { Business } from '../models/business.model';
import { BusinessService } from '../services/business.service';
import { ContactBlockResponse } from '../Interfaces/business/response/business.interface';
import { AuthService } from '../services/Auth.service';
import { OtpRedirectTarget, TokenStorageService } from '../services/shared/token-storage.service';
import { BusinessMapping } from '../mapping/business/business.map';
import { LegacyBusinessInterface } from '../Interfaces/business/response/legacy-business.interface';
import { ClientNotFoundComponent } from '../components/client-not-found/client-not-found.component';
import { BusinessEmptyStateComponent } from '../components/business-empty-state/business-empty-state.component';

@Component({
  selector: 'app-business-list',
  standalone: true,
  imports: [CommonModule, ClientNotFoundComponent, BusinessEmptyStateComponent],
  templateUrl: './business-list.component.html',
  styleUrl: './business-list.component.scss'
})
export class BusinessListComponent {
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
        versionNumber
      }
    });
  }

  goHome(): void {
    this.router.navigateByUrl('/');
  }

  retry(): void {
    this.loadClientData();
  }

  statusLabel(status: string | null | undefined): string {
    return status ?? 'Sin estado';
  }

  loadClientData(): void {

    this.clientData$ = this.route.paramMap.pipe(
      map(() => {

        this.clientId = this.tokenStore.getAdvertiserId();
        this.clientName = this.tokenStore.getAdvertiserName();
        return this.clientId;
      }),
      switchMap(clientId => {
        if (!clientId) return of(null);

        return this.businessService
          .getLegacy(clientId)
          .pipe(
            tap(response => console.log('dataClient', response)),
            map(BusinessMapping.MapLegacyResponseToLegacyInterface)
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
}
