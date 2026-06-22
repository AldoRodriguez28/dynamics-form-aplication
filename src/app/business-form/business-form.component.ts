import { CommonModule, Location } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ThemeService } from '../theme/theme.service';
import { BehaviorSubject, catchError, map, Observable, of, switchMap, tap } from 'rxjs';
import Swal from 'sweetalert2';
import { BusinessService } from '../services/business.service';
import { BusinessForm, FormStatus } from '../models/form-schema.model';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { SaveBlocksRequest } from '../services/request/save-blocks.request';
import { BusinessMapping } from '../mapping/business/business.map';
import { TokenStorageService } from '../services/shared/token-storage.service';
import { ExternalData } from '../models/external-data.model';
import { coerceExternalValue, parseExternalData } from '../utils/external-data.utils';
import { isReadOnlyForSharedWithClientState } from '../utils/role.utils';

@Component({
  selector: 'app-business-form',
  standalone: true,
  imports: [CommonModule, DynamicFormComponent],
  templateUrl: './business-form.component.html',
  styleUrl: './business-form.component.scss'
})
export class BusinessFormComponent {
  private readonly theme = inject(ThemeService);
  readonly isSacom = computed(() => this.theme.active().origin === 'sacom');

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly businessService = inject(BusinessService);
  private readonly tokenStore = inject(TokenStorageService);
  private readonly formSchemaSubject = new BehaviorSubject<BusinessForm | null>(null);

  clientId = this.route.snapshot.paramMap.get('idClient') ?? '';
  businessId = this.route.snapshot.paramMap.get('businessId') ?? '';
  private readonly navState: Record<string, unknown> =
    (this.router.getCurrentNavigation()?.extras.state as Record<string, unknown>) ??
    (history.state as Record<string, unknown>) ??
    {};

  commercialName = (this.navState['commercialName'] as string) ?? '';
  versionNumber = (this.navState['versionNumber'] as number) ?? 1;

  formSchema$: Observable<BusinessForm | null> = this.formSchemaSubject.asObservable();
  advertiserName = (this.navState['advertiserName'] as string) ?? '';
  categoryName = (this.navState['categoryName'] as string) ?? '';
  categoryCode = (this.navState['categoryCode'] as string) ?? '';
  townName = (this.navState['townName'] as string) ?? '';
  townCode = (this.navState['townCode'] as string) ?? '';
  externalDataRaw = this.navState['externalData'] ?? '';
  externalData: ExternalData | null = parseExternalData(this.externalDataRaw);
  // Debug: inspeccionar cómo llega externalData/renewal desde navegación
  // eslint-disable-next-line no-console
  private readonly _logExternalData = console.log('[business-form] externalData raw/parsed', {
    raw: this.externalDataRaw,
    parsed: this.externalData
  });
  contractId = coerceExternalValue(this.externalData?.contractId);
  renewal = coerceExternalValue(this.externalData?.renewal);
  userRole = this.tokenStore.getRole();
  userName = this.tokenStore.getAdvertiserName();

  constructor() {
    this.loadHeaderData();
    this.loadForm();
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
      case 'shared_with_client':
      case 'sharedwithclient':
        return 'Shared with client';
      default:
        return status?.toString() || 'Draft';
    }
  }

  statusVariant(status?: FormStatus): string {
    const raw = (status ?? 'DRAFT').toString().trim();
    if (!raw) return 'DRAFT';
    return raw.toUpperCase().replace(/[\s-]+/g, '_');
  }

  /**
   * Restricción **adicional** al `[readOnly]` del dynamic-form: únicamente cuando el estado
   * es SHARED_WITH_CLIENT y el usuario no es CLIENT. No sustituye `canEdit`, `readOnlyRoles`
   * ni el resto de validaciones del formulario dinámico.
   */
  extraReadOnlySharedWithClient(schema: BusinessForm): boolean {
    return isReadOnlyForSharedWithClientState(schema.status, this.userRole);
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
        this.refreshStatus();
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
        this.refreshStatus();
      },
      error: (error) => console.error('Error al finalizar tarea', error)
    });
  }

  goBack(): void {
    const accessToken = this.tokenStore.getAccessToken();
    if (accessToken) {
      this.router.navigateByUrl(`/${accessToken}`);
      return;
    }
    this.location.back();
  }

  private loadForm(): void {
    this.businessService
      .getbusinessesById(this.businessId, this.versionNumber)
      .pipe(
        tap(res => console.log('Business form response:', res)),
        map(res => {
          const mapped = BusinessMapping.MapBlocksToBusinessForm(res, this.commercialName);
          return {
            ...mapped,
            businessId: mapped.businessId ?? this.businessId,
            versionNumber: mapped.versionNumber ?? this.versionNumber,
            businessVersion: mapped.businessVersion ?? this.versionNumber
          };
        }),
        switchMap((schema) =>
          this.businessService.getBusinessVersionState(this.businessId, schema.versionNumber ?? this.versionNumber).pipe(
            map((state) => ({ ...schema, status: state?.state ?? schema.status })),
            catchError(() => of(schema))
          )
        )
      )
      .subscribe({
        next: (schema) => this.formSchemaSubject.next(schema),
        error: (error) => console.error('Error al cargar formulario', error)
      });
  }

  private refreshStatus(): void {
    const current = this.formSchemaSubject.value;
    if (!current) return;
    const version = current.versionNumber ?? this.versionNumber;
    this.businessService.getBusinessVersionState(this.businessId, version).subscribe({
      next: (res) => {
        const state = res?.state ?? current.status;
        if (!state || state === current.status) return;
        // Mutate status in-place to avoid triggering ngOnChanges/setupForm rebuild
        current.status = state;
        this.formSchemaSubject.next(current);
      },
      error: (error) => console.error('Error al actualizar estatus', error)
    });
  }

  private loadHeaderData(): void {
    const role = (this.userRole ?? '').toUpperCase();
    const isClient = role === 'CLIENT';
    if (!isClient && this.hasNavHeaderData()) return;

    const version = this.versionNumber ?? 1;
    this.businessService.getBusinessVersionDetail(this.businessId, version).subscribe({
      next: (detail) => {
        if (!detail) return;

        this.commercialName = this.commercialName || detail.businessName || '';
        this.categoryName = this.categoryName || detail.categoryName || '';
        this.townName = this.townName || detail.townName || '';
        if (!this.categoryCode) this.categoryCode = '';
        if (!this.townCode) this.townCode = '';

        const legacyId = detail.legacyAdvertiserId;
        if (!this.clientId && legacyId !== null && legacyId !== undefined) {
          this.clientId = String(legacyId);
        }

        if (!this.externalDataRaw) this.externalDataRaw = detail.externalData ?? '';
        this.externalData = parseExternalData(this.externalDataRaw);
        if (!this.contractId) this.contractId = coerceExternalValue(this.externalData?.contractId);
        if (!this.renewal) this.renewal = coerceExternalValue(this.externalData?.renewal);
      },
      error: (error) => console.error('Error al cargar datos de encabezado', error)
    });
  }

  private hasNavHeaderData(): boolean {
    return Boolean(
      this.advertiserName ||
        this.commercialName ||
        this.categoryName ||
        this.townName ||
        this.categoryCode ||
        this.townCode ||
        this.externalDataRaw
    );
  }

  // External data parsing handled by utils.
}
