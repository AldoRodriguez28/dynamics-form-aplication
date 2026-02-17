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
import { OptionItemInterface } from '../../dynamic-form/interface/OptionItem.intreface';
import { phoneDigitsValidator, requiredIfSiblingFilled } from '../../utils/phone-validators';
import { canAppendFormArrayItem } from '../../utils/form-array-guards';

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
  @Input() optionSets: Record<string, OptionSet> = {};
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
    if (!canAppendFormArrayItem(this.formArray)) return;
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

  fieldTypeForKey(key: string): string | undefined {
    return this.field.itemSchema?.[key]?.type;
  }

  optionsForKey(key: string): OptionItemInterface[] {
    const type = this.fieldTypeForKey(key);
    if (type !== 'select') return [];
    const ref = this.field.itemSchema?.[key]?.optionsRef;
    if (!ref) return [];
    const set = this.optionSets?.[ref];
    return set?.items ?? [];
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
      const initialValue = '';
      controls[key] = this.fb.control(initialValue, validators);
    });

    const group = this.fb.group(controls);
    const numberControl = group.get('numero') as FormControl | null;
    const countryControl = group.get('country') as FormControl | null;
    if (numberControl && countryControl) {
      numberControl.addValidators(phoneDigitsValidator());
      numberControl.addValidators(requiredIfSiblingFilled('country'));
      countryControl.addValidators(requiredIfSiblingFilled('numero'));
      numberControl.valueChanges.subscribe(() => {
        countryControl.updateValueAndValidity({ emitEvent: false });
      });
      countryControl.valueChanges.subscribe(() => {
        numberControl.updateValueAndValidity({ emitEvent: false });
      });
    }

    return group;
  }
}
