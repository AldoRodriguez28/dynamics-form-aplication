import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { ClientData, Business } from '../models/business.model';
import { BusinessService } from '../services/business.service';
import { ClientNotFoundComponent } from '../components/client-not-found/client-not-found.component';

@Component({
  selector: 'app-business-list',
  standalone: true,
  imports: [CommonModule, ClientNotFoundComponent],
  templateUrl: './business-list.component.html',
  styleUrl: './business-list.component.scss'
})
export class BusinessListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly businessService = inject(BusinessService);
  private readonly router = inject(Router);

  clientId = this.route.snapshot.paramMap.get('idClient') ?? '';
  clientData$!: Observable<ClientData | null>;
  errorCode: '' | 'CLIENT_NOT_FOUND' | 'GENERIC' = '';

  constructor() {
    this.loadClientData();
  }

  goToForm(clientId: string, business: Business, advertiserName: string): void {
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

  statusLabel(status: Business['formStatus']): string {
    const labels: Record<string, string> = {
      IN_PROGRESS: 'En progreso',
      PENDING: 'Pendiente',
      COMPLETED: 'Completado'
    };

    return labels[status] ?? status;
  }

  loadClientData(): void {
    this.clientData$ = this.businessService.getClientBusinesses(this.clientId).pipe(
      tap(() => (this.errorCode = '')),
      catchError((error) => {
        const code = error?.code === 'CLIENT_NOT_FOUND' || error?.status === 404 ? 'CLIENT_NOT_FOUND' : 'GENERIC';
        this.errorCode = code;
        return of(null);
      })
    );
  }

  formatDate(dateIso: string | null): string {
    if (!dateIso) {
      return 'Sin actualización';
    }

    const date = new Date(dateIso);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}
