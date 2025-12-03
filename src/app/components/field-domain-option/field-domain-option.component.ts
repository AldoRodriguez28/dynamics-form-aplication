import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';

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
  price: number | null = null;
  message = 'Ingresa el dominio para revisar su disponibilidad.';

  get value(): string {
    return (this.control?.value as string) || '';
  }

  onInput(value: string): void {
    this.control.setValue(value);
    this.status = 'idle';
    this.price = null;
    this.message = 'Ingresa el dominio para revisar su disponibilidad.';
  }

  checkAvailability(): void {
    const domain = this.value.trim();
    if (!domain) {
      this.status = 'idle';
      this.message = 'Escribe un dominio válido (ej. midominio.com).';
      this.price = null;
      return;
    }

    this.status = 'checking';
    this.message = 'Consultando disponibilidad...';

    // Simulación determinística: hash del dominio define disponibilidad y precio.
    const { available, price } = this.evaluateDomain(domain);
    this.status = available ? 'available' : 'taken';
    this.price = price;
    this.message = available
      ? `Disponible. Precio estimado: $${price} MXN/año`
      : 'No disponible. Prueba otra opción.';
  }

  private evaluateDomain(domain: string): { available: boolean; price: number } {
    const cleaned = domain.toLowerCase().replace(/^https?:\/\//, '').trim();
    const hash = Array.from(cleaned).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const available = hash % 3 !== 0;
    const base = cleaned.includes('.mx') ? 399 : 499;
    const price = base + (hash % 120);
    return { available, price };
  }
}
