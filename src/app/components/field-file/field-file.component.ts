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
          this.control.setErrors(null);
        },
        error: () => {
          this.uploading = false;
          this.uploadError = 'Error al subir el archivo. Intenta de nuevo.';
          this.control.setErrors({ ...(this.control.errors || {}), upload: true });
        }
      });
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
