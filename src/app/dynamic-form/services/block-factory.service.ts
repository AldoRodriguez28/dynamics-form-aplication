import { Injectable } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { FieldValidatorFactory } from '../../utils/field-validator.factory';
import { optionKey } from '../../utils';
import {
  BlockUI,
  BusinessFormBlock,
  FormField,
  FormRow,
  OptionSet
} from '../../models/form-schema.model';
import { OptionItemInterface } from '../interface/OptionItem.intreface';

export type FieldDisplayType =
  | 'text'
  | 'url'
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
  | 'phones'
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
type Primitive = string | number | boolean | null;
export type FormValueParser = (value: unknown) => unknown;

export interface BlockView {
  code: string;
  title: string;
  description?: string;
  ui?: BlockUI;
  optionSets?: Record<string, OptionSet>;
  rows: RowView[];
  fieldCount: number;
  readOnly: boolean;
}

export interface BuildBlockResult {
  view: BlockView;
  controls: Record<string, AbstractControl>;
  optionsMap: Record<string, OptionItemInterface[]>;
  valueParsers: Record<string, FormValueParser>;
}

@Injectable({ providedIn: 'root' })
export class BlockFactoryService {
  constructor(
    private fb: FormBuilder,
    private validatorFactory: FieldValidatorFactory
  ) {}

  buildBlock(block: BusinessFormBlock, index: number, readOnly: boolean): BuildBlockResult {
    const { rows, controls, fieldCount, optionsMap, valueParsers } = this.buildBlockFields(block);
    const view: BlockView = {
      code: block.code,
      title: block.name || this.formatBlockLabel(block.code, index),
      description: block.description,
      ui: block.ui,
      optionSets: block.optionSets,
      rows,
      fieldCount,
      readOnly
    };

    return { view, controls, optionsMap, valueParsers };
  }

