import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FormField, OptionSet } from '../../models/form-schema.model';
import { OptionItemInterface } from '../../dynamic-form/interface/OptionItem.intreface';

export type FlexibleHorariosTurno = { abre: string; cierra: string };
export type FlexibleHorariosDiaEntry = { dia: string; turnos: FlexibleHorariosTurno[] };
export type FlexibleHorariosValue = FlexibleHorariosDiaEntry[];

const DEFAULT_DIAS: OptionItemInterface[] = [
  { value: 'Lunes', label: 'Lunes' },
  { value: 'Martes', label: 'Martes' },
  { value: 'Miércoles', label: 'Miércoles' },
  { value: 'Jueves', label: 'Jueves' },
  { value: 'Viernes', label: 'Viernes' },
  { value: 'Sábado', label: 'Sábado' },
  { value: 'Domingo', label: 'Domingo' }
];

@Component({
  selector: 'app-field-opening-hours-flexible',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './field-opening-hours-flexible.component.html',
  styleUrl: './field-opening-hours-flexible.component.scss'
})
export class FieldOpeningHoursFlexibleComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl<FlexibleHorariosValue>;
  @Input() optionSets: Record<string, OptionSet> = {};
  @Input() readOnly = false;

  /** Opciones de día (diasSemana, schema.dias o lista por defecto). */
  get dayOptionItems(): OptionItemInterface[] {
    const ref = this.field.itemSchema?.['dia']?.optionsRef ?? this.field.optionsRef;
    const set = ref ? this.optionSets?.[ref] : undefined;
    if (set?.mode === 'static' && set.items?.length) {
      return set.items;
    }
    const schema = this.field.schema as { dias?: string[] } | undefined;
    if (schema?.dias?.length) {
      return schema.dias.map((d) => ({ value: d, label: d }));
    }
    return DEFAULT_DIAS;
  }

  get entriesList(): FlexibleHorariosDiaEntry[] {
    const v = this.control.value;
    return Array.isArray(v) ? v : [];
  }

  /** Resumen para la pastilla: días con día elegido y total de turnos. */
  get resumenHorariosLabel(): string {
    const conDiaSeleccionado = this.entriesList.filter((e) => (e.dia ?? '').trim() !== '').length;
    let turnos = 0;
    for (const e of this.entriesList) {
      turnos += Array.isArray(e.turnos) ? e.turnos.length : 0;
    }
    const diasTxt =
      conDiaSeleccionado === 0
        ? 'Sin día elegido'
        : conDiaSeleccionado === 1
          ? '1 día'
          : `${conDiaSeleccionado} días`;
    const turnosTxt = turnos === 0 ? '0 turnos' : turnos === 1 ? '1 turno' : `${turnos} turnos`;
    return `${diasTxt} · ${turnosTxt}`;
  }

  dayOptionsFor(current: string): { value: string; label: string }[] {
    const used = new Set(
      this.entriesList.map((e) => e.dia).filter((d) => d && d.trim() !== '')
    );
    if (current) used.delete(current);
    return this.dayOptionItems
      .filter((item) => !used.has(String(item.value)) || String(item.value) === current)
      .map((item) => ({ value: String(item.value), label: item.label }));
  }

  canAddDay(): boolean {
    if (this.readOnly) return false;
    const n = this.dayOptionItems.length;
    if (n === 0) return false;
    const used = new Set(
      this.entriesList.map((e) => e.dia).filter((d) => d && d.trim() !== '')
    );
    return used.size < n;
  }

  addDay(): void {
    if (this.readOnly || !this.canAddDay()) return;
    this.patch((prev) => [...prev, { dia: '', turnos: [] }]);
  }

  removeDay(index: number): void {
    if (this.readOnly) return;
    this.patch((prev) => prev.filter((_, i) => i !== index));
  }

  onDayChange(index: number, value: string): void {
    if (this.readOnly) return;
    this.patch((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], dia: value };
      return next;
    });
  }

  turnos(entryIndex: number): FlexibleHorariosTurno[] {
    const e = this.entriesList[entryIndex];
    return Array.isArray(e?.turnos) ? e.turnos : [];
  }

  valueFor(entryIndex: number, turnIndex: number, key: keyof FlexibleHorariosTurno): string {
    const t = this.turnos(entryIndex)[turnIndex];
    return t?.[key] ?? '';
  }

  addTurn(entryIndex: number): void {
    this.patch((prev) => {
      const next = [...prev];
      const row = next[entryIndex] ?? { dia: '', turnos: [] };
      next[entryIndex] = {
        ...row,
        turnos: [...(row.turnos ?? []), { abre: '', cierra: '' }]
      };
      return next;
    });
  }

  removeTurn(entryIndex: number, turnIndex: number): void {
    this.patch((prev) => {
      const next = [...prev];
      const row = next[entryIndex];
      if (!row) return prev;
      const list = [...(row.turnos ?? [])];
      list.splice(turnIndex, 1);
      next[entryIndex] = { ...row, turnos: list };
      return next;
    });
  }

  clearDayTurnos(entryIndex: number): void {
    this.patch((prev) => {
      const next = [...prev];
      const row = next[entryIndex];
      if (!row) return prev;
      next[entryIndex] = { ...row, turnos: [] };
      return next;
    });
  }

  clearAll(): void {
    if (this.readOnly) return;
    this.control.setValue([]);
    this.control.markAsTouched();
    this.control.updateValueAndValidity({ emitEvent: false });
  }

  updateTime(entryIndex: number, turnIndex: number, key: keyof FlexibleHorariosTurno, value: string): void {
    if (this.readOnly) return;
    this.patch((prev) => {
      const next = [...prev];
      const row = next[entryIndex] ?? { dia: '', turnos: [] };
      const list = [...(row.turnos ?? [])];
      while (list.length <= turnIndex) {
        list.push({ abre: '', cierra: '' });
      }
      list[turnIndex] = { ...list[turnIndex], [key]: value };
      next[entryIndex] = { ...row, turnos: list };
      return next;
    });
  }

  inputHasError(entryIndex: number, turnIndex: number, key: keyof FlexibleHorariosTurno): boolean {
    if (!(this.control.touched || this.control.dirty)) return false;
    if (this.control.errors?.['required']) return true;
    const errs = this.control.errors;
    if (!errs?.['openingHoursPair'] && !errs?.['openingHoursOrder']) return false;
    const t = this.turnos(entryIndex)[turnIndex];
    if (!t) return false;
    const ha = this.hasTimeValue(t.abre);
    const hc = this.hasTimeValue(t.cierra);
    if (errs['openingHoursPair']) {
      if (ha !== hc) return key === 'abre' || key === 'cierra';
    }
    if (errs['openingHoursOrder'] && ha && hc) {
      return key === 'abre' || key === 'cierra';
    }
    return false;
  }

  trackByIndex = (i: number) => i;

  private patch(fn: (prev: FlexibleHorariosValue) => FlexibleHorariosValue): void {
    if (this.readOnly) return;
    const prev = Array.isArray(this.control.value) ? [...this.control.value] : [];
    const next = fn(prev);
    this.control.setValue(next);
    this.control.markAsTouched();
    this.control.updateValueAndValidity({ emitEvent: false });
  }

  private hasTimeValue(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
  }
}
