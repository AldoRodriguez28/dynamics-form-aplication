import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { getControl, getFieldOptions, optionKey, OptionValue, toggleOption } from '../utils';
import {
  BlockUI,
  BusinessForm,
  BusinessFormBlock,
  FormField,
  FormRow,
  OptionItem,
  OptionSet
} from '../models/form-schema.model';
import {
  FieldArrayObjectComponent,
  FieldArrayCheckboxGroupComponent,
  FieldArrayPrimitiveComponent,
  FieldCheckboxGridComponent,
  FieldFileComponent,
  FieldInputComponent,
  FieldOpeningHoursComponent,
  FieldMultiselectComponent,
  FieldSelectComponent,
  FieldTextareaComponent
} from '../components';

type FieldDisplayType =
  | 'text'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox-grid'
  | 'array-checkbox-grid'
  | 'file'
  | 'opening-hours'
  | 'checkbox'
  | 'array-object'
  | 'array-primitive';
type BlockField = FormField & {
  type: FieldDisplayType;
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
    FieldCheckboxGridComponent,
    FieldFileComponent,
    FieldArrayCheckboxGroupComponent,
    FieldArrayObjectComponent,
    FieldArrayPrimitiveComponent,
    FieldOpeningHoursComponent
  ],
  templateUrl: './dynamic-form.component.html',
  styleUrl: './dynamic-form.component.scss'
})
export class DynamicFormComponent implements OnChanges {
  @Input({ required: true }) schema!: BusinessForm;
  @Output() submitForm = new EventEmitter<Record<string, unknown>>();

  form!: FormGroup;
  blocks: BlockView[] = [];
  optionsMap: Record<string, OptionItem[]> = {};
  valueParsers: Record<string, FormValueParser> = {};
  getControl = getControl;

  constructor(private fb: FormBuilder) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['schema']?.currentValue) {
      this.setupForm();
    }
  }

  private setupForm(): void {
    if (!this.schema?.blocks?.length) return;

    const group: Record<string, FormGroup> = {};
    this.optionsMap = {};
    this.valueParsers = {};

    this.blocks = this.schema.blocks
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((block, index) => {
        const { rows, controls, fieldCount } = this.buildBlock(block);
        group[block.code] = this.fb.group(controls);

        return {
          code: block.code,
          title: block.name || this.formatBlockLabel(block.code, index),
          description: block.description,
          ui: block.ui,
          optionSets: block.optionSets,
          rows,
          fieldCount
        };
      });

    this.form = this.fb.group(group);
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

    sortedRows.forEach((row) => {
      const defaultColSpan =
        row.fields?.length && row.fields.length > 0 ? Math.max(1, Math.floor(12 / row.fields.length)) : 12;
      const rowFields: BlockField[] = (row.fields ?? []).map((fieldDef) => {
        const rawValue = (block.values ?? {})[fieldDef.name];
        const { field, control, options, parser } = this.buildField(block, fieldDef, rawValue, defaultColSpan);

        controls[field.name] = control;

        if (options) {
          this.optionsMap[optionKey(block.code, field.name)] = options;
        }
        if (parser) {
          this.valueParsers[optionKey(block.code, field.name)] = parser;
        }

        return field;
      });

      rows.push({
        num: row.num,
        fields: rowFields
      });
    });

    const fieldCount = rows.reduce((acc, row) => acc + row.fields.length, 0);

    return { rows, controls, fieldCount };
  }

  private buildField(
    block: BusinessFormBlock,
    fieldDef: FormField,
    rawValue: unknown,
    defaultColSpan: number
  ): { field: BlockField; control: AbstractControl; options?: OptionItem[]; parser?: FormValueParser } {
    const isObjectArrayField = this.isObjectArrayField(fieldDef);
    const isPrimitiveArrayField = this.isPrimitiveArrayField(fieldDef);
    let displayType: FieldDisplayType;

    if (fieldDef.collection === 'array' && fieldDef.type === 'checkbox-group') {
      displayType = 'array-checkbox-grid';
    } else if (isObjectArrayField) {
      displayType = 'array-object';
    } else if (isPrimitiveArrayField) {
      displayType = 'array-primitive';
    } else {
      displayType = this.resolveDisplayType(fieldDef.type);
      if (fieldDef.collection === 'array' && displayType === 'text') displayType = 'textarea';
    }

    const colSpan = Math.min(12, Math.max(1, fieldDef.colSpan ?? defaultColSpan));

    if (fieldDef.collection === 'array' && fieldDef.type === 'checkbox-group') {
      const control = this.fb.control(Array.isArray(rawValue) ? rawValue : []);
      const options = this.resolveOptions(block, fieldDef, rawValue, displayType);
      if (options) {
        this.optionsMap[optionKey(block.code, fieldDef.name)] = options;
      }
      const field: BlockField = {
        ...fieldDef,
        type: displayType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control };
    }

    if (isObjectArrayField) {
      const { control, itemKeys } = this.buildArrayObjectControl(fieldDef, rawValue);
      const field: BlockField = {
        ...fieldDef,
        type: displayType,
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
        type: displayType,
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
      type: displayType,
      colSpan,
      rows: displayType === 'textarea' ? fieldDef.rows ?? this.textAreaRows(rawValue) : fieldDef.rows,
      label: fieldDef.label || this.toLabel(fieldDef.name)
    };

    const control = this.fb.control(value, fieldDef.required ? Validators.required : []);

    return { field, control, options, parser };
  }

  private resolveDisplayType(type: string): FieldDisplayType {
    if (type === 'object') return 'textarea';
    if (type === 'opening_hours') return 'opening-hours';
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
  ): OptionItem[] | undefined {
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

  private toOptionsFromValue(value: unknown): OptionItem[] {
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

  private isObjectArrayField(field: FormField): boolean {
    return field.collection === 'array' && field.type === 'object';
  }

  private isPrimitiveArrayField(field: FormField): boolean {
    return field.collection === 'array' && field.type !== 'object' && field.type !== 'checkbox-group';
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

  onCheckboxToggle(blockCode: string, fieldName: string, payload: { value: OptionValue; checked: boolean }): void {
    toggleOption(this.form.get([blockCode, fieldName]), payload);
  }

  getOptions(blockCode: string, fieldName: string): OptionItem[] {
    return getFieldOptions(this.optionsMap, blockCode, fieldName);
  }

  getArrayControl(blockCode: string, name: string): FormArray {
    return this.form.get([blockCode, name]) as FormArray;
  }

  onSubmit(): void {
    if (!this.form) return;
    this.form.markAllAsTouched();
    if (this.form.valid) {
      this.submitForm.emit(this.buildPayload());
    }
  }

  emitDraft(): void {
    if (!this.form) return;
    this.submitForm.emit(this.buildPayload());
  }

  private buildPayload(): Record<string, unknown> {
    const blocks = this.blocks.map((block) => {
      const rawValues = (this.form.get(block.code) as FormGroup)?.value ?? {};
      const parsedValues: Record<string, unknown> = {};

      Object.entries(rawValues).forEach(([name, value]) => {
        const parser = this.valueParsers[optionKey(block.code, name)];
        parsedValues[name] = parser ? parser(value) : value;
      });

      return {
        code: block.code,
        values: parsedValues
      };
    });

    return {
      actorType: this.schema.actorType,
      actorId: this.schema.actorId,
      blocks
    };
  }
}