  private buildBlockFields(block: BusinessFormBlock): {
    rows: RowView[];
    controls: Record<string, AbstractControl>;
    fieldCount: number;
    optionsMap: Record<string, OptionItemInterface[]>;
    valueParsers: Record<string, FormValueParser>;
  } {
    const rows: RowView[] = [];
    const controls: Record<string, AbstractControl> = {};
    const optionsMap: Record<string, OptionItemInterface[]> = {};
    const valueParsers: Record<string, FormValueParser> = {};

    const rowsSource: FormRow[] = block.rows && block.rows.length > 0 ? block.rows : this.buildLegacyRows(block);
    const sortedRows = rowsSource.slice().sort((a, b) => (a.num ?? 0) - (b.num ?? 0));
    const hasLocationMap = sortedRows.some((row) => (row.fields ?? []).some((f) => this.isLocationMapField(f)));

    sortedRows.forEach((row) => {
      const defaultColSpan =
        row.fields?.length && row.fields.length > 0 ? Math.max(1, Math.floor(12 / row.fields.length)) : 12;
      const rowFields: BlockField[] = (row.fields ?? [])
        .map((fieldDef) => {
          const rawValue = (block.values ?? {})[fieldDef.name];
          const { field, control, options, parser } = this.buildField(block, fieldDef, rawValue, defaultColSpan);
          const skipRender = hasLocationMap && this.isDireccionField(fieldDef);

          controls[field.name] = control;

          if (options) {
            optionsMap[optionKey(block.code, field.name)] = options;
          }
          if (parser) {
            valueParsers[optionKey(block.code, field.name)] = parser;
          }

          return skipRender ? null : field;
        })
        .filter((f): f is BlockField => !!f);

      rows.push({
        num: row.num,
        fields: rowFields
      });
    });

    const fieldCount = Object.keys(controls).length;

    return { rows, controls, fieldCount, optionsMap, valueParsers };
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
    const isPhonesField = this.isPhonesField(fieldDef);
    let displayType: FieldDisplayType;

    if (isAdvancedOpening) {
      displayType = 'opening-hours-advanced';
    } else if (isLocationMap) {
      displayType = 'location-map';
    } else if (fieldDef.collection === 'array' && fieldDef.type === 'checkbox-group') {
      displayType = 'array-checkbox-grid';
    } else if (isPhonesField) {
      displayType = 'phones';
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
      const field: BlockField = {
        ...fieldDef,
        displayType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control, options };
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

    if (isPhonesField) {
      const control = this.buildPhoneArrayControl(fieldDef, rawValue);
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
      const field: BlockField = {
        ...fieldDef,
        displayType,
        itemType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control, options };
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
    if (fieldDef.type === 'opening_hours') {
      validators.push(this.openingHoursOrderValidator());
    }

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
    if (type === 'url') return 'url';
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

    if (displayType === 'checkbox-grid') {
      const value = Array.isArray(rawValue) ? rawValue : [];
      return { value };
    }

    if (displayType === 'location-map') {
      const value = typeof rawValue === 'string' ? rawValue : '';
      return { value };
    }

    if (isArrayCollection) {
      const stringValue = this.stringifyValue(rawValue ?? []);
      return {
        value: stringValue,
        parser: (value) => this.parseJson(value, blockCode, field.name)
      };
    }

    if (displayType === 'checkbox') {
      const value = typeof rawValue === 'boolean' ? rawValue : !!rawValue;
      return { value };
    }

    if (field.type === 'object' || (rawValue && typeof rawValue === 'object')) {
      const stringValue = this.stringifyValue(rawValue ?? (isArrayCollection ? [] : {}));
      return {
        value: stringValue,
        parser: (value) => this.parseJson(value, blockCode, field.name)
      };
    }

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

  private openingHoursOrderValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as Record<string, Record<string, string>> | null | undefined;
      if (!value) return null;

      for (const dia of Object.values(value)) {
        const abre = dia?.['abre'];
        const cierra = dia?.['cierra'];
        if (!this.hasTimeValue(abre) || !this.hasTimeValue(cierra)) continue;

        const start = this.timeToMinutes(abre);
        const end = this.timeToMinutes(cierra);
        if (start === null || end === null || start >= end) {
          return { openingHoursOrder: true };
        }
      }

      return null;
    };
  }

  private openingHoursAdvancedValidator(timeKeys: string[]): ValidatorFn {
    return (control: AbstractControl) => {
      const group = control as FormGroup | null;
      if (!group) return null;

      for (let i = 0; i < timeKeys.length - 1; i += 1) {
        const current = group.get(timeKeys[i])?.value;
        const next = group.get(timeKeys[i + 1])?.value;
        if (!this.hasTimeValue(current) || !this.hasTimeValue(next)) continue;

        const currentMinutes = this.timeToMinutes(current);
        const nextMinutes = this.timeToMinutes(next);
        if (currentMinutes === null || nextMinutes === null || currentMinutes >= nextMinutes) {
          return { openingHoursOrder: true };
        }
      }

      return null;
    };
  }

  private hasTimeValue(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
  }

  private timeToMinutes(value: string): number | null {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours * 60 + minutes;
  }

  private getAdvancedTimeSequence(keys: string[], field: FormField): string[] {
    const schema = field.itemSchema ?? {};
    const schemaTimeKeys = Object.keys(schema).filter((key) => schema[key]?.type === 'time');
    const base = schemaTimeKeys.length ? schemaTimeKeys : keys.filter((key) => key !== 'dia');
    const preferred = ['abre', 'comidaSale', 'comidaRegresa', 'cierra'];
    const ordered = preferred.filter((key) => base.includes(key));
    const remaining = base.filter((key) => !preferred.includes(key));
    return [...ordered, ...remaining];
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

  private isPhonesField(field: FormField): boolean {
    if (field.collection !== 'array') return false;
    const widget = (field.widget || '').toLowerCase();
    if (widget === 'phones' || widget === 'telefonos' || widget === 'phone') return true;

    if (field.type === 'tel') return true;
    if (field.type !== 'object') return false;

    const schema = field.itemSchema ?? {};
    const hasNumero = Object.prototype.hasOwnProperty.call(schema, 'numero');
    const hasTelType = Object.values(schema).some((item) => item?.type === 'tel');
    return hasNumero && hasTelType;
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

  private buildPhoneArrayControl(field: FormField, rawValue: unknown): FormArray<FormGroup> {
    const schema = field.itemSchema ?? {};
    const includeTipo = Object.prototype.hasOwnProperty.call(schema, 'tipo');
    const keys = includeTipo ? ['tipo', 'numero', 'country'] : ['numero', 'country'];

    const normalizeCountry = (value: unknown): '' | 'MX' | 'US' => {
      const normalized =
        typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : '';
      if (normalized === 'US') return 'US';
      if (normalized === 'MX') return 'MX';
      return '';
    };

    let items: Record<string, unknown>[] = [];
    if (Array.isArray(rawValue)) {
      const hasObject = rawValue.some((item) => item && typeof item === 'object');
      if (hasObject) {
        items = this.normalizeObjectArray(rawValue, field).items;
      } else {
        items = rawValue.map((value) => ({ numero: value }));
      }
    } else if (rawValue && typeof rawValue === 'object') {
      items = this.normalizeObjectArray(rawValue, field).items;
    }
    if (!items.length) items = [{}];

    const groups = items.map((item) => {
      const originalCountry = (item as Record<string, unknown>)?.['country'];
      const normalizedCountry = normalizeCountry(originalCountry);
      return this.buildObjectGroup(keys, field, {
        ...item,
        country: normalizedCountry
      });
    });

    const formArray = this.fb.array(
      groups.length ? groups : [this.buildObjectGroup(keys, field, {})]
    );

    formArray.controls.forEach((group, index) => {
      const country = normalizeCountry((items[index] as Record<string, unknown>)?.['country']);
      group.get('country')?.setValue(country, { emitEvent: false });
    });

    return formArray;
  }

  private buildObjectGroup(keys: string[], field: FormField, value: Record<string, unknown>): FormGroup {
    const schema = field.itemSchema ?? {};
    const controls: Record<string, FormControl> = {};

    keys.forEach((key) => {
      const fieldSchema = schema[key];
      const validators = fieldSchema?.required ? [Validators.required] : [];
      controls[key] = this.fb.control(this.coercePrimitive(value?.[key]), validators);
    });

    const validators = this.isAdvancedOpeningHoursField(field)
      ? [this.openingHoursAdvancedValidator(this.getAdvancedTimeSequence(keys, field))]
      : [];

    return this.fb.group(controls, { validators });
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
}
