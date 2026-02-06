import { CommonModule, Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { map, Observable, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { BusinessService } from '../services/business.service';
import { BusinessForm, FormStatus } from '../models/form-schema.model';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { SaveBlocksRequest } from '../services/request/save-blocks.request';
import { BusinessMapping } from '../mapping/business/business.map';
import { TokenStorageService } from '../services/shared/token-storage.service';

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
  private readonly location = inject(Location);
  private readonly businessService = inject(BusinessService);
  private readonly tokenStore = inject(TokenStorageService);

  clientId = this.route.snapshot.paramMap.get('idClient') ?? '';
  businessId = this.route.snapshot.paramMap.get('businessId') ?? '';
  formSchema$: Observable<BusinessForm> = this.businessService
    .getbusinessesById(this.businessId)
    .pipe(
      tap(res => console.log('Business form response:', res)),
      map(res => BusinessMapping.MapBlocksToBusinessForm(res, this.commercialName))
    );

  commercialName =
    this.router.getCurrentNavigation()?.extras.state?.['commercialName'] ??
    history.state?.commercialName ??
    '';
  advertiserName =
    this.router.getCurrentNavigation()?.extras.state?.['advertiserName'] ??
    history.state?.advertiserName ??
    '';
  userRole = this.tokenStore.getRole();

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
      case 'in_progress':
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

  statusVariant(status?: FormStatus): string {
    const raw = (status ?? 'DRAFT').toString().trim();
    if (!raw) return 'DRAFT';
    return raw.toUpperCase().replace(/[\s-]+/g, '_');
  }

  badgeClasses(status?: FormStatus): string {
    const variant = this.statusVariant(status);
    const base =
      'inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-semibold border';
    switch (variant) {
      case 'IN_PROGRESS':
        return `${base} bg-amber-100 text-amber-800 border-amber-200`;
      case 'PENDING':
        return `${base} bg-slate-200 text-slate-600 border-slate-300`;
      case 'COMPLETED':
        return `${base} bg-emerald-100 text-emerald-700 border-emerald-200`;
      case 'READY':
        return `${base} bg-emerald-100 text-emerald-700 border-emerald-200`;
      case 'LOCKED':
        return `${base} bg-red-100 text-red-700 border-red-200`;
      case 'CONTENT_IN_CREATION':
      case 'CONTENT_IN_CREATTION':
        return `${base} bg-orange-100 text-orange-700 border-orange-200`;
      default:
        return `${base} bg-slate-200 text-slate-700 border-slate-300`;
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

  handleSubmit(payload: SaveBlocksRequest): void {
    const request = payload;
    if (!request.actorId || !request.actorType) {
      console.warn('Payload incompleto: falta actorId o actorType', request);
      return;
    }


    this.businessService.saveBlocks(this.businessId, request).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Guardado exitoso',
          text: 'Los cambios se guardaron correctamente.'
        });
      },
      error: (error) => console.error('Error al guardar bloques', error)
    });
  }

  handleFinalize(payload: SaveBlocksRequest): void {
    const request = payload;
    if (!request.actorId || !request.actorType) {
      console.warn('Payload incompleto: falta actorId o actorType', request);
      return;
    }

    this.businessService.saveBlocksAndFinish(this.businessId, request).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Finalización exitosa',
          text: 'La tarea se finalizó correctamente.'
        });
      },
      error: (error) => console.error('Error al finalizar tarea', error)
    });
  }

  goBack(): void {
    this.location.back();
  }
}
