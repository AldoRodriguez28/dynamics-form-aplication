import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, map, Observable, of, switchMap, tap } from 'rxjs';
import { Business } from '../models/business.model';
import { BusinessService } from '../services/business.service';
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
  errorCode: '' | 'CLIENT_NOT_FOUND' | 'GENERIC' = '';

  clientData$: Observable<LegacyBusinessInterface | null> = EMPTY;

  constructor() {
    this.loadClientData();
  }

  goToForm(clientId: string, business: Business, advertiserName: string): void {
    const role = (this.tokenStore.getRole() ?? '').toUpperCase();
    const requiresOtp = role === 'CLIENT' && !this.tokenStore.isOtpVerified();
    if (requiresOtp) {
      this.requestOtpAndRedirect(clientId, business, advertiserName);
      return;
    }

    this.router.navigate(['/', clientId, business.businessId], {
      state: { commercialName: business.commercialName, advertiserName: advertiserName }
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
    if (!targetClientId || !business?.businessId) {
      console.warn('No se pudo iniciar OTP: falta clientId o businessId.');
      return;
    }

    this.authService.getOtpUrl().subscribe({
      next: (otpUrl) => {
        if (!otpUrl) {
          console.error('La respuesta de OTP no incluye url de redireccion.');
          return;
        }

        const target: OtpRedirectTarget = {
          clientId: targetClientId,
          businessId: business.businessId,
          advertiserName: advertiserName || this.clientName || '',
          commercialName: business.commercialName ?? ''
        };

        this.tokenStore.setOtpTarget(target);
        window.location.assign(otpUrl);
      },
      error: (error) => {
        console.error('Error al solicitar URL de OTP', error);
      }
    });
  }
}
