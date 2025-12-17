import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';
import { BusinessService, DomainCheckResponse } from '../../services/business.service';

type DomainStatus = 'idle' | 'checking' | 'available' | 'taken';

@Component({
  selector: 'app-field-domain-option',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-domain-option.component.html',
  styleUrl: './field-domain-option.component.scss'
})
export class FieldDomainOptionComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;

  status: DomainStatus = 'idle';
  message = 'Ingresa el dominio para revisar su disponibilidad.';
  suggestions: string[] = [];

  constructor(private businessService: BusinessService) {}

  get value(): string {
    return (this.control?.value as string) || '';
  }

  onInput(value: string): void {
    this.control.setValue(value);
    this.status = 'idle';
    this.suggestions = [];
    this.message = 'Ingresa el dominio para revisar su disponibilidad.';
    this.clearDomainError();
  }

  checkAvailability(): void {
    const domain = this.value.trim();
    if (!domain) {
      this.status = 'idle';
      this.message = 'Escribe un dominio válido (ej. midominio.com).';
      this.suggestions = [];
      this.setDomainError(true);
      return;
    }

    this.status = 'checking';
    this.message = 'Consultando disponibilidad...';
    this.suggestions = [];
    this.setDomainError(false);
    this.control.markAsTouched();

    this.businessService.checkDomainAvailability(domain).subscribe({
      next: (response) => this.handleResponse(response),
      error: () => {
        this.status = 'idle';
        this.message = 'No se pudo validar el dominio. Intenta de nuevo.';
        this.setDomainError(true);
      }
    });
  }

  private handleResponse(response: DomainCheckResponse): void {
    if (Array.isArray(response)) {
      this.status = 'taken';
      this.suggestions = response.filter((item) => typeof item === 'string') as string[];
      this.message = 'No disponible. Prueba una sugerencia:';
      this.setDomainError(true);
      return;
    }

    const text = typeof response === 'string' ? response : response?.message;
    const normalized = (text || '').toString().toLowerCase();
    const available = normalized.includes('disponible');

    if (available) {
      this.status = 'available';
      this.suggestions = [];
      this.message = text || 'Dominio disponible.';
      this.setDomainError(false);
    } else {
      this.status = 'taken';
      this.suggestions = [];
      this.message = text || 'No disponible. Prueba otra opción.';
      this.setDomainError(true);
    }
  }

  private setDomainError(isTaken: boolean): void {
    const errors = { ...(this.control.errors || {}) };
    if (isTaken) {
      errors['domainTaken'] = true;
    } else {
      delete errors['domainTaken'];
    }
    const hasErrors = Object.keys(errors).length > 0;
    this.control.setErrors(hasErrors ? errors : null);
  }

  private clearDomainError(): void {
    this.setDomainError(false);
  }
}
