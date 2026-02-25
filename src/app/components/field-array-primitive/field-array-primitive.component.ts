import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';
import { FieldValidatorFactory } from '../../utils/field-validator.factory';
import { OptionItemInterface } from '../../dynamic-form/interface/OptionItem.intreface';
import { FieldFileComponent } from '../field-file/field-file.component';
import { canAppendFormArrayItem } from '../../utils/form-array-guards';

@Component({
  selector: 'app-field-array-primitive',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FieldFileComponent],
  templateUrl: './field-array-primitive.component.html',
  styleUrl: './field-array-primitive.component.scss'
})
export class FieldArrayPrimitiveComponent {
  @Input({ required: true }) field!: FormField & { name: string; itemType?: FormField['type'] };
  @Input({ required: true }) formArray!: FormArray<FormControl>;
  @Input() options: OptionItemInterface[] = [];
  @Input() readOnly = false;
  @Input() blockCode?: string;

  constructor(
    private fb: FormBuilder,
    private validatorFactory: FieldValidatorFactory
  ) {}

  addItem(): void {
    if (this.readOnly) return;
    if (!canAppendFormArrayItem(this.formArray)) return;
    this.formArray.push(this.fb.control(this.defaultValue(), this.controlValidators()));
  }

  removeItem(index: number): void {
    if (this.readOnly) return;
    if (this.formArray.length <= 1) return;
    this.formArray.removeAt(index);
  }

  trackByIndex(index: number): number {
    return index;
  }

  inputHasError(control: FormControl): boolean {
    const touched = !!(control?.touched || this.formArray?.touched);
    if (!touched) return false;
    if (control?.errors?.['required']) return true;
    if (this.formArray?.errors?.['arrayItemIncomplete']) {
      return !this.hasNonEmptyValue(control?.value);
    }
    return false;
  }

  get itemType(): FormField['type'] | undefined {
    return this.field.itemType || this.field.type;
  }

  isCheckbox(): boolean {
    return this.itemType === 'checkbox' || this.itemType === 'checkbox-group';
  }

  isFile(): boolean {
    return this.itemType === 'file';
  }

  hasType(): boolean {
    return Boolean(this.itemType);
  }

  inputType(): string {
    const type = this.itemType || 'text';
    switch (type) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      case 'time':
        return 'time';
      case 'checkbox':
      case 'checkbox-group':
        return 'checkbox';
      default:
        return 'text';
    }
  }

  maxLength(): number | null {
    if (this.inputType() === 'tel') return 10;
    return this.field.maxLength ?? null;
  }

  private defaultValue(): unknown {
    if (this.isCheckbox()) return false;
    if (this.isFile()) return null;
    return '';
  }

  private controlValidators() {
    const type = this.itemType || this.field.type;
    const fieldForItem = { ...this.field, type };
    return this.validatorFactory.build(fieldForItem, {
      requiredValidator: this.field.required ? Validators.required : null,
      skipRequired: !this.field.required
    });
  }

  private hasNonEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return true;
  }
}
