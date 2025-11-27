import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { BusinessForm, BusinessFormBlock, FormField, OptionItem } from '../models/form-schema.model';
import { FieldInputComponent } from '../components/field-input/field-input.component';
import { FieldTextareaComponent } from '../components/field-textarea/field-textarea.component';
import { FieldSelectComponent } from '../components/field-select/field-select.component';
import { FieldMultiselectComponent } from '../components/field-multiselect/field-multiselect.component';
import { FieldCheckboxGridComponent } from '../components/field-checkbox-grid/field-checkbox-grid.component';
import { FieldFileComponent } from '../components/field-file/field-file.component';

type BlockField = FormField & { name: string };
type FormValueParser = (value: unknown) => unknown;
type OptionValue = OptionItem['value'];
type Primitive = string | number | boolean | null;
interface BlockView {
  code: string;
  label: string;
  fields: BlockField[];
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

    this.blocks = this.schema.blocks.map((block, index) => {
      const { fields, controls } = this.buildBlock(block);
      group[block.code] = this.fb.group(controls);

      return {
        code: block.code,
        label: this.formatBlockLabel(block.code, index),
        fields
      };
    });

    this.form = this.fb.group(group);
  }

  private buildBlock(block: BusinessFormBlock): { fields: BlockField[]; controls: Record<string, FormControl> } {
    const fields: BlockField[] = [];
    const controls: Record<string, FormControl> = {};

    Object.entries(block.values ?? {}).forEach(([name, rawValue]) => {
      const { field, value, options, parser } = this.buildField(block.code, name, rawValue);

      fields.push(field);
      controls[name] = this.fb.control(value, field.required ? Validators.required : []);

      if (options) {
        this.optionsMap[this.optionKey(block.code, name)] = options;
      }
      if (parser) {
        this.valueParsers[this.optionKey(block.code, name)] = parser;
      }
    });

    return { fields, controls };
  }

  private buildField(blockCode: string, name: string, rawValue: unknown): {
    field: BlockField;
    value: unknown;
    options?: OptionItem[];
    parser?: FormValueParser;
  } {
    const baseField: BlockField = {
      name,
      label: this.toLabel(name),
      type: 'text'
    };

    if (typeof rawValue === 'boolean') {
      const options: OptionItem[] = [
        { value: true, label: 'Sí' },
        { value: false, label: 'No' }
      ];
      return {
        field: { ...baseField, type: 'select' },
        value: rawValue,
        options,
        parser: (v) => v === true || v === 'true'
      };
    }

    if (Array.isArray(rawValue)) {
      const isPrimitiveArray = rawValue.every((item) => this.isPrimitive(item));

      if (isPrimitiveArray) {
        const normalizedValues = (rawValue as (Primitive | undefined)[]).map((val) =>
          val === undefined ? null : val
        );
        const options = this.toOptions(normalizedValues);
        return {
          field: { ...baseField, type: 'multiselect' },
          value: normalizedValues,
          options
        };
      }

      const stringValue = this.stringifyValue(rawValue);
      return {
        field: { ...baseField, type: 'textarea', rows: this.textAreaRows(stringValue) },
        value: stringValue,
        parser: (value) => this.parseJson(value, blockCode, name)
      };
    }

    if (rawValue && typeof rawValue === 'object') {
      const stringValue = this.stringifyValue(rawValue);
      return {
        field: { ...baseField, type: 'textarea', rows: this.textAreaRows(stringValue) },
        value: stringValue,
        parser: (value) => this.parseJson(value, blockCode, name)
      };
    }

    if (typeof rawValue === 'string' && rawValue.length > 120) {
      return {
        field: { ...baseField, type: 'textarea', rows: this.textAreaRows(rawValue) },
        value: rawValue
      };
    }

    return {
      field: baseField,
      value: rawValue ?? ''
    };
  }

  private textAreaRows(value: string): number {
    const lines = value.split('\n').length;
    return Math.min(12, Math.max(3, lines + 1));
  }

  private toOptions(values: Primitive[]): OptionItem[] {
    return values.map((value) => {
      const normalized = value === undefined ? null : value;
      return {
        value: normalized,
        label: String(normalized)
      };
    });
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
