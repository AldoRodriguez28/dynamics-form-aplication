import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { BusinessService } from '../services/business.service';
import { BusinessForm, FormStatus } from '../models/form-schema.model';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';

@Component({
  selector: 'app-business-form',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  templateUrl: './business-form.component.html',
  styleUrl: './business-form.component.scss'
})
export class BusinessFormComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly businessService = inject(BusinessService);

  clientId = this.route.snapshot.paramMap.get('idClient') ?? '';
  businessId = this.route.snapshot.paramMap.get('businessId') ?? '';
  formSchema$: Observable<BusinessForm> = this.businessService.getBusinessForm(this.businessId);
  commercialName =
    this.router.getCurrentNavigation()?.extras.state?.['commercialName'] ??
    history.state?.commercialName ??
    '';
  advertiserName =
    this.router.getCurrentNavigation()?.extras.state?.['advertiserName'] ??
    history.state?.advertiserName ??
    '';

  statusContainerClass(status?: FormStatus): string {
    const normalized = (status || 'draft').toString().toLowerCase();
    if (normalized === 'ready') return 'badge badge--ready';
    if (normalized === 'locked') return 'badge badge--locked';
    if (normalized.startsWith('in-') || normalized.startsWith('in_')) return 'badge badge--progress';
    if (normalized.startsWith('content')) return 'badge badge--content';
    return 'badge badge--draft';
  }

  statusLabel(status?: FormStatus): string {
    const normalized = (status || 'draft').toString().toLowerCase();
    switch (normalized) {
      case 'draft':
        return 'Draft';
      case 'in-progress':
      case 'in_progres':
      case 'in-progres':
        return 'In-progress';
      case 'content_in_creattion':
      case 'content_in_creation':
        return 'Content in creation';
      case 'ready':
        return 'Ready';
      case 'locked':
        return 'Locked';
      default:
        return status?.toString() || 'Draft';
    }
  }

  statusClass(status?: FormStatus): string {
    const normalized = (status || 'draft').toString().toLowerCase();
    if (normalized.startsWith('draft')) return 'status status--draft';
    if (normalized.startsWith('in-') || normalized.startsWith('in_')) return 'status status--progress';
    if (normalized.startsWith('content')) return 'status status--content';
    if (normalized === 'ready') return 'status status--ready';
    if (normalized === 'locked') return 'status status--locked';
    return 'status status--draft';
  }

  handleSubmit(payload: Record<string, unknown>): void {
    // Placeholder: aquí podríamos postear al backend
    console.info('Payload a enviar:', payload);
  }
}
