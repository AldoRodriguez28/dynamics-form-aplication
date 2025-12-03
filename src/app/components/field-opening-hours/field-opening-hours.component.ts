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

  get dias(): string[] {
    const schema = this.field.schema as { dias?: string[] } | undefined;
    return schema?.dias ?? [];
  }

  get campos(): string[] {
    const schema = this.field.schema as { campos?: string[] } | undefined;
    return schema?.campos ?? ['abre', 'cierra'];
  }

  updateValue(dia: string, campo: string, value: string): void {
    const current = (this.control.value as OpeningHoursValue) || {};
    const nextDia = { ...(current[dia] ?? {}), [campo]: value };
    const next: OpeningHoursValue = { ...current, [dia]: nextDia };
    this.control.setValue(next);
  }

  valueFor(dia: string, campo: string): string {
    const current = (this.control.value as OpeningHoursValue) || {};
    return current[dia]?.[campo] ?? '';
  }
}
