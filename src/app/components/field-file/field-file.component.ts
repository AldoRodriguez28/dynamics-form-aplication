import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';

@Component({
  selector: 'app-field-file',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-file.component.html',
  styleUrl: './field-file.component.scss'
})
export class FieldFileComponent implements OnDestroy {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;
  private fileObjectUrl: string | null = null;

  get acceptFormats(): string | null {
    if (!this.field?.allowedFormats?.length) return null;
    return this.field.allowedFormats.map((ext) => `.${ext}`).join(',');
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target?.files?.item(0) ?? null;
    this.setFileValue(file);
  }

  get currentName(): string | null {
    const value = this.control?.value;
    if (!value) return null;
    if (value instanceof File) return value.name;
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && 'name' in (value as Record<string, unknown>)) {
      const maybeName = (value as Record<string, unknown>)['name'];
      return typeof maybeName === 'string' ? maybeName : null;
    }
    return null;
  }

  get previewUrl(): string | null {
    const value = this.control?.value;
    if (!value) return null;
    if (value instanceof File) {
      if (!this.fileObjectUrl) this.fileObjectUrl = URL.createObjectURL(value);
      return this.fileObjectUrl;
    }
    if (typeof value === 'string') return value;
    if (typeof value === 'object') {
      const url = (value as Record<string, unknown>)['url'];
      if (typeof url === 'string') return url;
    }
    return null;
  }

  ngOnDestroy(): void {
    this.revokeObjectUrl();
  }

  private setFileValue(file: File | null): void {
    this.revokeObjectUrl();
    this.control.setValue(file);
    if (file) {
      this.fileObjectUrl = URL.createObjectURL(file);
    }
  }

  private revokeObjectUrl(): void {
    if (this.fileObjectUrl) {
      URL.revokeObjectURL(this.fileObjectUrl);
      this.fileObjectUrl = null;
    }
  }
}
