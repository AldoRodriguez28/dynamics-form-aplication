import { CommonModule } from '@angular/common';
import { Component, computed, EventEmitter, HostListener, inject, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { canFinalizeForm, getControl, getFieldOptions, optionKey, OptionValue, toggleOption } from '../utils';
import { SaveBlocksRequest } from '../services/request/save-blocks.request';
import { PayloadBuilder } from '../utils/payload.builder';
import { BusinessForm, BusinessFormBlock, FormStatus } from '../models/form-schema.model';
import { FormSidebarComponent } from '../components/form-sidebar/form-sidebar.component';
import { CopyBlockModalComponent } from '../components/copy-block-modal/copy-block-modal.component';
import { BlockFieldsComponent } from './block-fields/block-fields.component';
import { collectRequiredFields, findMissingRequiredFields } from '../utils';
import Swal from 'sweetalert2';
import { CatalogService } from '../services/catalog.service';
import { EMPTY, map, Observable, shareReplay, take } from 'rxjs';
import { OptionItemInterface } from './interface/OptionItem.intreface';
import { CatalogMapping } from '../mapping/catalog/catalog.map';
import { BusinessService } from '../services/business.service';
import { TokenStorageService } from '../services/shared/token-storage.service';
import { BlockAccessPolicy } from './services/block-access.policy';
import { BlockFactoryService, BlockView, FormValueParser } from './services/block-factory.service';
import { BusinessResponse } from '../services/response/business/business.response';
import { BusinessMapping } from '../mapping/business/business.map';
import { ThemeService } from '../theme/theme.service';

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormSidebarComponent,
    CopyBlockModalComponent,
    BlockFieldsComponent
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss'
})
export class DynamicFormComponent implements OnChanges {
  private readonly catalogService = inject(CatalogService);
  private readonly businessService = inject(BusinessService);
  private readonly blockFactory = inject(BlockFactoryService);
  private readonly fb = inject(FormBuilder);
  private readonly tokenStore = inject(TokenStorageService);
  private readonly theme = inject(ThemeService);

  readonly variant = computed<'default' | 'sacom'>(() =>
    this.theme.active().origin === 'sacom' ? 'sacom' : 'default'
  );

  readonly currentStep = signal(0);

  currentBlock(): BlockView | undefined {
    return this.blocks[this.currentStep()];
  }

  isLastStep(): boolean {
    return this.currentStep() >= this.blocks.length - 1;
  }

  currentStepInvalid(): boolean {
    const block = this.currentBlock();
    if (!block) return false;
    const group = this.form.get(block.code);
    return !!group && group.invalid;
  }

  nextStep(): void {
    const block = this.currentBlock();
    const group = block ? (this.form.get(block.code) as FormGroup | null) : null;
    if (this.currentStepInvalid()) {
      group?.markAllAsTouched();
      return;
    }
    if (!this.isLastStep()) this.currentStep.set(this.currentStep() + 1);
  }

  prevStep(): void {
    if (this.currentStep() > 0) this.currentStep.set(this.currentStep() - 1);
  }

  @Input({ required: true }) schema!: BusinessForm;
  @Input() readOnly = false;
  @Input() userRole?: string | null;
  @Input() formStatus?: FormStatus;
  @Output() submitForm = new EventEmitter<SaveBlocksRequest>();
  @Output() finalizeForm = new EventEmitter<SaveBlocksRequest>();

  form!: FormGroup;
  private readonly fallbackActorType = 'AGENT';
  private readonly fallbackActorId = 'usuario.demo';
  blocks: BlockView[] = [];
  formReadOnly = false;
  optionsMap: Record<string, OptionItemInterface[]> = {};
  apiOptionsCache: Record<string, Observable<OptionItemInterface[]>> = {};
  categoriasNegocio$: Observable<OptionItemInterface[]> = EMPTY;
  valueParsers: Record<string, FormValueParser> = {};
  private pendingSelectValues: Record<string, unknown> = {};
  getControl = getControl;
  get canFinalize(): boolean {
    return canFinalizeForm(this.userRole, this.formStatus ?? this.schema?.status);
  }

  // --- Copy from business ---
  openMenuBlockCode: string | null = null;
  copyModalVisible = false;
  copyModalLoading = false;
  copyModalBusinesses: BusinessResponse[] = [];
  private copyTargetBlockCode: string | null = null;

