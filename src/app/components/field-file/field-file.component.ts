import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FormField } from '../../models/form-schema.model';
import { BusinessService } from '../../services/business.service';

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
  @Input() readOnly = false;
  private fileObjectUrl: string | null = null;
  uploading = false;
  uploadError: string | null = null;
  uploadSuccess = false;

  constructor(
    private businessService: BusinessService,
    private route: ActivatedRoute
  ) {}

  get acceptFormats(): string | null {
    if (!this.field?.allowedFormats?.length) return null;
    return this.field.allowedFormats.map((ext) => `.${ext}`).join(',');
  }

  onFileChange(event: Event): void {
    if (this.readOnly) return;
    const target = event.target as HTMLInputElement;
    const file = target?.files?.item(0) ?? null;
    if (!file) {
      this.setFileValue(null);
      return;
    }
    this.setFileValue(file);
    this.uploadFile(file);
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
    this.uploadSuccess = false;
    this.uploadError = null;
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

  private uploadFile(file: File): void {
    const businessId = this.route.snapshot.paramMap.get('businessId');
    if (!businessId) {
      this.uploadError = 'No se pudo obtener el BusinessId.';
      this.control.setErrors({ ...(this.control.errors || {}), upload: true });
      return;
    }

    this.uploading = true;
    this.uploadError = null;
    this.uploadSuccess = false;

    this.businessService
      .uploadFiles({
        files: file,
        businessId,
        versionNumber: 1,
        fieldName: this.field.name,
        usage: (this.field as any).usage || ''
      })
      .subscribe({
        next: () => {
          this.uploading = false;
          this.uploadSuccess = true;
          this.control.setErrors(null);
        },
        error: () => {
          this.uploading = false;
          this.uploadError = 'Error al subir el archivo. Intenta de nuevo.';
          this.control.setErrors({ ...(this.control.errors || {}), upload: true });
        }
      });
  }
}
