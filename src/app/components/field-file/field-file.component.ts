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
  @Input() blockCode?: string;
  private fileObjectUrl: string | null = null;
  uploading = false;
  uploadError: string | null = null;
  uploadSuccess = false;

  constructor(
    private businessService: BusinessService,
    private route: ActivatedRoute
  ) {}

  get acceptFormats(): string | null {
    const formats = this.normalizedAllowedFormats();
    if (!formats.length) return null;
    return formats.map((ext) => `.${ext}`).join(',');
  }

  onFileChange(event: Event): void {
    if (this.readOnly) return;
    const target = event.target as HTMLInputElement;
    const file = target?.files?.item(0) ?? null;
    if (!file) {
      this.setFileValue(null);
      return;
    }

    const validationError = this.validateFile(file);
    if (validationError) {
      this.setFileValue(null);
      this.uploadError = validationError;
      this.uploadSuccess = false;
      this.uploading = false;
      this.setControlError('fileValidation');
      if (target) target.value = '';
      return;
    }

    this.setFileValue(file);
    this.clearControlErrors('fileValidation', 'upload');
    this.uploadFile(file);
  }

  get currentName(): string | null {
    const value = this.control?.value;
    if (!value) return null;
    if (value instanceof File) return value.name;
    if (typeof value === 'string') {
      const parsed = this.safeParseJsonObject(value);
      if (parsed) {
        const maybeName = parsed['name'];
        if (typeof maybeName === 'string') return maybeName;
        const url = parsed['url'];
        if (typeof url === 'string') return this.extractFileName(url);
      }
      return this.extractFileName(value);
    }
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
    if (typeof value === 'string') {
      const parsed = this.safeParseJsonObject(value);
      if (parsed) {
        const url = parsed['url'];
        return typeof url === 'string' ? url : null;
      }
      return value;
    }
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

  private validateFile(file: File): string | null {
    const maxSizeMB = this.field?.maxSizeMB;
    if (typeof maxSizeMB === 'number' && maxSizeMB > 0) {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        return `El archivo supera el tamaño máximo permitido de ${this.formatMaxSize(maxSizeMB)} MB.`;
      }
    }

    const allowedFormats = this.normalizedAllowedFormats();
    if (allowedFormats.length) {
      const extension = this.getFileExtension(file.name);
      if (!extension || !allowedFormats.includes(extension)) {
        return `Formato no permitido. Usa archivos: ${allowedFormats.join(', ')}.`;
      }
    }

    return null;
  }

  private normalizedAllowedFormats(): string[] {
    const formats = this.field?.allowedFormats ?? [];
    return formats
      .map((ext) => String(ext).trim().toLowerCase().replace(/^\./, ''))
      .filter((ext, index, list) => ext.length > 0 && list.indexOf(ext) === index);
  }

  private getFileExtension(fileName: string): string {
    const cleanName = fileName.split('?')[0].split('#')[0];
    const dotIndex = cleanName.lastIndexOf('.');
    if (dotIndex < 0 || dotIndex === cleanName.length - 1) return '';
    return cleanName.slice(dotIndex + 1).toLowerCase();
  }

  private formatMaxSize(maxSizeMB: number): string {
    return Number.isInteger(maxSizeMB) ? String(maxSizeMB) : maxSizeMB.toFixed(2).replace(/\.?0+$/, '');
  }

  private uploadFile(file: File): void {
    const businessId = this.route.snapshot.paramMap.get('businessId');
    if (!businessId) {
      this.uploadError = 'No se pudo obtener el BusinessId.';
      this.setControlError('upload');
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
        usage: (this.field as any).usage || '',
        blockCode: this.blockCode
      })
      .subscribe({
        next: (response) => {
          const payload = this.extractFilePayload(response);
          if (payload) {
            this.revokeObjectUrl();
            this.control.setValue(payload);
          }
          this.uploading = false;
          this.uploadSuccess = true;
          this.clearControlErrors('fileValidation', 'upload');
        },
        error: () => {
          this.uploading = false;
          this.uploadError = 'Error al subir el archivo. Intenta de nuevo.';
          this.setControlError('upload');
        }
      });
  }

  private setControlError(errorKey: string): void {
    this.control.setErrors({ ...(this.control.errors || {}), [errorKey]: true });
  }

  private clearControlErrors(...errorKeys: string[]): void {
    const current = this.control.errors;
    if (!current) return;

    const next = { ...current };
    errorKeys.forEach((key) => delete next[key]);
    this.control.setErrors(Object.keys(next).length ? next : null);
  }

  private extractFilePayload(response: unknown): { file_id: number; url: string } | null {
    if (!response || typeof response !== 'object') return null;
    const data = (response as Record<string, unknown>)['data'];
    if (!Array.isArray(data) || !data.length) return null;
    const item = data[0];
    if (!item || typeof item !== 'object') return null;
    const fileId = (item as Record<string, unknown>)['file_id'];
    const url = (item as Record<string, unknown>)['url'];
    if (typeof fileId === 'number' && typeof url === 'string') {
      return { file_id: fileId, url };
    }
    return null;
  }

  private safeParseJsonObject(raw: string): Record<string, unknown> | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
    return null;
  }

  private extractFileName(raw: string): string {
    const clean = raw.split('?')[0].split('#')[0];
    const parts = clean.split('/');
    const last = parts[parts.length - 1] || '';
    return last || raw;
  }
}
