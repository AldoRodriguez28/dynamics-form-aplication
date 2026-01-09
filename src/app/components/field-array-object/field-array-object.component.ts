import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { FormField, OptionSet } from '../../models/form-schema.model';
import { getControl } from '../../utils';
import { OptionItemInterface } from '../../dynamic-form/interface/OptionItem.intreface';
@Component({
  selector: 'app-field-array-object',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-array-object.component.html',
  styleUrl: './field-array-object.component.scss'
})
export class FieldArrayObjectComponent {
  @Input({ required: true }) field!: FormField & { name: string; itemKeys?: string[] };
  @Input({ required: true }) formArray!: FormArray<FormGroup>;
  @Input() optionSets: Record<string, OptionSet> = {};
  @Input() readOnly = false;
  getControl = getControl;

  constructor(private fb: FormBuilder) {
  }

  get keys(): string[] {
    if (this.field.itemKeys && this.field.itemKeys.length) return this.field.itemKeys;
    const first = this.formArray.at(0) as FormGroup | undefined;
    return first ? Object.keys(first.controls) : [];
  }

  asGroup(control: AbstractControl): FormGroup {
    return control as FormGroup;
  }

  addItem(): void {
    if (this.readOnly) return;
    this.formArray.push(this.buildEmptyGroup());
  }

  removeItem(index: number): void {
    if (this.readOnly) return;
    if (this.formArray.length <= 1) return;
    this.formArray.removeAt(index);
  }

  trackByIndex(_index: number): number {
    return _index;
  }

  labelForKey(key: string): string {
    const schema = this.field.itemSchema ?? {};
    return schema[key]?.label || this.toLabel(key);
  }

  placeholderForKey(key: string): string | undefined {
    const schema = this.field.itemSchema ?? {};
    return schema[key]?.placeholder || '';
  }

  fieldTypeForKey(key: string): string | undefined {
    const schema = this.field.itemSchema ?? {};
    return schema[key]?.type;
  }

  optionsForKey(key: string): OptionItemInterface[] {
    const type = this.fieldTypeForKey(key);
    if (type !== 'select') return [];
    const schema = this.field.itemSchema ?? {};
    const ref = schema[key]?.optionsRef;
    if (!ref) return [];
    const set = this.optionSets?.[ref];
    return set?.items ?? [];
  }

  inputTypeForKey(key: string): string {
    const type = this.fieldTypeForKey(key) || 'text';
    switch (type) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      case 'checkbox':
        return 'checkbox';
      default:
        return 'text';
    }
  }

  private buildEmptyGroup(): FormGroup {
    const controls: Record<string, FormControl> = {};
    const schema = this.field.itemSchema ?? {};
    const keys = this.keys.length
      ? this.keys
      : Object.keys(schema).length
        ? Object.keys(schema)
        : ['nombreSucursal', 'telefonoSucursal', 'direccionSucursal'];

    keys.forEach((key) => {
      const validators = schema[key]?.required ? [Validators.required] : [];
      controls[key] = this.fb.control('', validators);
    });

    return this.fb.group(controls);
  }

  private toLabel(raw: string): string {
    return raw
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (c) => c.toUpperCase());
  }
}
