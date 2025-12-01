import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  BlockUI,
  BusinessForm,
  BusinessFormBlock,
  FormField,
  FormRow,
  OptionItem,
  OptionSet
} from '../models/form-schema.model';
import { FieldInputComponent } from '../components/field-input/field-input.component';
import { FieldTextareaComponent } from '../components/field-textarea/field-textarea.component';
import { FieldSelectComponent } from '../components/field-select/field-select.component';
import { FieldMultiselectComponent } from '../components/field-multiselect/field-multiselect.component';
import { FieldCheckboxGridComponent } from '../components/field-checkbox-grid/field-checkbox-grid.component';
import { FieldFileComponent } from '../components/field-file/field-file.component';

type FieldDisplayType = 'text' | 'textarea' | 'select' | 'multiselect' | 'checkbox-grid' | 'file' | 'checkbox';
type BlockField = FormField & { type: FieldDisplayType; colSpan: number };
type RowView = { num: number; fields: BlockField[] };
type FormValueParser = (value: unknown) => unknown;
type OptionValue = OptionItem['value'];
type Primitive = string | number | boolean | null;
interface BlockView {
  code: string;
  title: string;
  description?: string;
  ui?: BlockUI;
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
    FieldFileComponent
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
          rows,
          fieldCount
        };
      });

    this.form = this.fb.group(group);
  }

  private buildBlock(block: BusinessFormBlock): {
    rows: RowView[];
    controls: Record<string, FormControl>;
    fieldCount: number;
  } {
    const rows: RowView[] = [];
    const controls: Record<string, FormControl> = {};

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
          this.optionsMap[this.optionKey(block.code, field.name)] = options;
        }
        if (parser) {
          this.valueParsers[this.optionKey(block.code, field.name)] = parser;
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
  ): { field: BlockField; control: FormControl; options?: OptionItem[]; parser?: FormValueParser } {
    let displayType = this.resolveDisplayType(fieldDef.type);
    if (fieldDef.collection === 'array' && displayType === 'text') {
      displayType = 'textarea';
    }
    const colSpan = Math.min(12, Math.max(1, fieldDef.colSpan ?? defaultColSpan));
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
    if (type === 'object' || type === 'opening_hours') return 'textarea';
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
    if (
      field.type === 'object' ||
      field.type === 'opening_hours' ||
      (rawValue && typeof rawValue === 'object')
    ) {
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

  private resolveOptions(
    block: BusinessFormBlock,
    field: FormField,
    rawValue: unknown,
    displayType: FieldDisplayType
  ): OptionItem[] | undefined {
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

  private optionKey(blockCode: string, fieldName: string): string {
    return `${blockCode}.${fieldName}`;
  }

  private isPrimitive(value: unknown): value is Primitive | undefined {
    return ['string', 'number', 'boolean', 'undefined'].includes(typeof value) || value === null;
  }

  onCheckboxToggle(blockCode: string, fieldName: string, payload: { value: OptionValue; checked: boolean }): void {
    const control = this.form.get([blockCode, fieldName]);
    if (!control) return;
    const current: OptionValue[] = Array.isArray(control.value) ? control.value : [];
    const next = payload.checked
      ? [...current, payload.value]
      : current.filter((v) => v !== payload.value);
    control.setValue(next);
  }

  getControl(blockCode: string, name: string): FormControl {
    return this.form.get([blockCode, name]) as FormControl;
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
        const parser = this.valueParsers[this.optionKey(block.code, name)];
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
