import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { FieldValidatorFactory } from '../utils/field-validator.factory';
import { getControl, getFieldOptions, optionKey, OptionValue, toggleOption } from '../utils';
import { SaveBlocksRequest } from '../services/request/save-blocks.request';
import { PayloadBuilder } from '../utils/payload.builder';
import {
  BlockUI,
  BusinessForm,
  BusinessFormBlock,
  FormField,
  FormRow,
  OptionSet
} from '../models/form-schema.model';
import {
  FieldArrayObjectComponent,
  FieldArrayPrimitiveComponent,
  FieldFileComponent,
  FieldInputComponent,
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
import { EMPTY, map, Observable, shareReplay, take, tap } from 'rxjs';
import { OptionItemInterface } from './interface/OptionItem.intreface';
import { CatalogMapping } from '../mapping/catalog/catalog.map';

type FieldDisplayType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox-grid'
  | 'array-checkbox-grid'
  | 'file'
  | 'domain-option'
  | 'opening-hours'
  | 'opening-hours-advanced'
  | 'location-map'
  | 'pill-multiselect'
  | 'productos-servicios'
  | 'checkbox'
  | 'array-object'
  | 'array-primitive';
type BlockField = FormField & {
  displayType: FieldDisplayType;
  colSpan: number;
  itemKeys?: string[];
  itemType?: FormField['type'];
};
type RowView = { num: number; fields: BlockField[] };
type FormValueParser = (value: unknown) => unknown;
type Primitive = string | number | boolean | null;
interface BlockView {
  code: string;
  title: string;
  description?: string;
  ui?: BlockUI;
  optionSets?: Record<string, OptionSet>;
  rows: RowView[];
  fieldCount: number;
  readOnly: boolean;
}

@Component({
  selector: 'app-dynamic-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FieldInputComponent,
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
    FieldOpeningHoursComponent,
    FieldOpeningHoursAdvancedComponent,
    FormSidebarComponent
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss'
})
export class DynamicFormComponent implements OnChanges {
  private readonly catalogService = inject(CatalogService);

  @Input({ required: true }) schema!: BusinessForm;
  @Input() readOnly = false;
  @Input() userRole?: string | null;
  @Output() submitForm = new EventEmitter<SaveBlocksRequest>();

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

  constructor(
    private fb: FormBuilder,
    private validatorFactory: FieldValidatorFactory
  ) {}

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

  emitDraft(): void {
    if (this.formReadOnly) return;
    if (!this.form) return;
    this.submitForm.emit(this.buildPayload());
  }

  private setupForm(): void {
    if (!this.schema?.blocks?.length) return;

    const group: Record<string, FormGroup> = {};
    this.optionsMap = {};
    this.valueParsers = {};

    const schemaBlocks = this.schema.blocks
      .filter((block) => this.isBlockVisible(block))
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

    this.blocks = schemaBlocks.map((block, index) => {
        const { rows, controls, fieldCount } = this.buildBlock(block);
        const blockReadOnly = this.isBlockReadOnly(block);
        group[block.code] = this.fb.group(controls);
        if (blockReadOnly) {
          group[block.code].disable({ emitEvent: false });
        }

        return {
          code: block.code,
          title: block.name || this.formatBlockLabel(block.code, index),
          description: block.description,
          ui: block.ui,
          optionSets: block.optionSets,
          rows,
          fieldCount,
          readOnly: blockReadOnly
        };
      });

    // Solo para pruebas: imprimir los campos requeridos detectados en el esquema
    const requiredFieldsSnapshot = collectRequiredFields(schemaBlocks);
    console.info('Campos requeridos detectados:', requiredFieldsSnapshot);

    this.form = this.fb.group(group);
    this.formReadOnly = this.readOnly || !this.blocks.some((block) => !block.readOnly);
    this.loadApiOptionsForBlocks();
  }

  private buildBlock(block: BusinessFormBlock): {
    rows: RowView[];
    controls: Record<string, AbstractControl>;
    fieldCount: number;
  } {
    const rows: RowView[] = [];
    const controls: Record<string, AbstractControl> = {};

    const rowsSource: FormRow[] = block.rows && block.rows.length > 0 ? block.rows : this.buildLegacyRows(block);
    const sortedRows = rowsSource.slice().sort((a, b) => (a.num ?? 0) - (b.num ?? 0));
    const hasLocationMap = sortedRows.some((row) => (row.fields ?? []).some((f) => this.isLocationMapField(f)));

    sortedRows.forEach((row) => {
      const defaultColSpan =
        row.fields?.length && row.fields.length > 0 ? Math.max(1, Math.floor(12 / row.fields.length)) : 12;
      const rowFields: BlockField[] = (row.fields ?? []).map((fieldDef) => {
        const rawValue = (block.values ?? {})[fieldDef.name];
        const { field, control, options, parser } = this.buildField(block, fieldDef, rawValue, defaultColSpan);
        const skipRender = hasLocationMap && this.isDireccionField(fieldDef);

        controls[field.name] = control;

        if (options) {
          this.optionsMap[optionKey(block.code, field.name)] = options;
        }
        if (parser) {
          this.valueParsers[optionKey(block.code, field.name)] = parser;
        }

        return skipRender ? null : field;
      }).filter((f): f is BlockField => !!f);

      rows.push({
        num: row.num,
        fields: rowFields
      });
    });

    // Use unique control names to avoid over-counting repeated fields (e.g., the same checkbox twice in the UI)
    const fieldCount = Object.keys(controls).length;

    return { rows, controls, fieldCount };
  }

  private buildField(
    block: BusinessFormBlock,
    fieldDef: FormField,
    rawValue: unknown,
    defaultColSpan: number
  ): { field: BlockField; control: AbstractControl; options?: OptionItemInterface[]; parser?: FormValueParser } {
    const isObjectArrayField = this.isObjectArrayField(fieldDef);
    const isPrimitiveArrayField = this.isPrimitiveArrayField(fieldDef);
    const isDomainOption = this.isDomainOptionField(fieldDef);
    const isAdvancedOpening = this.isAdvancedOpeningHoursField(fieldDef);
    const isLocationMap = this.isLocationMapField(fieldDef);
    let displayType: FieldDisplayType;

    if (isAdvancedOpening) {
      displayType = 'opening-hours-advanced';
    } else if (isLocationMap) {
      displayType = 'location-map';
    } else if (fieldDef.collection === 'array' && fieldDef.type === 'checkbox-group') {
      displayType = 'array-checkbox-grid';
    } else if (isObjectArrayField) {
      displayType = 'array-object';
    } else if (this.isProductosServiciosField(fieldDef)) {
      displayType = 'productos-servicios';
    } else if (this.isPillMultiselectField(fieldDef)) {
      displayType = 'pill-multiselect';
    } else if (isPrimitiveArrayField) {
      displayType = 'array-primitive';
    } else if (isDomainOption) {
      displayType = 'domain-option';
    } else {
      displayType = this.resolveDisplayType(fieldDef.type);
      if (fieldDef.collection === 'array' && displayType === 'text') displayType = 'textarea';
    }

    let colSpanSource = fieldDef.colSpan ?? defaultColSpan;
    if (isLocationMap) {
      colSpanSource = this.getDireccionColSpan(block) ?? colSpanSource;
    }

    const colSpan = Math.min(12, Math.max(1, colSpanSource));

    if (fieldDef.collection === 'array' && fieldDef.type === 'checkbox-group') {
      const control = this.fb.control(Array.isArray(rawValue) ? rawValue : []);
      const options = this.resolveOptions(block, fieldDef, rawValue, displayType);
      if (options) {
        this.optionsMap[optionKey(block.code, fieldDef.name)] = options;
      }
      const field: BlockField = {
        ...fieldDef,
        displayType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control };
    }

    if (this.isProductosServiciosField(fieldDef)) {
      const control = this.buildPrimitiveArrayControl(fieldDef, rawValue);
      const field: BlockField = {
        ...fieldDef,
        displayType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control };
    }

    if (isObjectArrayField) {
      const { control, itemKeys } = this.buildArrayObjectControl(fieldDef, rawValue);
      const field: BlockField = {
        ...fieldDef,
        displayType,
        colSpan,
        itemKeys,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control };
    }

    if (isPrimitiveArrayField) {
      const control = this.buildPrimitiveArrayControl(fieldDef, rawValue);
      const itemType = fieldDef.type;
      const itemDisplayType = this.resolveDisplayType(itemType);
      const options = this.resolveOptions(block, fieldDef, rawValue, itemDisplayType);
      if (options) {
        this.optionsMap[optionKey(block.code, fieldDef.name)] = options;
      }
      const field: BlockField = {
        ...fieldDef,
        displayType,
        itemType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control };
    }

    const { value, parser } = this.normalizeValue(block.code, fieldDef, rawValue, displayType);
    const options = this.resolveOptions(block, fieldDef, rawValue, displayType);

    const field: BlockField = {
      ...fieldDef,
      displayType,
      colSpan,
      rows: displayType === 'textarea' ? fieldDef.rows ?? this.textAreaRows(rawValue) : fieldDef.rows,
      label: fieldDef.label || this.toLabel(fieldDef.name)
    };

    const validators = this.validatorFactory.build(fieldDef, {
      requiredValidator: fieldDef.type === 'opening_hours' ? this.openingHoursRequiredValidator() : undefined
    });

    const control = this.fb.control(value, validators);

    return { field, control, options, parser };
  }

  private resolveDisplayType(type: string): FieldDisplayType {
    if (type === 'object') return 'textarea';
    if (type === 'opening_hours') return 'opening-hours';
    if (type === 'location-map') return 'location-map';
    if (type === 'checkbox-group') return 'checkbox-grid';
    if (type === 'file') return 'file';
    if (type === 'textarea') return 'textarea';
    if (type === 'select') return 'select';
    if (type === 'checkbox') return 'checkbox';
    return 'text';
  }

  private buildLegacyRows(block: BusinessFormBlock): FormRow[] {
    const values = block.values ?? {};
    return [
      {
        num: 1,
        fields: Object.keys(values).map((name) => ({
          name,
          label: this.toLabel(name),
          type: this.guessTypeFromValue(values[name])
        }))
      }
    ];
  }

  private guessTypeFromValue(value: unknown): FieldDisplayType {
    if (typeof value === 'boolean') return 'checkbox';
    if (Array.isArray(value)) return 'textarea';
    if (value && typeof value === 'object') return 'textarea';
    if (typeof value === 'string' && value.length > 120) return 'textarea';
    return 'text';
  }

  private normalizeValue(
    blockCode: string,
    field: FormField,
    rawValue: unknown,
    displayType: FieldDisplayType
  ): { value: unknown; parser?: FormValueParser } {
    const isArrayCollection = field.collection === 'array';

    if (field.type === 'opening_hours') {
      return { value: this.normalizeOpeningHours(field, rawValue) };
    }

    // Arrays for checkbox groups
    if (displayType === 'checkbox-grid') {
      const value = Array.isArray(rawValue) ? rawValue : [];
      return { value };
    }

    if (displayType === 'location-map') {
      const value = typeof rawValue === 'string' ? rawValue : '';
      return { value };
    }

    // Arrays sin UI específica: editar como texto/JSON para no perder estructura
    if (isArrayCollection) {
      const stringValue = this.stringifyValue(rawValue ?? []);
      return {
        value: stringValue,
        parser: (value) => this.parseJson(value, blockCode, field.name)
      };
    }

    // Booleans for checkbox
    if (displayType === 'checkbox') {
      const value = typeof rawValue === 'boolean' ? rawValue : !!rawValue;
      return { value };
    }

    // Objects/arrays rendered como texto JSON
    if (field.type === 'object' || (rawValue && typeof rawValue === 'object')) {
      const stringValue = this.stringifyValue(rawValue ?? (isArrayCollection ? [] : {}));
      return {
        value: stringValue,
        parser: (value) => this.parseJson(value, blockCode, field.name)
      };
    }

    // Long strings -> textarea para mejor UX
    if (typeof rawValue === 'string' && rawValue.length > 120) {
      return { value: rawValue, parser: undefined };
    }

    if (rawValue === undefined || rawValue === null) {
      if (isArrayCollection) return { value: [] };
      return { value: '' };
    }

    return { value: rawValue };
  }

  private normalizeOpeningHours(field: FormField, rawValue: unknown): Record<string, Record<string, string>> {
    const schema = field.schema as { dias?: string[]; campos?: string[] } | undefined;
    const dias = schema?.dias ?? [];
    const campos = schema?.campos ?? ['abre', 'cierra'];
    const base: Record<string, Record<string, string>> = {};
    dias.forEach((dia) => {
      base[dia] = {};
      campos.forEach((c) => {
        base[dia][c] = '';
      });
    });

    if (rawValue && typeof rawValue === 'object') {
      const incoming = rawValue as Record<string, Record<string, string>>;
      Object.keys(incoming).forEach((dia) => {
        base[dia] = { ...base[dia], ...(incoming[dia] ?? {}) };
      });
    }

    return base;
  }

  private resolveOptions(
    block: BusinessFormBlock,
    field: FormField,
    rawValue: unknown,
    displayType: FieldDisplayType
  ): OptionItemInterface[] | undefined {
    if (displayType === 'array-primitive') {
      return undefined;
    }

    if (displayType === 'checkbox') {
      return [
        { value: true, label: 'Sí' },
        { value: false, label: 'No' }
      ];
    }

    if (!field.optionsRef) {
      return undefined;
    }

    const optionSet: OptionSet | undefined = block.optionSets?.[field.optionsRef];

    if (optionSet?.mode === 'static' && optionSet.items?.length) {
      return optionSet.items;
    }

    if (optionSet?.mode === 'api') {
      // Fallback: si ya existe un valor, lo usamos como opción preliminar
      const fallbackOptions = this.toOptionsFromValue(rawValue);
      if (fallbackOptions.length) return fallbackOptions;
    }

    return optionSet?.items ?? this.toOptionsFromValue(rawValue);
  }

  private toOptionsFromValue(value: unknown): OptionItemInterface[] {
    if (Array.isArray(value)) {
      return value
        .filter((v) => this.isPrimitive(v))
        .map((v) => ({
          value: v as Primitive,
          label: String(v)
        }));
    }

    if (this.isPrimitive(value)) {
      return [
        {
          value: value as Primitive,
          label: String(value)
        }
      ];
    }

    return [];
  }

  private openingHoursRequiredValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as Record<string, Record<string, string>> | null | undefined;
      if (!value) return { required: true };
      const hasValue = Object.values(value).some((dia) =>
        Object.values(dia || {}).some((v) => (typeof v === 'string' ? v.trim() !== '' : !!v))
      );
      return hasValue ? null : { required: true };
    };
  }

  private isObjectArrayField(field: FormField): boolean {
    return field.collection === 'array' && field.type === 'object';
  }

  private isPrimitiveArrayField(field: FormField): boolean {
    return (
      field.collection === 'array' &&
      field.type !== 'object' &&
      field.type !== 'checkbox-group' &&
      !this.isPillMultiselectField(field) &&
      !this.isProductosServiciosField(field)
    );
  }

  private isDomainOptionField(field: FormField): boolean {
    return field.collection !== 'array' && /^dominio\d*$/.test(field.name ?? '') && field.type === 'text';
  }

  private isPillMultiselectField(field: FormField): boolean {
    return field.collection === 'array' && field.type === 'checkbox-group' && field.name !== 'productosServicios';
  }

  private isProductosServiciosField(field: FormField): boolean {
    return field.name === 'productosServicios' && field.collection === 'array';
  }

  private isAdvancedOpeningHoursField(field: FormField): boolean {
    return field.name === 'horariosPersonalizados' && field.collection === 'array' && field.type === 'object';
  }

  private isLocationMapField(field: FormField): boolean {
    return field.name === 'coordenadas' && field.type === 'text' && field.collection !== 'array';
  }

  private isDireccionField(field: FormField): boolean {
    return field.name === 'direccion';
  }

  private getDireccionColSpan(block: BusinessFormBlock): number | undefined {
    for (const row of block.rows || []) {
      for (const field of row.fields || []) {
        if (field.name === 'direccion' && field.colSpan) {
          return field.colSpan;
        }
      }
    }
    return undefined;
  }

  private buildArrayObjectControl(
    field: FormField,
    rawValue: unknown
  ): { control: FormArray<FormGroup>; itemKeys: string[] } {
    const { items, keys } = this.normalizeObjectArray(rawValue, field);
    const groups = items.map((item) => this.buildObjectGroup(keys, field, item));
    const control = this.fb.array(groups.length ? groups : [this.buildObjectGroup(keys, field, {})]);
    return { control, itemKeys: keys };
  }

  private buildObjectGroup(keys: string[], field: FormField, value: Record<string, unknown>): FormGroup {
    const schema = field.itemSchema ?? {};
    const controls: Record<string, FormControl> = {};

    keys.forEach((key) => {
      const fieldSchema = schema[key];
      const validators = fieldSchema?.required ? [Validators.required] : [];
      controls[key] = this.fb.control(this.coercePrimitive(value?.[key]), validators);
    });

    return this.fb.group(controls);
  }

  private buildPrimitiveArrayControl(field: FormField, rawValue: unknown): FormArray<FormControl> {
    const validators = field.required ? [Validators.required] : [];
    const values: unknown[] = Array.isArray(rawValue) ? rawValue : [];
    const controls = values.length
      ? values.map((v) => this.fb.control(this.coercePrimitiveArrayValue(field, v), validators))
      : [this.fb.control(this.defaultPrimitiveArrayValue(field), validators)];
    return this.fb.array(controls);
  }

  private defaultPrimitiveArrayValue(field: FormField): Primitive | '' {
    if (field.type === 'checkbox' || field.type === 'checkbox-group') return false;
    if (field.type === 'file') return null;
    return '';
  }

  private coercePrimitiveArrayValue(field: FormField, value: unknown): unknown {
    if (field.type === 'file') return value ?? null;
    return this.coercePrimitive(value);
  }

  private normalizeObjectArray(
    rawValue: unknown,
    field: FormField
  ): {
    items: Record<string, unknown>[];
    keys: string[];
  } {
    let parsed: unknown = rawValue;

    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          parsed = [];
        }
      }
    }

    let items: unknown[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === 'object') {
      items = [parsed];
    }

    const safeItems = items
      .map((item) => (item && typeof item === 'object' ? item : {}))
      .map((item) => ({ ...(item as Record<string, unknown>) }));

    const keySet = new Set<string>(Object.keys(field.itemSchema ?? {}));
    safeItems.forEach((item) => {
      Object.keys(item).forEach((k) => keySet.add(k));
    });
    if (keySet.size === 0) {
      ['nombreSucursal', 'telefonoSucursal', 'direccionSucursal'].forEach((k) => keySet.add(k));
    }
    if (!safeItems.length) safeItems.push({});

    return { items: safeItems, keys: Array.from(keySet) };
  }

  private coercePrimitive(value: unknown): string | number | boolean | null {
    if (value === undefined) return '';
    if (value === null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private stringifyValue(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private parseJson(value: unknown, blockCode: string, fieldName: string): unknown {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.warn(`No se pudo parsear JSON para ${blockCode}.${fieldName}`, error);
      return value;
    }
  }

  private textAreaRows(rawValue: unknown): number {
    const value =
      typeof rawValue === 'string' ? rawValue : rawValue ? this.stringifyValue(rawValue) : '';
    const lines = value.split('\n').length;
    return Math.min(12, Math.max(3, lines + 1));
  }

  private toLabel(raw: string): string {
    return raw
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (c) => c.toUpperCase());
  }

  private formatBlockLabel(code: string, index: number): string {
    const label = this.toLabel(code);
    return label || `Bloque ${index + 1}`;
  }

  private isPrimitive(value: unknown): value is Primitive | undefined {
    return ['string', 'number', 'boolean', 'undefined'].includes(typeof value) || value === null;
  }

  private buildPayload(): SaveBlocksRequest {
    const builder = new PayloadBuilder(
      this.schema.actorType || this.fallbackActorType,
      this.schema.actorId || this.fallbackActorId
    );

    return builder.withBlocks(this.getBlocksWithCurrentValues()).build();
  }

  private isBlockReadOnly(block: BusinessFormBlock): boolean {
    if (this.readOnly) return true;
    const roles = block.readOnlyRoles ?? [];
    if (!roles.length || !this.userRole) return false;
    return roles.includes(this.userRole);
  }

  private isBlockVisible(block: BusinessFormBlock): boolean {
    const visibility = block.visibility;
    if (!visibility || Object.keys(visibility).length === 0) return true;
    if (!this.userRole) return true;
    return visibility[this.userRole] !== false;
  }

  private getBlocksWithCurrentValues(): BusinessFormBlock[] {
    if (!this.schema?.blocks || !this.form) return [];

    return this.schema.blocks.map((block) => {
      const rawValues = (this.form.get(block.code) as FormGroup)?.value ?? {};
      const parsedValues: Record<string, unknown> = {};

      Object.entries(rawValues).forEach(([name, value]) => {
        const parser = this.valueParsers[optionKey(block.code, name)];
        parsedValues[name] = parser ? parser(value) : value;
      });

      return {
        ...block,
        values: parsedValues
      };
    });
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
