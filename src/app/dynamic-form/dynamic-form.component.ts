import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { canFinalizeForm, getControl, getFieldOptions, optionKey, OptionValue, toggleOption } from '../utils';
import { SaveBlocksRequest } from '../services/request/save-blocks.request';
import { PayloadBuilder } from '../utils/payload.builder';
import { BusinessForm, BusinessFormBlock, FormStatus } from '../models/form-schema.model';
import {
  FieldArrayObjectComponent,
  FieldArrayPrimitiveComponent,
  FieldFileComponent,
  FieldInputComponent,
  FieldUrlComponent,
  FieldPhoneComponent,
  FieldDomainOptionComponent,
  FieldOpeningHoursComponent,
  FieldOpeningHoursAdvancedComponent,
  FieldLocationMapComponent,
  FieldPillMultiselectComponent,
  FieldProductosServiciosComponent,
  FieldMultiselectComponent,
  FieldSelectComponent,
  FieldTextareaComponent
} from '../components';
import { FormSidebarComponent } from '../components/form-sidebar/form-sidebar.component';
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

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FieldInputComponent,
    FieldUrlComponent,
    FieldTextareaComponent,
    FieldSelectComponent,
    FieldMultiselectComponent,
    FieldFileComponent,
    FieldDomainOptionComponent,
    FieldLocationMapComponent,
    FieldPillMultiselectComponent,
    FieldProductosServiciosComponent,
    FieldArrayObjectComponent,
    FieldArrayPrimitiveComponent,
    FieldPhoneComponent,
    FieldOpeningHoursComponent,
    FieldOpeningHoursAdvancedComponent,
    FormSidebarComponent
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

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema']?.currentValue) {
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
        html: detail,
        confirmButtonText: 'Entendido'
      });

      return;
    }

    if (this.form.valid) {
      this.submitForm.emit(this.buildPayload());
    }
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
        html: detail,
        confirmButtonText: 'Entendido'
      });

      return;
    }

    if (this.form.valid) {
      this.finalizeForm.emit(this.buildPayload());
    }
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

    const missingRequired = findMissingRequiredFields([blockWithValues]);
    if (missingRequired.length) {
      const detail = missingRequired
        .map((item) => `${item.blockName || item.blockCode}: ${item.label || item.fieldName}`)
        .join('<br>');

      Swal.fire({
        icon: 'warning',
        title: 'Faltan campos obligatorios',
        html: detail,
        confirmButtonText: 'Entendido'
      });

      return;
    }

    if (!blockGroup?.valid) return;

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

    const missingRequired = findMissingRequiredFields([blockWithValues]);
    if (missingRequired.length) {
      const detail = missingRequired
        .map((item) => `${item.blockName || item.blockCode}: ${item.label || item.fieldName}`)
        .join('<br>');

      Swal.fire({
        icon: 'warning',
        title: 'Faltan campos obligatorios',
        html: detail,
        confirmButtonText: 'Entendido'
      });

      return;
    }

    if (blockGroup?.valid) {
      this.submitForm.emit(this.buildPayloadForBlocks([blockWithValues]));
    }
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