  @HostListener('document:click')
  onDocumentClick(): void {
    this.openMenuBlockCode = null;
  }

  toggleBlockMenu(blockCode: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.openMenuBlockCode = this.openMenuBlockCode === blockCode ? null : blockCode;
  }

  openCopyModal(blockCode: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.openMenuBlockCode = null;
    this.copyTargetBlockCode = blockCode;
    this.copyModalVisible = true;
    this.copyModalLoading = true;

    const advertiserId = this.schema?.advertiserId ?? this.tokenStore.getAdvertiserId();
    if (!advertiserId) {
      this.copyModalLoading = false;
      return;
    }

    this.businessService.getLegacy(advertiserId, true).subscribe({
      next: (res) => {
        this.copyModalBusinesses = res.businesses ?? [];
        this.copyModalLoading = false;
      },
      error: () => {
        this.copyModalBusinesses = [];
        this.copyModalLoading = false;
      }
    });
  }

  closeCopyModal(): void {
    this.copyModalVisible = false;
    this.copyModalBusinesses = [];
    this.copyTargetBlockCode = null;
  }

  onCopyBusinessSelected(business: BusinessResponse): void {
    if (!business.businessId) return;
    const versionNumber = business.versionNumber ?? business.businessVersion ?? 1;

    this.copyModalVisible = false;

    Swal.fire({
      title: 'Cargando información...',
      text: `Copiando datos de "${business.commercialName || business.businessId}"`,
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    this.businessService.getbusinessesById(business.businessId, versionNumber).subscribe({
      next: (res) => {
        const sourceSchema = BusinessMapping.MapBlocksToBusinessForm(res, business.commercialName ?? '');
        this.applySourceBlocks(sourceSchema);
        Swal.close();
        Swal.fire({
          icon: 'success',
          title: 'Información copiada',
          text: 'Los datos se cargaron correctamente. Revisa y guarda los cambios.',
          timer: 3000,
          showConfirmButton: false
        });
      },
      error: () => {
        Swal.close();
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo cargar la información del negocio seleccionado.'
        });
      }
    });
  }

  private applySourceBlocks(sourceSchema: BusinessForm): void {
    if (!sourceSchema.blocks?.length || !this.form) return;

    const targetBlockCode = this.copyTargetBlockCode;

    sourceSchema.blocks.forEach((srcBlock) => {
      if (targetBlockCode && srcBlock.code !== targetBlockCode) return;

      const formGroup = this.form.get(srcBlock.code) as FormGroup | null;
      if (!formGroup || formGroup.disabled) return;

      const blockView = this.blocks.find((b) => b.code === srcBlock.code);
      const values = srcBlock.values ?? {};

      Object.entries(values).forEach(([fieldName, value]) => {
        const control = formGroup.get(fieldName);
        if (!control || value === null || value === undefined) return;

        const fieldDef = blockView?.rows
          .flatMap((r) => r.fields)
          .find((f) => f.name === fieldName);

        const displayType = fieldDef?.displayType;

        if (displayType === 'file') {
          this.applyFileValue(control as FormControl, value, fieldDef!, srcBlock.code);
          return;
        }

        if (displayType === 'phones' && control instanceof FormArray) {
          this.applyPhoneArrayValue(control, value, fieldDef!);
        } else if (displayType === 'array-object' && control instanceof FormArray) {
          this.applyArrayObjectValue(control, value, fieldDef!);
        } else if ((displayType === 'array-primitive' || displayType === 'productos-servicios') && control instanceof FormArray) {
          this.applyPrimitiveArrayValue(control, value, fieldDef!, srcBlock.code);
        } else if (displayType === 'location-map') {
          this.applyLocationMapValue(formGroup, fieldName, value, values);
        } else if (fieldDef?.type === 'tel' && fieldDef?.collection !== 'array') {
          this.applySingleTelValue(formGroup, fieldName, value);
        } else {
          control.setValue(value, { emitEvent: true });
        }

        control.markAsDirty();
      });
    });

    this.copyTargetBlockCode = null;
  }

  private applyPhoneArrayValue(formArray: FormArray, rawValue: unknown, field: any): void {
    const items = this.normalizePhoneItems(rawValue, field);
    formArray.clear({ emitEvent: false });
    items.forEach((item) => {
      const group = this.fb.group({
        ...(item.tipo !== undefined ? { tipo: [item.tipo] } : {}),
        numero: [item.numero ?? ''],
        country: [item.country ?? '']
      });
      formArray.push(group, { emitEvent: false });
    });
    formArray.updateValueAndValidity({ emitEvent: true });
  }

