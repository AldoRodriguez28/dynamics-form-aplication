import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';

type OpeningHoursValue = Record<string, Record<string, string>>;

@Component({
  selector: 'app-field-opening-hours',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-opening-hours.component.html',
  styleUrl: './field-opening-hours.component.scss'
})
export class FieldOpeningHoursComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl<OpeningHoursValue>;
  @Input() readOnly = false;

  get dias(): string[] {
    const schema = this.field.schema as { dias?: string[] } | undefined;
    return schema?.dias ?? [];
  }

  get campos(): string[] {
    const schema = this.field.schema as { campos?: string[] } | undefined;
    return schema?.campos ?? ['abre', 'cierra'];
  }

  updateValue(dia: string, campo: string, value: string): void {
    if (this.readOnly) return;
    const current = (this.control.value as OpeningHoursValue) || {};
    const nextDia = { ...(current[dia] ?? {}), [campo]: value };
    const next: OpeningHoursValue = { ...current, [dia]: nextDia };
    this.control.setValue(next);
    this.control.markAsTouched();
    this.control.updateValueAndValidity({ emitEvent: false });
  }

  valueFor(dia: string, campo: string): string {
    const current = (this.control.value as OpeningHoursValue) || {};
    return current[dia]?.[campo] ?? '';
  }

  hasOrderErrorFor(dia: string): boolean {
    if (!this.control.touched) return false;
    const current = (this.control.value as OpeningHoursValue) || {};
    const abre = current[dia]?.['abre'];
    const cierra = current[dia]?.['cierra'];
    if (!this.hasTimeValue(abre) || !this.hasTimeValue(cierra)) return false;
    const start = this.timeToMinutes(abre);
    const end = this.timeToMinutes(cierra);
    if (start === null || end === null) return false;
    return start >= end;
  }

  private hasTimeValue(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
  }

  private timeToMinutes(value: string): number | null {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours * 60 + minutes;
  }
}
