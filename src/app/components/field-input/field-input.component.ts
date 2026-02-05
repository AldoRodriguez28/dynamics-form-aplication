import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';

@Component({
  selector: 'app-field-input',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-input.component.html',
  styleUrl: './field-input.component.scss'
})
export class FieldInputComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;
  @Input() readOnly = false;
  country = '';

  readonly countries = [
    { value: 'MX', label: '+52' },
    { value: 'US', label: '+1' }
  ];

  get inputType(): string {
    switch (this.field.type) {
      case 'email':
        return 'email';
      case 'tel':
        return 'tel';
      case 'url':
        return 'url';
      case 'time':
        return 'time';
      default:
        return 'text';
    }
  }

  get maxLength(): number | null {
    if (this.inputType === 'tel') return 10;
    return this.field.maxLength ?? null;
  }

  onCountryChange(value: string): void {
    this.country = value;
  }
}