  private normalizePhoneItems(rawValue: unknown, field: any): Array<{ tipo?: string; numero: string; country: string }> {
    let items: Record<string, unknown>[] = [];

    if (Array.isArray(rawValue)) {
      items = rawValue.map((item) => {
        if (typeof item === 'string') {
          try {
            const parsed = JSON.parse(item);
            if (parsed && typeof parsed === 'object') return parsed;
          } catch { /* ignore */ }
          return { numero: item };
        }
        if (item && typeof item === 'object') return item as Record<string, unknown>;
        return { numero: String(item ?? '') };
      });
    } else if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) return this.normalizePhoneItems(parsed, field);
        if (parsed && typeof parsed === 'object') items = [parsed];
      } catch {
        items = [{ numero: rawValue }];
      }
    } else if (rawValue && typeof rawValue === 'object') {
      items = [rawValue as Record<string, unknown>];
    }

    if (!items.length) items = [{}];

    return items.map((item) => ({
      ...(item['tipo'] !== undefined ? { tipo: String(item['tipo'] ?? '') } : {}),
      numero: this.extractPhoneNumber(item['numero'] ?? item['number'] ?? ''),
      country: this.normalizeCountryValue(item['country'])
    }));
  }

  private extractPhoneNumber(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('{')) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === 'object') {
            return String(parsed['number'] ?? parsed['numero'] ?? '');
          }
        } catch { /* not JSON, use as-is */ }
      }
      return trimmed;
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>;
      return String(obj['number'] ?? obj['numero'] ?? '');
    }
    return String(value);
  }

  private normalizeCountryValue(value: unknown): string {
    const normalized = typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : '';
    if (normalized === 'US') return 'US';
    if (normalized === 'MX') return 'MX';
    return '';
  }

  private applyArrayObjectValue(formArray: FormArray, rawValue: unknown, field: any): void {
    let items: Record<string, unknown>[] = [];
    let parsed: unknown = rawValue;

    if (typeof rawValue === 'string') {
      try { parsed = JSON.parse(rawValue); } catch { parsed = []; }
    }

    if (Array.isArray(parsed)) {
      items = parsed.filter((i) => i && typeof i === 'object') as Record<string, unknown>[];
    } else if (parsed && typeof parsed === 'object') {
      items = [parsed as Record<string, unknown>];
    }

    if (!items.length) return;

    const keys = field.itemKeys ?? Object.keys(items[0]);
    formArray.clear({ emitEvent: false });
    items.forEach((item) => {
      const controls: Record<string, unknown> = {};
      keys.forEach((key: string) => {
        controls[key] = [item[key] ?? ''];
      });
      formArray.push(this.fb.group(controls), { emitEvent: false });
    });
    formArray.updateValueAndValidity({ emitEvent: true });
  }

  private applyPrimitiveArrayValue(formArray: FormArray, rawValue: unknown, field: any, blockCode?: string): void {
    let items: unknown[] = [];

    if (Array.isArray(rawValue)) {
      items = rawValue;
    } else if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue);
        if (Array.isArray(parsed)) items = parsed;
        else items = [rawValue];
      } catch {
        items = [rawValue];
      }
    } else {
      items = [rawValue];
    }

    if (!items.length) return;

    // If this is a file array, download and re-upload each file
    const isFileArray = field.type === 'file' || field.itemType === 'file';
    if (isFileArray) {
      this.applyFileArrayValue(formArray, items, field, blockCode ?? '');
      return;
    }

    formArray.clear({ emitEvent: false });
    items.forEach((val) => {
      formArray.push(this.fb.control(val ?? ''), { emitEvent: false });
    });
    formArray.updateValueAndValidity({ emitEvent: true });
  }

  private applyFileArrayValue(formArray: FormArray, items: unknown[], field: any, blockCode: string): void {
    const businessId = this.schema?.businessId;
    if (!businessId) return;

    formArray.clear({ emitEvent: false });
    items.forEach(() => {
      formArray.push(this.fb.control(null), { emitEvent: false });
    });
    formArray.updateValueAndValidity({ emitEvent: true });

    items.forEach((item, index) => {
      const url = this.extractFileUrl(item);
      if (!url) return;

      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          const fileName = this.extractFileNameFromUrl(url) || `file-${index}`;
          const file = new File([blob], fileName, { type: blob.type });

          this.businessService
            .uploadFiles({
              files: file,
              businessId,
              versionNumber: this.schema?.versionNumber ?? 1,
              fieldName: field.name,
              usage: field.usage || '',
              blockCode
            })
            .subscribe({
              next: (response) => {
                const payload = this.extractUploadedFilePayload(response);
                if (payload) {
                  const ctrl = formArray.at(index);
                  if (ctrl) {
                    ctrl.setValue(payload);
                    ctrl.markAsDirty();
                  }
                }
              },
              error: () => {
                console.warn(`[CopyFile] Failed to upload file[${index}] for field "${field.name}"`);
              }
            });
        })
        .catch(() => {
          console.warn(`[CopyFile] Failed to download file[${index}] from "${url}" for field "${field.name}"`);
        });
    });
  }

  private applyLocationMapValue(
    formGroup: FormGroup,
    fieldName: string,
    coordsValue: unknown,
    allValues: Record<string, unknown>
  ): void {
    const coordsControl = formGroup.get(fieldName);
    if (coordsControl) {
      coordsControl.setValue(typeof coordsValue === 'string' ? coordsValue : '', { emitEvent: true });
      coordsControl.markAsDirty();
    }
    const addressControl = formGroup.get('direccion');
    if (addressControl && allValues['direccion'] !== undefined) {
      addressControl.setValue(allValues['direccion'] ?? '', { emitEvent: true });
      addressControl.markAsDirty();
    }
  }

  private applySingleTelValue(formGroup: FormGroup, fieldName: string, rawValue: unknown): void {
    let numero = '';
    let country = '';

    if (typeof rawValue === 'string') {
      try {
        const parsed = JSON.parse(rawValue);
        if (parsed && typeof parsed === 'object') {
          numero = String(parsed['number'] ?? parsed['numero'] ?? '');
          country = this.normalizeCountryValue(parsed['country']);
        } else {
          numero = rawValue;
        }
      } catch {
        numero = rawValue;
      }
    } else if (rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      const obj = rawValue as Record<string, unknown>;
      numero = String(obj['number'] ?? obj['numero'] ?? '');
      country = this.normalizeCountryValue(obj['country']);
    } else {
      numero = String(rawValue ?? '');
    }

    const numberControl = formGroup.get(fieldName);
    if (numberControl) {
      numberControl.setValue(numero, { emitEvent: true });
      numberControl.markAsDirty();
    }

    const countryControl = formGroup.get(`${fieldName}Country`);
    if (countryControl) {
      countryControl.setValue(country, { emitEvent: true });
      countryControl.markAsDirty();
    }
  }

  private applyFileValue(control: FormControl, rawValue: unknown, fieldDef: any, blockCode: string): void {
    const url = this.extractFileUrl(rawValue);
    if (!url) return;

    const businessId = this.schema?.businessId;
    if (!businessId) return;

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((blob) => {
        const fileName = this.extractFileNameFromUrl(url) || 'copied-file';
        const file = new File([blob], fileName, { type: blob.type });

        this.businessService
          .uploadFiles({
            files: file,
            businessId,
            versionNumber: this.schema?.versionNumber ?? 1,
            fieldName: fieldDef.name,
            usage: fieldDef.usage || '',
            blockCode
          })
          .subscribe({
            next: (response) => {
              const payload = this.extractUploadedFilePayload(response);
              if (payload) {
                control.setValue(payload);
                control.markAsDirty();
              }
            },
            error: () => {
              console.warn(`[CopyFile] Failed to upload file for field "${fieldDef.name}"`);
            }
          });
      })
      .catch(() => {
        console.warn(`[CopyFile] Failed to download file from "${url}" for field "${fieldDef.name}"`);
      });
  }

  private extractFileUrl(rawValue: unknown): string | null {
    if (typeof rawValue === 'string') {
      if (rawValue.startsWith('http')) return rawValue;
      try {
        const parsed = JSON.parse(rawValue);
        if (parsed && typeof parsed === 'object') {
          const url = parsed['url'];
          if (typeof url === 'string') return url;
        }
      } catch { /* ignore */ }
      return null;
    }
    if (rawValue && typeof rawValue === 'object') {
      const obj = rawValue as Record<string, unknown>;
      const url = obj['url'];
      if (typeof url === 'string') return url;
    }
    return null;
  }

  private extractFileNameFromUrl(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      const segments = pathname.split('/');
      return segments[segments.length - 1] || 'file';
    } catch {
      return 'file';
    }
  }

  private extractUploadedFilePayload(response: unknown): { file_id: number; url: string } | null {
    if (!response || typeof response !== 'object') return null;
    const data = (response as Record<string, unknown>)['data'];
    if (!Array.isArray(data) || !data.length) return null;
    const item = data[0];
    if (!item || typeof item !== 'object') return null;
    const fileId = (item as Record<string, unknown>)['file_id'];
    const url = (item as Record<string, unknown>)['url'];
    if (typeof fileId === 'number' && typeof url === 'string') {
      return { file_id: fileId, url };
    }
    return null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema']?.currentValue) {
      this.setupForm();
      return;
    }
    if (this.schema?.blocks?.length && (changes['readOnly'] || changes['userRole'])) {
      this.setupForm();
    }
  }

  onCheckboxToggle(blockCode: string, fieldName: string, payload: { value: OptionValue; checked: boolean }): void {
    toggleOption(this.form.get([blockCode, fieldName]), payload);
  }

  getOptions(blockCode: string, fieldName: string): OptionItemInterface[] {
    return getFieldOptions(this.optionsMap, blockCode, fieldName);
  }

  getArrayControl(blockCode: string, name: string): FormArray {
    return this.form.get([blockCode, name]) as FormArray;
  }

  getBlockGroup(blockCode: string): FormGroup {
    return this.form.get(blockCode) as FormGroup;
  }

  onSubmit(): void {
    if (this.formReadOnly) return;
    if (!this.form) return;
    this.form.markAllAsTouched();

    const missingRequired = findMissingRequiredFields(this.getBlocksWithCurrentValues());
    if (missingRequired.length) {
      const detail = missingRequired
        .map((item) => `${item.blockName || item.blockCode}: ${item.label || item.fieldName}`)
        .join('<br>');

      Swal.fire({
        icon: 'warning',
        title: 'Faltan campos obligatorios',
        html: `Debes completar o llenar lo siguiente:<br><br>${detail}`,
        confirmButtonText: 'Entendido'
      });

      return;
    }

    if (!this.form.valid) {
      this.showInvalidFormSwal('guardar');
      return;
    }

    this.submitForm.emit(this.buildPayload());
  }

  onFinalize(): void {
    if (this.formReadOnly) return;
    if (!this.form) return;
    this.form.markAllAsTouched();

    const missingRequired = findMissingRequiredFields(this.getBlocksWithCurrentValues());
    if (missingRequired.length) {
      const detail = missingRequired
        .map((item) => `${item.blockName || item.blockCode}: ${item.label || item.fieldName}`)
        .join('<br>');

      Swal.fire({
        icon: 'warning',
        title: 'Faltan campos obligatorios',
        html: `Debes completar o llenar lo siguiente:<br><br>${detail}`,
        confirmButtonText: 'Entendido'
      });

      return;
    }

    if (!this.form.valid) {
      this.showInvalidFormSwal('finalizar');
      return;
    }

    this.finalizeForm.emit(this.buildPayload());
  }

  /**
   * El formulario puede seguir inválido por validadores que no reflejan solo `required` del esquema
   * (horarios, arrays compuestos, teléfono, etc.): mostrar SweetAlert en lugar de fallar en silencio.
   */
  private showInvalidFormSwal(context: 'finalizar' | 'guardar'): void {
    const formatErrors = this.getFormatErrors(this.form);
    if (formatErrors.length) {
      const detail = formatErrors
        .map((item) => {
          const label = this.getFieldLabelByPath(item.path) || item.path;
          return `${label}: ${item.errors.join(', ')}`;
        })
        .join('<br>');
      const intro =
        context === 'finalizar'
          ? 'Debes completar o corregir lo siguiente antes de finalizar:'
          : 'Debes completar o corregir lo siguiente antes de guardar:';
      Swal.fire({
        icon: 'warning',
        title: 'Revisa el formulario',
        html: `${intro}<br><br>${detail}`,
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const verb = context === 'finalizar' ? 'finalizar' : 'guardar los cambios';
    Swal.fire({
      icon: 'warning',
      title: 'Formulario incompleto',
      text: `Debes completar o llenar todos los campos y secciones obligatorias antes de ${verb}. Revisa los avisos en el formulario.`,
      confirmButtonText: 'Entendido'
    });
  }

  saveJustOneBlock(block: BlockView, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.formReadOnly || block.readOnly) return;
    if (!this.form) return;

    const blockGroup = this.form.get(block.code) as FormGroup | null;
    blockGroup?.markAllAsTouched();

    const blockWithValues = this.getBlockWithCurrentValues(block.code);
    if (!blockWithValues) return;

    if (!blockGroup?.valid) {
      const formatErrors = blockGroup ? this.getFormatErrors(blockGroup, [block.code]) : [];
      if (formatErrors.length) return;
    }

    const businessId = this.schema?.businessId;
    const versionNumber = this.schema?.versionNumber ?? this.schema?.businessVersion;

    if (businessId == null || versionNumber == null) {
      console.warn('No se pudo guardar el bloque: falta businessId o versionNumber.');
      return;
    }

    const request = this.buildPayloadForBlocks([blockWithValues]);

    this.businessService
      .saveSingleBlock(businessId, versionNumber, blockWithValues.code, request)
      .subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Bloque guardado',
            text: 'Los cambios se guardaron correctamente.'
          });
        },
        error: (error) => console.error('Error al guardar bloque', error)
      });
  }
  saveBlock(block: BlockView, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();

    if (this.formReadOnly || block.readOnly) return;
    if (!this.form) return;

    const blockGroup = this.form.get(block.code) as FormGroup | null;
    blockGroup?.markAllAsTouched();

    const blockWithValues = this.getBlockWithCurrentValues(block.code);
    if (!blockWithValues) return;

    if (!blockGroup?.valid) {
      const formatErrors = blockGroup ? this.getFormatErrors(blockGroup, [block.code]) : [];
      if (formatErrors.length) {
        // eslint-disable-next-line no-console
        console.warn('[Guardar bloque] Campos con formato invalido:', formatErrors);
        const detail = formatErrors
          .map((item) => {
            const label = this.getFieldLabelByPath(item.path) || item.path;
            return `${label}: ${item.errors.join(', ')}`;
          })
          .join('<br>');

        Swal.fire({
          icon: 'warning',
          title: 'Corrige los formatos',
          html: detail,
          confirmButtonText: 'Entendido'
        });
        return;
      }
    }

    this.submitForm.emit(this.buildPayloadForBlocks([blockWithValues]));
  }

  emitDraft(): void {
    if (this.formReadOnly) return;
    if (!this.form) return;
    this.form.markAllAsTouched();
    const formatErrors = this.getFormatErrors(this.form);
    if (formatErrors.length) {
      // eslint-disable-next-line no-console
      console.warn('[Guardar avance] Campos con formato invalido:', formatErrors);
      Swal.fire({
        icon: 'warning',
        title: 'Corrige los formatos',
        text: 'Hay campos con formato inválido. Corrige esos datos antes de guardar el avance.',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    this.submitForm.emit(this.buildPayload());
  }

  private hasFormatErrors(control: AbstractControl): boolean {
    if (control.errors) {
      const value = control.value;
      if (this.isEmptyValueDeep(value)) return false;
      const errorKeys = Object.keys(control.errors);
      const hasNonRequired = errorKeys.some((key) => key !== 'required');
      if (hasNonRequired) return true;
    }

    if (control instanceof FormGroup) {
      return Object.values(control.controls).some((child) => this.hasFormatErrors(child));
    }

    if (control instanceof FormArray) {
      return control.controls.some((child) => this.hasFormatErrors(child));
    }

    return false;
  }

  private getFormatErrors(
    control: AbstractControl,
    path: string[] = []
  ): Array<{ path: string; errors: string[] }> {
    const results: Array<{ path: string; errors: string[] }> = [];

    if (control.errors && !this.isEmptyValueDeep(control.value)) {
      const errorKeys = Object.keys(control.errors).filter((key) => key !== 'required');
      if (errorKeys.length) {
        results.push({
          path: path.join('.'),
          errors: errorKeys
        });
      }
    }

    if (control instanceof FormGroup) {
      Object.entries(control.controls).forEach(([key, child]) => {
        results.push(...this.getFormatErrors(child, [...path, key]));
      });
    }

    if (control instanceof FormArray) {
      control.controls.forEach((child, index) => {
        results.push(...this.getFormatErrors(child, [...path, String(index)]));
      });
    }

    return results;
  }

  private isEmptyValueDeep(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim().length === 0;
    if (Array.isArray(value)) {
      if (value.length === 0) return true;
      return value.every((item) => this.isEmptyValueDeep(item));
    }
    if (typeof value === 'object') {
      const entries = Object.values(value as Record<string, unknown>);
      if (entries.length === 0) return true;
      return entries.every((item) => this.isEmptyValueDeep(item));
    }
    return false;
  }

  private getFieldLabelByPath(path: string): string | null {
    if (!this.schema?.blocks?.length || !path) return null;
    const parts = path.split('.').filter(Boolean);
    if (parts.length < 2) return null;
    const blockCode = parts[0];
    const fieldName = parts[1];
    const block = this.schema.blocks.find((b) => b.code === blockCode);
    if (!block) return null;
    const field =
      (block.rows ?? [])
        .flatMap((row) => row.fields ?? [])
        .find((f) => f.name === fieldName);
    return field?.label ?? field?.name ?? null;
  }

  private setupForm(): void {
    if (!this.schema?.blocks?.length) return;

    const group: Record<string, FormGroup> = {};
    this.optionsMap = {};
    this.valueParsers = {};

    const accessPolicy = new BlockAccessPolicy(this.readOnly, this.schema?.canEdit, this.userRole);
    const schemaBlocks = this.schema.blocks
      .filter((block) => accessPolicy.isBlockVisible(block))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    this.blocks = schemaBlocks.map((block, index) => {
      const blockReadOnly = accessPolicy.isBlockReadOnly(block);
      const { view, controls, optionsMap, valueParsers } = this.blockFactory.buildBlock(
        block,
        index,
        blockReadOnly
      );
      group[block.code] = this.fb.group(controls);
      if (blockReadOnly) {
        group[block.code].disable({ emitEvent: false });
      }

      Object.assign(this.optionsMap, optionsMap);
      Object.assign(this.valueParsers, valueParsers);

      return view;
    });

    // Solo para pruebas: imprimir los campos requeridos detectados en el esquema
    const requiredFieldsSnapshot = collectRequiredFields(schemaBlocks);
    console.info('Campos requeridos detectados:', requiredFieldsSnapshot);

    this.form = this.fb.group(group);
    this.formReadOnly =
      this.readOnly || this.schema?.canEdit === false || !this.blocks.some((block) => !block.readOnly);
    if (this.readOnly || this.schema?.canEdit === false) {
      this.form.disable({ emitEvent: false });
    }
    this.currentStep.set(0);
    this.loadApiOptionsForBlocks();
  }

  private buildPayload(): SaveBlocksRequest {
    return this.buildPayloadForBlocks(this.getBlocksWithCurrentValues());
  }

  private buildPayloadForBlocks(blocks: BusinessFormBlock[]): SaveBlocksRequest {
    const builder = new PayloadBuilder(
      this.schema.actorType || this.getFallbackActorType(),
      this.schema.actorId || this.getFallbackActorId()
    );

    return builder.withBlocks(blocks).build();
  }

  private getFallbackActorType(): string {
    return this.tokenStore.getRole() || this.fallbackActorType;
  }

  private getFallbackActorId(): string {
    return this.tokenStore.getAdvertiserId() || this.fallbackActorId;
  }

  private getBlocksWithCurrentValues(): BusinessFormBlock[] {
    if (!this.schema?.blocks || !this.form) return [];

    return this.schema.blocks.map((block) => {
      const blockWithValues = this.getBlockWithCurrentValues(block.code);
      return blockWithValues ?? block;
    });
  }

  private getBlockWithCurrentValues(blockCode: string): BusinessFormBlock | null {
    if (!this.schema?.blocks || !this.form) return null;

    const block = this.schema.blocks.find((candidate) => candidate.code === blockCode);
    if (!block) return null;

    const rawValues = (this.form.get(block.code) as FormGroup)?.value ?? {};
    const parsedValues: Record<string, unknown> = {};

    Object.entries(rawValues).forEach(([name, value]) => {
      const parser = this.valueParsers[optionKey(block.code, name)];
      parsedValues[name] = parser ? parser(value) : value;
    });

    (block.rows ?? []).forEach((row) => {
      (row.fields ?? []).forEach((field) => {
        if (field.type === 'tel' && field.collection !== 'array') {
          const countryKey = `${field.name}Country`;
          const numberValue = rawValues[field.name];
          const countryValue = rawValues[countryKey];
          const phonePayload = {
            number: numberValue ?? '',
            country: typeof countryValue === 'string' ? countryValue : ''
          };
          parsedValues[field.name] = JSON.stringify(phonePayload);
          delete parsedValues[countryKey];
          return;
        }

        if (field.type === 'file' && field.collection !== 'array') {
          const raw = rawValues[field.name];
          if (raw && typeof raw === 'object' && !(raw instanceof File)) {
            parsedValues[field.name] = JSON.stringify(raw);
          }
          return;
        }

        const schema = field.itemSchema ?? {};
        const isPhoneArray =
          field.collection === 'array' &&
          field.type === 'object' &&
          Object.prototype.hasOwnProperty.call(schema, 'numero') &&
          Object.prototype.hasOwnProperty.call(schema, 'country');

        if (!isPhoneArray) return;

        const rawArray = rawValues[field.name];
        const items = Array.isArray(rawArray)
          ? rawArray
          : rawArray && typeof rawArray === 'object'
            ? [rawArray]
            : [];

        parsedValues[field.name] = items.map((item) => {
          const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
          const number = record['number'] ?? record['numero'] ?? '';
          const country = typeof record['country'] === 'string' ? record['country'] : '';
          const next: Record<string, unknown> = { number, country };
          if (record['tipo'] !== undefined) next['tipo'] = record['tipo'];
          return JSON.stringify(next);
        });
      });
    });

    (block.rows ?? []).forEach((row) => {
      (row.fields ?? []).forEach((field) => {
        const schema = field.itemSchema ?? {};
        const hasTelInArrayObject =
          field.collection === 'array' &&
          field.type === 'object' &&
          Object.values(schema).some((item) => item?.type === 'tel') &&
          !(Object.prototype.hasOwnProperty.call(schema, 'numero') &&
            Object.prototype.hasOwnProperty.call(schema, 'country'));

        if (!hasTelInArrayObject) return;

        const rawArray = rawValues[field.name];
        const items = Array.isArray(rawArray)
          ? rawArray
          : rawArray && typeof rawArray === 'object'
            ? [rawArray]
            : [];

        parsedValues[field.name] = items.map((item) => {
          const record = item && typeof item === 'object' ? { ...(item as Record<string, unknown>) } : {};
          Object.entries(schema).forEach(([key, def]) => {
            if (def?.type !== 'tel') return;
            const countryKey = `${key}Country`;
            const numberValue = record[key];
            const countryValue = record[countryKey];
            record[key] = JSON.stringify({
              number: numberValue ?? '',
              country: typeof countryValue === 'string' ? countryValue : ''
            });
            delete record[countryKey];
          });
          return record;
        });
      });
    });

    return {
      ...block,
      values: parsedValues
    };
  }

  private loadApiOptionsForBlocks(): void {
    if (!this.blocks.length || !this.form) return;

    this.blocks.forEach((block) => {
      const categoriasSet = block.optionSets?.['categoriasNegocio'];
      if (!categoriasSet || categoriasSet.mode !== 'api') return;

      const fieldsUsingCategorias =
        (block.rows ?? [])
          .flatMap(r => r.fields ?? [])
          .filter(f => f.type === 'select' && f.optionsRef === 'categoriasNegocio');

      if (fieldsUsingCategorias.length === 0) return;

      const cacheKey = 'categoriasNegocio';

      if (!this.apiOptionsCache[cacheKey]) {
        this.apiOptionsCache[cacheKey] = this.catalogService.getCategoriasNegocio().pipe(
          map(CatalogMapping.MapCategoryResponseToOptionItems),
          shareReplay(1)
        );
      }

      fieldsUsingCategorias.forEach((field) => {
        const key = optionKey(block.code, field.name);

        const control = this.form.get([block.code, field.name]);
        const currentValue = control?.value;

        if (currentValue !== null && currentValue !== undefined && currentValue !== '') {
          this.pendingSelectValues[key] = currentValue;
          control?.setValue(null, { emitEvent: false });
        }

        this.apiOptionsCache[cacheKey].pipe(take(1)).subscribe({
          next: (options) => {
            this.optionsMap[key] = options;

            const pending = this.pendingSelectValues[key];
            if (pending !== undefined) {
              control?.setValue(pending, { emitEvent: false });
              delete this.pendingSelectValues[key];
            }
          },
          error: (err) => console.error('Error cargando categoriasNegocio', err)
        });
      });
    });
  }
}
