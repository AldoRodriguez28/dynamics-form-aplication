import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormArray, FormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';

@Component({
  selector: 'app-field-productos-servicios',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './field-productos-servicios.component.html',
  styleUrl: './field-productos-servicios.component.scss'
})
export class FieldProductosServiciosComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) formArray!: FormArray;
  @Input() readOnly = false;

  newTag = '';

  get items(): string[] {
    if (!this.formArray?.controls) return [];
    return this.formArray.controls.map((c) => c.value as string).filter(Boolean);
  }

  /** Mismo criterio que otros campos: inválido y ya marcado touched (p. ej. tras interactuar o markAllAsTouched). */
  get showFieldError(): boolean {
    if (this.readOnly || !this.formArray) return false;
    return this.formArray.invalid && this.formArray.touched;
  }

  get fieldErrorHint(): string | null {
    if (!this.showFieldError) return null;
    if (this.formArray.errors?.['arrayItemIncomplete']) {
      return 'Añade al menos un producto o servicio.';
    }
    return 'Completa o corrige los productos o servicios.';
  }

  constructor(private fb: FormBuilder) {}

  addTag(): void {
    if (this.readOnly) return;
    const value = this.newTag.trim();
    if (!value) return;
    this.formArray.push(this.fb.control(value));
    this.newTag = '';
    this.formArray.markAsTouched();
    this.formArray.updateValueAndValidity();
  }

  removeTag(idx: number): void {
    if (this.readOnly) return;
    if (idx < 0 || idx >= this.formArray.length) return;
    this.formArray.removeAt(idx);
    this.formArray.markAsTouched();
    this.formArray.updateValueAndValidity();
  }

  toggleTag(tag: string): void {
    if (this.readOnly) return;
    const idx = this.items.findIndex((t) => t === tag);
    if (idx >= 0) {
      this.removeTag(idx);
    } else {
      this.formArray.push(this.fb.control(tag));
      this.formArray.markAsTouched();
      this.formArray.updateValueAndValidity();
    }
  }
}
