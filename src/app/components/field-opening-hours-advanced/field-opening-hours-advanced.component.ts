import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators, FormsModule } from '@angular/forms';
import { FormField, OptionSet } from '../../models/form-schema.model';
import { OptionItemInterface } from '../../dynamic-form/interface/OptionItem.intreface';
import { canAppendFormArrayItem } from '../../utils/form-array-guards';

type DayOption = { value: string; label: string; index: number };
type ItemSchema = NonNullable<FormField['itemSchema']>;

@Component({
  selector: 'app-field-opening-hours-advanced',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './field-opening-hours-advanced.component.html',
  styleUrl: './field-opening-hours-advanced.component.scss'
})
export class FieldOpeningHoursAdvancedComponent implements OnChanges {
  @Input({ required: true }) field!: FormField & { name: string; itemSchema?: FormField['itemSchema'] };
  @Input({ required: true }) formArray!: FormArray<FormGroup>;
  @Input() optionSets: Record<string, OptionSet> = {};
  @Input() readOnly = false;

  days: DayOption[] = [];
  timeKeys: string[] = [];
  labelMap: Record<string, string> = {};
  placeholderMap: Record<string, string> = {};
  // No tracking del día a nivel de header; se elige dentro de la card

  constructor(private fb: FormBuilder) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['field'] || changes['formArray'] || changes['optionSets']) {
      this.syncConfig();
    }
  }

  trackByDay = (_: number, day: DayOption) => day.index;

  valueFor(index: number, key: string): string {
    const group = this.getGroupForDayByIndex(index);
    if (!group) return '';
    const value = group.get(key)?.value;
    return typeof value === 'string' ? value : '';
  }

  updateTime(index: number, key: string, value: string): void {
    if (this.readOnly) return;
    const group = this.getGroupForDayByIndex(index);
    if (!group) return;
    const control = group.get(key) as FormControl | null;
    control?.setValue(value);
    group.markAsTouched();
    group.updateValueAndValidity({ emitEvent: false });
  }

  isClosed(index: number): boolean {
    return false;
  }

  clearDay(index: number): void {
    if (this.readOnly) return;
    this.timeKeys.forEach((key) => this.updateTime(index, key, ''));
  }

  deleteDay(index: number): void {
    if (this.readOnly) return;
    if (index < 0 || index >= this.formArray.length) return;
    this.formArray.removeAt(index);
    this.days = this.getDays();
  }

  hasOrderError(index: number): boolean {
    const group = this.getGroupForDayByIndex(index);
    return Boolean(group?.touched && group?.errors?.['openingHoursOrder']);
  }

  hasPairError(index: number): boolean {
    const group = this.getGroupForDayByIndex(index);
    return Boolean((group?.touched || this.formArray?.touched) && group?.errors?.['openingHoursPair']);
  }

  hasCompleteError(index: number): boolean {
    const group = this.getGroupForDayByIndex(index);
    if (!group) return false;
    if (!(group.touched || this.formArray?.touched)) return false;
    if (!this.formArray?.errors?.['openingHoursComplete']) return false;

    // Muestra el error solo en el día incompleto
    if (!group.get('dia')?.value) return true;
    return this.timeKeys.some((key) => !this.hasTimeValue(group.get(key)?.value));
  }

  dayHasError(index: number): boolean {
    if (!this.hasCompleteError(index)) return false;
    const group = this.getGroupForDayByIndex(index);
    return !group?.get('dia')?.value;
  }

  inputHasError(index: number, key: string): boolean {
    const group = this.getGroupForDayByIndex(index);
    if (!group) return false;
    if (!(group.touched || this.formArray?.touched)) return false;

    const value = group.get(key)?.value;
    const hasValue = this.hasTimeValue(value);

    if (this.hasCompleteError(index) && this.timeKeys.includes(key) && !hasValue) return true;

    if (this.hasPairError(index)) {
      const abre = group.get('abre')?.value;
      const comidaSale = group.get('comidaSale')?.value;
      const comidaRegresa = group.get('comidaRegresa')?.value;
      const cierra = group.get('cierra')?.value;

      const hasAbre = this.hasTimeValue(abre);
      const hasComidaSale = this.hasTimeValue(comidaSale);
      const hasComidaRegresa = this.hasTimeValue(comidaRegresa);
      const hasCierra = this.hasTimeValue(cierra);

      if (key === 'abre' && !hasAbre && hasComidaSale) return true;
      if (key === 'comidaSale' && !hasComidaSale && hasAbre) return true;
      if (key === 'comidaRegresa' && !hasComidaRegresa && hasCierra) return true;
      if (key === 'cierra' && !hasCierra && hasComidaRegresa) return true;
    }

    return false;
  }

  copyFirstToAll(): void {
    if (this.readOnly) return;
    const first = this.days[0];
    if (!first) return;
    const source = this.getGroupForDayByIndex(first.index);
    if (!source) return;
    const snapshot: Record<string, string> = {};
    this.timeKeys.forEach((key) => (snapshot[key] = source.get(key)?.value || ''));

    this.days.slice(1).forEach((day) => {
      const target = this.getGroupForDayByIndex(day.index);
      if (!target) return;
      this.timeKeys.forEach((key) => target.get(key)?.setValue(snapshot[key] || ''));
    });
  }

  clearAll(): void {
    if (this.readOnly) return;
    this.days.forEach((day) => this.clearDay(day.index));
  }

  addDay(): void {
    if (this.readOnly) return;
    if (!canAppendFormArrayItem(this.formArray)) return;
    const schema: ItemSchema = (this.field.itemSchema as ItemSchema) ?? {};
    const newGroup = this.buildEmptyGroup('', schema);
    this.formArray.push(newGroup);
    this.days = this.getDays();
  }

  private syncConfig(): void {
    this.days = this.getDays();
    this.timeKeys = this.getTimeKeys();
    this.labelMap = this.buildLabelMap();
    this.placeholderMap = this.buildPlaceholderMap();
    this.ensureDays();
  }

  private getDays(): DayOption[] {
    const days: DayOption[] = [];
    this.formArray?.controls?.forEach((ctrl, index) => {
      const value = (ctrl.get('dia')?.value ?? '') as string;
      const label = value || `Selecciona día #${index + 1}`;
      days.push({ value, label, index });
    });

    return days;
  }

  private getTimeKeys(): string[] {
    const schema: ItemSchema = (this.field.itemSchema as ItemSchema) ?? {};
    const keys = Object.keys(schema).filter((key) => schema[key]?.type === 'time');
    if (keys.length) return keys;
    // fallback para respuestas sin itemSchema
    if (this.formArray?.at(0)) {
      return Object.keys((this.formArray.at(0) as FormGroup).value).filter((k) => k !== 'dia');
    }
    return ['abre', 'comidaSale', 'comidaRegresa', 'cierra'];
  }

  private buildLabelMap(): Record<string, string> {
    const schema: ItemSchema = (this.field.itemSchema as ItemSchema) ?? {};
    const labels: Record<string, string> = {};
    Object.keys(schema).forEach((key) => {
      if (schema[key]?.label) labels[key] = schema[key]?.label as string;
    });
    return labels;
  }

  private buildPlaceholderMap(): Record<string, string> {
    const schema: ItemSchema = (this.field.itemSchema as ItemSchema) ?? {};
    const placeholders: Record<string, string> = {};
    Object.keys(schema).forEach((key) => {
      if (schema[key]?.placeholder !== undefined) placeholders[key] = schema[key]?.placeholder as string;
    });
    return placeholders;
  }

  private ensureDays(): void {
    this.days = this.getDays();
  }

  private buildEmptyGroup(day: string, schema: ItemSchema): FormGroup {
    const keys = Object.keys(schema).length
      ? Object.keys(schema)
      : ['dia', 'abre', 'comidaSale', 'comidaRegresa', 'cierra'];
    const controls: Record<string, FormControl> = {};

    keys.forEach((key) => {
      const validators = schema[key]?.required ? [Validators.required] : [];
      const initial = key === 'dia' ? day : '';
      controls[key] = this.fb.control(initial, validators);
    });

    return this.fb.group(controls);
  }

  private getGroupForDayByIndex(index: number): FormGroup | null {
    return (this.formArray?.at(index) as FormGroup) ?? null;
  }

  get primaryTimeKeys(): string[] {
    return this.timeKeys.slice(0, 2);
  }

  get secondaryTimeKeys(): string[] {
    return this.timeKeys.slice(2, 4);
  }

  get dayOptionSet(): OptionItemInterface[] {
    const dayRef = this.field.itemSchema?.['dia']?.optionsRef;
    const optionSet: OptionSet | undefined = dayRef ? this.optionSets?.[dayRef] : undefined;
    return optionSet?.items ?? [];
  }

  dayOptionsFor(current: string): { value: string; label: string }[] {
    const used = new Set(this.days.map((d) => d.value).filter(Boolean));
    return this.dayOptionSet
      .filter((item) => !used.has(String(item.value)) || String(item.value) === current)
      .map((item) => ({ value: String(item.value), label: item.label }));
  }

  onDayChange(index: number, value: string): void {
    if (this.readOnly) return;
    const group = this.getGroupForDayByIndex(index);
    if (!group) return;
    group.get('dia')?.setValue(value);
    this.days = this.getDays();
  }

  private hasTimeValue(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
  }
}
