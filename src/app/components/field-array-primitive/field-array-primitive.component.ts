import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { FormField, OptionItem } from '../../models/form-schema.model';
import { FieldFileComponent } from '../field-file/field-file.component';

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
  @Input() options: OptionItem[] = [];

  constructor(private fb: FormBuilder) {}

  addItem(): void {
    this.formArray.push(this.fb.control(this.defaultValue(), this.controlValidators()));
  }

  removeItem(index: number): void {
    if (this.formArray.length <= 1) return;
    this.formArray.removeAt(index);
  }

  trackByIndex(index: number): number {
    return index;
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

  private defaultValue(): unknown {
    if (this.isCheckbox()) return false;
    if (this.isFile()) return null;
    return '';
  }

  private controlValidators() {
    return this.field.required ? [Validators.required] : [];
  }
}
