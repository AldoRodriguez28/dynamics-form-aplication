import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ClientData, Business } from '../models/business.model';
import { BusinessService } from '../services/business.service';

@Component({
  selector: 'app-business-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './business-list.component.html',
  styleUrl: './business-list.component.scss'
})
export class BusinessListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly businessService = inject(BusinessService);
  private readonly router = inject(Router);

  clientId = this.route.snapshot.paramMap.get('idClient') ?? '';
  clientData$: Observable<ClientData> = this.businessService.getClientBusinesses(this.clientId);

  goToForm(clientId: string, business: Business, advertiserName: string): void {
    this.router.navigate(['/', clientId, business.businessId], {
      state: { commercialName: business.commercialName, advertiserName: advertiserName }
    });
  }

  statusLabel(status: Business['formStatus']): string {
    const labels: Record<string, string> = {
      IN_PROGRESS: 'En progreso',
      PENDING: 'Pendiente',
      COMPLETED: 'Completado'
    };

    return labels[status] ?? status;
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
