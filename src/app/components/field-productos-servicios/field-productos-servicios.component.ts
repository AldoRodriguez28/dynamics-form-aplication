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

  newTag = '';

  get items(): string[] {
    if (!this.formArray?.controls) return [];
    return this.formArray.controls.map((c) => c.value as string).filter(Boolean);
  }

  constructor(private fb: FormBuilder) {}

  addTag(): void {
    const value = this.newTag.trim();
    if (!value) return;
    this.formArray.push(this.fb.control(value));
    this.newTag = '';
  }

  removeTag(idx: number): void {
    if (idx < 0 || idx >= this.formArray.length) return;
    this.formArray.removeAt(idx);
  }

  toggleTag(tag: string): void {
    const idx = this.items.findIndex((t) => t === tag);
    if (idx >= 0) {
      this.removeTag(idx);
    } else {
      this.formArray.push(this.fb.control(tag));
    }
  }
}
