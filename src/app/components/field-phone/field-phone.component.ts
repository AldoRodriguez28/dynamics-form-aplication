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
import { FormField } from '../../models/form-schema.model';

@Component({
  selector: 'app-field-phone',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-phone.component.html',
  styleUrl: './field-phone.component.scss'
})
export class FieldPhoneComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) formArray!: FormArray<FormGroup>;
  @Input() readOnly = false;

  readonly countries = [
    { value: 'MX', label: '+52' },
    { value: 'US', label: '+1' }
  ];

  private readonly fallbackLabels: Record<string, string> = {
    tipo: 'Tipo',
    numero: 'Numero',
    country: 'Pais'
  };

  private readonly fallbackPlaceholders: Record<string, string> = {
    tipo: 'Ej. Fijo',
    numero: 'Ej. 5512345678',
    country: ''
  };

  constructor(private fb: FormBuilder) {}

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

  trackByIndex(index: number): number {
    return index;
  }

  labelForKey(key: string): string {
    return this.field.itemSchema?.[key]?.label ?? this.fallbackLabels[key] ?? key;
  }

  placeholderForKey(key: string): string {
    if (key === 'numero' && this.field.placeholder && !this.field.itemSchema?.[key]?.placeholder) {
      return this.field.placeholder;
    }
    return this.field.itemSchema?.[key]?.placeholder ?? this.fallbackPlaceholders[key] ?? '';
  }

  hasTipo(): boolean {
    return Object.prototype.hasOwnProperty.call(this.field.itemSchema ?? {}, 'tipo');
  }

  maxLengthForNumber(): number {
    return 10;
  }

  private buildEmptyGroup(): FormGroup {
    const schema = this.field.itemSchema ?? {};
    const controls: Record<string, FormControl> = {};
    const keys = ['tipo', 'numero', 'country'];

    keys.forEach((key) => {
      const validators = schema[key]?.required ? [Validators.required] : [];
      const initialValue = key === 'country' ? 'MX' : '';
      controls[key] = this.fb.control(initialValue, validators);
    });

    return this.fb.group(controls);
  }
}
