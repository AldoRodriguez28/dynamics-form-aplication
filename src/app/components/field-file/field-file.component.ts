import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';

@Component({
  selector: 'app-field-file',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-file.component.html',
  styleUrl: './field-file.component.scss'
})
export class FieldFileComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;

  get acceptFormats(): string | null {
    if (!this.field?.allowedFormats?.length) return null;
    return this.field.allowedFormats.map((ext) => `.${ext}`).join(',');
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target?.files?.item(0) ?? null;
    this.control.setValue(file);
  }
}
