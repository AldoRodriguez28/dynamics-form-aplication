import { Injectable } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { FieldValidatorFactory } from '../../utils/field-validator.factory';
import { optionKey } from '../../utils';
import { phoneDigitsValidator, requiredIfSiblingFilled } from '../../utils/phone-validators';
import {
  BlockUI,
  BusinessFormBlock,
  FormField,
  FormRow,
  OptionSet
} from '../../models/form-schema.model';
import { OptionItemInterface } from '../interface/OptionItem.intreface';

export type FieldDisplayType =
  | 'text'
  | 'url'
  | 'textarea'
  | 'select'
  | 'multiselect'
  | 'checkbox-grid'
  | 'array-checkbox-grid'
  | 'file'
  | 'domain-option'
  | 'opening-hours'
  | 'opening-hours-flexible'
  | 'location-map'
  | 'phones'
  | 'pill-multiselect'
  | 'productos-servicios'
  | 'checkbox'
  | 'array-object'
  | 'array-primitive';

type BlockField = FormField & {
  displayType: FieldDisplayType;
  colSpan: number;
  itemKeys?: string[];
  itemType?: FormField['type'];
  countryControlName?: string;
};

type RowView = { num: number; fields: BlockField[] };
type Primitive = string | number | boolean | null;
export type FormValueParser = (value: unknown) => unknown;

export interface BlockView {
  code: string;
  title: string;
  description?: string;
  ui?: BlockUI;
  optionSets?: Record<string, OptionSet>;
  rows: RowView[];
  fieldCount: number;
  readOnly: boolean;
}

export interface BuildBlockResult {
  view: BlockView;
  controls: Record<string, AbstractControl>;
  optionsMap: Record<string, OptionItemInterface[]>;
  valueParsers: Record<string, FormValueParser>;
}

@Injectable({ providedIn: 'root' })
export class BlockFactoryService {
  constructor(
    private fb: FormBuilder,
    private validatorFactory: FieldValidatorFactory
  ) {}

  buildBlock(block: BusinessFormBlock, index: number, readOnly: boolean): BuildBlockResult {
    const { rows, controls, fieldCount, optionsMap, valueParsers } = this.buildBlockFields(block);
    const view: BlockView = {
      code: block.code,
      title: block.name || this.formatBlockLabel(block.code, index),
      description: block.description,
      ui: block.ui,
      optionSets: block.optionSets,
      rows,
      fieldCount,
      readOnly
    };

    return { view, controls, optionsMap, valueParsers };
  }

  private buildBlockFields(block: BusinessFormBlock): {
    rows: RowView[];
    controls: Record<string, AbstractControl>;
    fieldCount: number;
    optionsMap: Record<string, OptionItemInterface[]>;
    valueParsers: Record<string, FormValueParser>;
  } {
    const rows: RowView[] = [];
    const controls: Record<string, AbstractControl> = {};
    const optionsMap: Record<string, OptionItemInterface[]> = {};
    const valueParsers: Record<string, FormValueParser> = {};

    const rowsSource: FormRow[] = block.rows && block.rows.length > 0 ? block.rows : this.buildLegacyRows(block);
    const sortedRows = rowsSource.slice().sort((a, b) => (a.num ?? 0) - (b.num ?? 0));
    const hasLocationMap = sortedRows.some((row) => (row.fields ?? []).some((f) => this.isLocationMapField(f)));

    sortedRows.forEach((row) => {
      const defaultColSpan =
        row.fields?.length && row.fields.length > 0 ? Math.max(1, Math.floor(12 / row.fields.length)) : 12;
      const rowFields: BlockField[] = (row.fields ?? [])
        .map((fieldDef) => {
          const rawValue = (block.values ?? {})[fieldDef.name];
          const { field, control, options, parser } = this.buildField(block, fieldDef, rawValue, defaultColSpan);
          const skipRender = hasLocationMap && this.isDireccionField(fieldDef);

          controls[field.name] = control;

          if (fieldDef.type === 'tel' && fieldDef.collection !== 'array') {
            const countryControlName = this.getPhoneCountryControlName(fieldDef.name);
            field.countryControlName = countryControlName;
            const numberControl = control as FormControl;
            numberControl.addValidators(phoneDigitsValidator());
            numberControl.addValidators(requiredIfSiblingFilled(countryControlName));

            const countryControl = this.fb.control(this.normalizePhoneCountry(rawValue), [
              requiredIfSiblingFilled(fieldDef.name)
            ]);
            numberControl.valueChanges.subscribe(() => {
              countryControl.updateValueAndValidity({ emitEvent: false });
            });
            countryControl.valueChanges.subscribe(() => {
              numberControl.updateValueAndValidity({ emitEvent: false });
            });
            controls[countryControlName] = countryControl;
          }

          if (options) {
            optionsMap[optionKey(block.code, field.name)] = options;
          }
          if (parser) {
            valueParsers[optionKey(block.code, field.name)] = parser;
          }

          return skipRender ? null : field;
        })
        .filter((f): f is BlockField => !!f);

      rows.push({
        num: row.num,
        fields: rowFields
      });
    });

    const fieldCount = Object.keys(controls).filter((name) => !this.isPhoneCountryControl(name)).length;

    return { rows, controls, fieldCount, optionsMap, valueParsers };
  }

  private buildField(
    block: BusinessFormBlock,
    fieldDef: FormField,
    rawValue: unknown,
    defaultColSpan: number
  ): { field: BlockField; control: AbstractControl; options?: OptionItemInterface[]; parser?: FormValueParser } {
    const isObjectArrayField = this.isObjectArrayField(fieldDef);
    const isPrimitiveArrayField = this.isPrimitiveArrayField(fieldDef);
    const isDomainOption = this.isDomainOptionField(fieldDef);
    const isLocationMap = this.isLocationMapField(fieldDef);
    const isPhonesField = this.isPhonesField(fieldDef);
    let displayType: FieldDisplayType;

    if (this.isFlexibleHorariosPersonalizadosField(fieldDef)) {
      displayType = 'opening-hours-flexible';
    } else if (isLocationMap) {
      displayType = 'location-map';
    } else if (fieldDef.collection === 'array' && fieldDef.type === 'checkbox-group') {
      displayType = 'array-checkbox-grid';
    } else if (isPhonesField) {
      displayType = 'phones';
    } else if (isObjectArrayField) {
      displayType = 'array-object';
    } else if (this.isProductosServiciosField(fieldDef)) {
      displayType = 'productos-servicios';
    } else if (this.isPillMultiselectField(fieldDef)) {
      displayType = 'pill-multiselect';
    } else if (isPrimitiveArrayField) {
      displayType = 'array-primitive';
    } else if (isDomainOption) {
      displayType = 'domain-option';
    } else {
      displayType = this.resolveDisplayType(fieldDef.type);
      if (fieldDef.collection === 'array' && displayType === 'text') displayType = 'textarea';
    }

    let colSpanSource = fieldDef.colSpan ?? defaultColSpan;
    if (isLocationMap) {
      colSpanSource = this.getDireccionColSpan(block) ?? colSpanSource;
    }

    const colSpan = Math.min(12, Math.max(1, colSpanSource));

    if (fieldDef.collection === 'array' && fieldDef.type === 'checkbox-group') {
      const control = this.fb.control(Array.isArray(rawValue) ? rawValue : []);
      const options = this.resolveOptions(block, fieldDef, rawValue, displayType);
      const field: BlockField = {
        ...fieldDef,
        displayType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control, options };
    }

    if (this.isProductosServiciosField(fieldDef)) {
      const control = this.buildPrimitiveArrayControl(fieldDef, rawValue);
      const field: BlockField = {
        ...fieldDef,
        displayType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control };
    }

    if (isPhonesField) {
      const control = this.buildPhoneArrayControl(fieldDef, rawValue);
      const field: BlockField = {
        ...fieldDef,
        displayType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control };
    }

    if (isObjectArrayField) {
      const { control, itemKeys } = this.buildArrayObjectControl(fieldDef, rawValue);
      const field: BlockField = {
        ...fieldDef,
        displayType,
        colSpan,
        itemKeys,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control };
    }

    if (isPrimitiveArrayField) {
      const control = this.buildPrimitiveArrayControl(fieldDef, rawValue);
      const itemType = fieldDef.type;
      const itemDisplayType = this.resolveDisplayType(itemType);
      const options = this.resolveOptions(block, fieldDef, rawValue, itemDisplayType);
      const field: BlockField = {
        ...fieldDef,
        displayType,
        itemType,
        colSpan,
        label: fieldDef.label || this.toLabel(fieldDef.name)
      };

      return { field, control, options };
    }

    const { value, parser } = this.normalizeValue(block.code, fieldDef, rawValue, displayType);
    const options = this.resolveOptions(block, fieldDef, rawValue, displayType);

    const field: BlockField = {
      ...fieldDef,
      displayType,
      colSpan,
      rows: displayType === 'textarea' ? fieldDef.rows ?? this.textAreaRows(rawValue) : fieldDef.rows,
      label: fieldDef.label || this.toLabel(fieldDef.name)
    };

    const openingHoursRequired = this.isFlexibleHorariosPersonalizadosField(fieldDef)
      ? this.flexibleOpeningHoursRequiredValidator()
      : fieldDef.type === 'opening_hours'
        ? this.openingHoursRequiredValidator()
        : undefined;

    const validators = this.validatorFactory.build(fieldDef, {
      requiredValidator: openingHoursRequired
    });
    if (this.isFlexibleHorariosPersonalizadosField(fieldDef)) {
      validators.push(this.flexibleHorariosTurnsValidator());
      validators.push(this.flexibleHorariosDuplicateDiaValidator());
    } else if (fieldDef.type === 'opening_hours') {
      validators.push(this.openingHoursPairValidator());
      validators.push(this.openingHoursOrderValidator());
    }

    const control = this.fb.control(value, validators);

    return { field, control, options, parser };
  }

  private resolveDisplayType(type: string): FieldDisplayType {
    if (type === 'object') return 'textarea';
    if (type === 'opening_hours') return 'opening-hours';
    if (type === 'location-map') return 'location-map';
    if (type === 'checkbox-group') return 'checkbox-grid';
    if (type === 'file') return 'file';
    if (type === 'textarea') return 'textarea';
    if (type === 'select') return 'select';
    if (type === 'checkbox') return 'checkbox';
    if (type === 'url') return 'url';
    return 'text';
  }

  private buildLegacyRows(block: BusinessFormBlock): FormRow[] {
    const values = block.values ?? {};
    return [
      {
        num: 1,
        fields: Object.keys(values).map((name) => ({
          name,
          label: this.toLabel(name),
          type: this.guessTypeFromValue(values[name])
        }))
      }
    ];
  }

  private guessTypeFromValue(value: unknown): FieldDisplayType {
    if (typeof value === 'boolean') return 'checkbox';
    if (Array.isArray(value)) return 'textarea';
    if (value && typeof value === 'object') return 'textarea';
    if (typeof value === 'string' && value.length > 120) return 'textarea';
    return 'text';
  }

  private normalizeValue(
    blockCode: string,
    field: FormField,
    rawValue: unknown,
    displayType: FieldDisplayType
  ): { value: unknown; parser?: FormValueParser } {
    const isArrayCollection = field.collection === 'array';

    if (field.type === 'tel' && typeof rawValue === 'string') {
      const parsed = this.parseJson(rawValue, blockCode, field.name);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        const number = record['number'] ?? record['numero'];
        return { value: typeof number === 'string' || typeof number === 'number' ? number : '' };
      }
    }

    if (field.type === 'tel' && rawValue && typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      const asRecord = rawValue as Record<string, unknown>;
      const number = asRecord['number'] ?? asRecord['numero'];
      return { value: typeof number === 'string' || typeof number === 'number' ? number : '' };
    }

    if (this.isFlexibleHorariosPersonalizadosField(field)) {
      return { value: this.normalizeFlexibleHorariosPersonalizados(field, rawValue) };
    }

    if (field.type === 'opening_hours') {
      return { value: this.normalizeOpeningHours(field, rawValue) };
    }

    if (displayType === 'checkbox-grid') {
      const value = Array.isArray(rawValue) ? rawValue : [];
      return { value };
    }

    if (displayType === 'location-map') {
      const value = typeof rawValue === 'string' ? rawValue : '';
      return { value };
    }

    if (isArrayCollection) {
      const stringValue = this.stringifyValue(rawValue ?? []);
      return {
        value: stringValue,
        parser: (value) => this.parseJson(value, blockCode, field.name)
      };
    }

    if (displayType === 'checkbox') {
      const value = typeof rawValue === 'boolean' ? rawValue : !!rawValue;
      return { value };
    }

    if (field.type === 'object' || (rawValue && typeof rawValue === 'object')) {
      const stringValue = this.stringifyValue(rawValue ?? (isArrayCollection ? [] : {}));
      return {
        value: stringValue,
        parser: (value) => this.parseJson(value, blockCode, field.name)
      };
    }

    if (typeof rawValue === 'string' && rawValue.length > 120) {
      return { value: rawValue, parser: undefined };
    }

    if (rawValue === undefined || rawValue === null) {
      if (isArrayCollection) return { value: [] };
      return { value: '' };
    }

    return { value: rawValue };
  }

  private normalizeOpeningHours(field: FormField, rawValue: unknown): Record<string, Record<string, string>> {
    const schema = field.schema as { dias?: string[]; campos?: string[] } | undefined;
    const dias = schema?.dias ?? [];
    const campos = schema?.campos ?? ['abre', 'cierra'];
    const base: Record<string, Record<string, string>> = {};
    dias.forEach((dia) => {
      base[dia] = {};
      campos.forEach((c) => {
        base[dia][c] = '';
      });
    });

    if (rawValue && typeof rawValue === 'object') {
      const incoming = rawValue as Record<string, Record<string, string>>;
      Object.keys(incoming).forEach((dia) => {
        base[dia] = { ...base[dia], ...(incoming[dia] ?? {}) };
      });
    }

    return base;
  }

  /**
   * Valor: lista de `{ dia, turnos: [{ abre, cierra }, ...] }`.
   * Acepta: nuevo array, legado `[{ dia, abre, … }]`, y `Record<día, turnos[]>` guardado antes.
   */
  private normalizeFlexibleHorariosPersonalizados(
    field: FormField,
    rawValue: unknown
  ): { dia: string; turnos: { abre: string; cierra: string }[] }[] {
    if (rawValue === undefined || rawValue === null) {
      return [];
    }

    if (typeof rawValue === 'string' && rawValue.trim()) {
      try {
        return this.normalizeFlexibleHorariosPersonalizados(field, JSON.parse(rawValue));
      } catch {
        return [];
      }
    }

    if (Array.isArray(rawValue)) {
      if (rawValue.length === 0) return [];
      const first = rawValue[0];
      if (first && typeof first === 'object' && 'turnos' in (first as object)) {
        return rawValue.map((item) => this.normalizeFlexibleDiaEntry(item));
      }
      const byDay = this.migrateLegacyHorariosPersonalizadosRows(rawValue);
      return this.recordTurnosMapToDiaEntries(byDay);
    }

    if (typeof rawValue === 'object' && !Array.isArray(rawValue)) {
      const incoming = rawValue as Record<string, unknown>;
      const keys = Object.keys(incoming);
      if (keys.length === 0) return [];

      const firstVal = incoming[keys[0]];
      const looksLikeTurnosPerDay =
        firstVal &&
        typeof firstVal === 'object' &&
        Array.isArray(firstVal);

      if (looksLikeTurnosPerDay) {
        return keys
          .filter((k) => Array.isArray(incoming[k]))
          .map((dia) => ({
            dia,
            turnos: this.normalizeTurnosArray(incoming[dia])
          }));
      }

      const looksLikeCompact =
        firstVal &&
        typeof firstVal === 'object' &&
        !Array.isArray(firstVal) &&
        ('abre' in (firstVal as object) || 'cierra' in (firstVal as object));

      if (looksLikeCompact) {
        const out: { dia: string; turnos: { abre: string; cierra: string }[] }[] = [];
        keys.forEach((dia) => {
          const dayVal = incoming[dia] as Record<string, string> | undefined;
          if (
            dayVal &&
            !Array.isArray(dayVal) &&
            (this.hasTimeValue(dayVal['abre']) || this.hasTimeValue(dayVal['cierra']))
          ) {
            out.push({
              dia,
              turnos: [
                {
                  abre: typeof dayVal['abre'] === 'string' ? dayVal['abre'] : '',
                  cierra: typeof dayVal['cierra'] === 'string' ? dayVal['cierra'] : ''
                }
              ]
            });
          }
        });
        return out;
      }
    }

    return [];
  }

  private normalizeFlexibleDiaEntry(item: unknown): {
    dia: string;
    turnos: { abre: string; cierra: string }[];
  } {
    if (!item || typeof item !== 'object') {
      return { dia: '', turnos: [] };
    }
    const o = item as Record<string, unknown>;
    const dia = typeof o['dia'] === 'string' ? o['dia'] : '';
    const turnos = Array.isArray(o['turnos'])
      ? this.normalizeTurnosArray(o['turnos'])
      : [];
    return { dia, turnos };
  }

  private normalizeTurnosArray(arr: unknown): { abre: string; cierra: string }[] {
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((t) => t && typeof t === 'object')
      .map((t) => {
        const o = t as Record<string, unknown>;
        return {
          abre: typeof o['abre'] === 'string' ? o['abre'] : '',
          cierra: typeof o['cierra'] === 'string' ? o['cierra'] : ''
        };
      });
  }

  private recordTurnosMapToDiaEntries(
    byDay: Record<string, { abre: string; cierra: string }[]>
  ): { dia: string; turnos: { abre: string; cierra: string }[] }[] {
    return Object.keys(byDay).map((dia) => ({
      dia,
      turnos: byDay[dia] ? byDay[dia].map((t) => ({ ...t })) : []
    }));
  }

  /** Formato legado: `[{ dia, abre, comidaSale?, comidaRegresa?, cierra }]` */
  private migrateLegacyHorariosPersonalizadosRows(
    items: unknown[]
  ): Record<string, { abre: string; cierra: string }[]> {
    const byDay: Record<string, { abre: string; cierra: string }[]> = {};
    for (const raw of items) {
      if (!raw || typeof raw !== 'object') continue;
      const item = raw as Record<string, unknown>;
      const dia = String(item['dia'] ?? '');
      if (!dia) continue;
      if (!byDay[dia]) byDay[dia] = [];

      const abre = typeof item['abre'] === 'string' ? item['abre'] : '';
      const comidaSale = typeof item['comidaSale'] === 'string' ? item['comidaSale'] : '';
      const comidaRegresa = typeof item['comidaRegresa'] === 'string' ? item['comidaRegresa'] : '';
      const cierra = typeof item['cierra'] === 'string' ? item['cierra'] : '';

      const hasComida = this.hasTimeValue(comidaSale) || this.hasTimeValue(comidaRegresa);
      if (hasComida) {
        if (this.hasTimeValue(abre) || this.hasTimeValue(comidaSale)) {
          byDay[dia].push({ abre, cierra: comidaSale });
        }
        if (this.hasTimeValue(comidaRegresa) || this.hasTimeValue(cierra)) {
          byDay[dia].push({ abre: comidaRegresa, cierra });
        }
      } else if (this.hasTimeValue(abre) || this.hasTimeValue(cierra)) {
        byDay[dia].push({ abre, cierra });
      }
    }
    return byDay;
  }

  private resolveOptions(
    block: BusinessFormBlock,
    field: FormField,
    rawValue: unknown,
    displayType: FieldDisplayType
  ): OptionItemInterface[] | undefined {
    if (displayType === 'array-primitive') {
      return undefined;
    }

    if (displayType === 'checkbox') {
      return [
        { value: true, label: 'Sí' },
        { value: false, label: 'No' }
      ];
    }

    if (!field.optionsRef) {
      return undefined;
    }

    const optionSet: OptionSet | undefined = block.optionSets?.[field.optionsRef];

    if (optionSet?.mode === 'static' && optionSet.items?.length) {
      return optionSet.items;
    }

    if (optionSet?.mode === 'api') {
      const fallbackOptions = this.toOptionsFromValue(rawValue);
      if (fallbackOptions.length) return fallbackOptions;
    }

    return optionSet?.items ?? this.toOptionsFromValue(rawValue);
  }

  private toOptionsFromValue(value: unknown): OptionItemInterface[] {
    if (Array.isArray(value)) {
      return value
        .filter((v) => this.isPrimitive(v))
        .map((v) => ({
          value: v as Primitive,
          label: String(v)
        }));
    }

    if (this.isPrimitive(value)) {
      return [
        {
          value: value as Primitive,
          label: String(value)
        }
      ];
    }

    return [];
  }

  private openingHoursRequiredValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as Record<string, Record<string, string>> | null | undefined;
      if (!value) return { required: true };
      const hasValue = Object.values(value).some((dia) =>
        Object.values(dia || {}).some((v) => (typeof v === 'string' ? v.trim() !== '' : !!v))
      );
      return hasValue ? null : { required: true };
    };
  }

  private openingHoursOrderValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as Record<string, Record<string, string>> | null | undefined;
      if (!value) return null;

      for (const dia of Object.values(value)) {
        const abre = dia?.['abre'];
        const cierra = dia?.['cierra'];
        if (!this.hasTimeValue(abre) || !this.hasTimeValue(cierra)) continue;

        const start = this.timeToMinutes(abre);
        const end = this.timeToMinutes(cierra);
        if (start === null || end === null || start >= end) {
          return { openingHoursOrder: true };
        }
      }

      return null;
    };
  }

  private openingHoursPairValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as Record<string, Record<string, string>> | null | undefined;
      if (!value) return null;

      for (const dia of Object.values(value)) {
        const abre = dia?.['abre'];
        const cierra = dia?.['cierra'];
        const hasAbre = this.hasTimeValue(abre);
        const hasCierra = this.hasTimeValue(cierra);
        if (hasAbre !== hasCierra) {
          return { openingHoursPair: true };
        }
      }

      return null;
    };
  }

  private flexibleOpeningHoursRequiredValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as
        | { dia: string; turnos: { abre: string; cierra: string }[] }[]
        | null
        | undefined;
      if (!value || !Array.isArray(value)) return { required: true };
      const hasCompleteTurn = value.some(
        (e) =>
          e?.dia?.trim() &&
          Array.isArray(e.turnos) &&
          e.turnos.some((t) => t && this.hasTimeValue(t.abre) && this.hasTimeValue(t.cierra))
      );
      return hasCompleteTurn ? null : { required: true };
    };
  }

  private flexibleHorariosTurnsValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as
        | { dia: string; turnos: { abre: string; cierra: string }[] }[]
        | null
        | undefined;
      if (!value || !Array.isArray(value)) return null;

      for (const entry of value) {
        const turns = entry?.turnos;
        if (!Array.isArray(turns)) continue;
        for (const t of turns) {
          if (!t || typeof t !== 'object') continue;
          const ha = this.hasTimeValue(t.abre);
          const hc = this.hasTimeValue(t.cierra);
          if (ha !== hc) return { openingHoursPair: true };
          if (ha && hc) {
            const start = this.timeToMinutes(t.abre);
            const end = this.timeToMinutes(t.cierra);
            if (start === null || end === null || start >= end) {
              return { openingHoursOrder: true };
            }
          }
        }
      }
      return null;
    };
  }

  private flexibleHorariosDuplicateDiaValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const value = control.value as
        | { dia: string; turnos: { abre: string; cierra: string }[] }[]
        | null
        | undefined;
      if (!value || !Array.isArray(value)) return null;
      const seen = new Set<string>();
      for (const e of value) {
        const d = String(e?.dia ?? '').trim();
        if (!d) continue;
        if (seen.has(d)) return { duplicateHorariosDia: true };
        seen.add(d);
      }
      return null;
    };
  }

  private objectArrayCompleteValidator(requiredKeys: string[]): ValidatorFn {
    return (control: AbstractControl) => {
      const array = control as FormArray | null;
      if (!array || !array.controls?.length) return null;

      for (const item of array.controls) {
        const group = item as FormGroup;
        for (const key of requiredKeys) {
          const value = group.get(key)?.value;
          if (!this.hasNonEmptyValue(value)) {
            return { arrayItemIncomplete: true };
          }
        }
      }

      return null;
    };
  }

  private hasTimeValue(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
  }

  private hasNonEmptyValue(value: unknown): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim() !== '';
    if (typeof value === 'number') return true;
    if (typeof value === 'boolean') return true;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
    return true;
  }

  private timeToMinutes(value: string): number | null {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value.trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours * 60 + minutes;
  }

  private getObjectArrayRequiredKeys(keys: string[], field: FormField): string[] {
    return keys;
  }

  private isObjectArrayField(field: FormField): boolean {
    return (
      field.collection === 'array' &&
      field.type === 'object' &&
      !this.isFlexibleHorariosPersonalizadosField(field)
    );
  }

  private isPrimitiveArrayField(field: FormField): boolean {
    return (
      field.collection === 'array' &&
      field.type !== 'object' &&
      field.type !== 'checkbox-group' &&
      !this.isPillMultiselectField(field) &&
      !this.isProductosServiciosField(field)
    );
  }

  private isDomainOptionField(field: FormField): boolean {
    return field.collection !== 'array' && /^dominio\d*$/.test(field.name ?? '') && field.type === 'text';
  }

  private isPillMultiselectField(field: FormField): boolean {
    return field.collection === 'array' && field.type === 'checkbox-group' && field.name !== 'productosServicios';
  }

  private isProductosServiciosField(field: FormField): boolean {
    return field.name === 'productosServicios' && field.collection === 'array';
  }

  /**
   * Horarios personalizados: siempre UI flexible (turnos por día), aunque el API aún envíe
   * el esquema antiguo (`type: object` + `collection: array`).
   */
  private isFlexibleHorariosPersonalizadosField(field: FormField): boolean {
    return field.name === 'horariosPersonalizados';
  }

  private isLocationMapField(field: FormField): boolean {
    return field.name === 'coordenadas' && field.type === 'text' && field.collection !== 'array';
  }

  private isPhonesField(field: FormField): boolean {
    if (field.collection !== 'array') return false;
    const widget = (field.widget || '').toLowerCase();
    if (widget === 'phones' || widget === 'telefonos' || widget === 'phone') return true;

    if (field.type === 'tel') return true;
    if (field.type !== 'object') return false;

    const schema = field.itemSchema ?? {};
    const hasNumero = Object.prototype.hasOwnProperty.call(schema, 'numero');
    const hasTelType = Object.values(schema).some((item) => item?.type === 'tel');
    return hasNumero && hasTelType;
  }

  private isDireccionField(field: FormField): boolean {
    return field.name === 'direccion';
  }

  private getDireccionColSpan(block: BusinessFormBlock): number | undefined {
    for (const row of block.rows || []) {
      for (const field of row.fields || []) {
        if (field.name === 'direccion' && field.colSpan) {
          return field.colSpan;
        }
      }
    }
    return undefined;
  }

  private buildArrayObjectControl(
    field: FormField,
    rawValue: unknown
  ): { control: FormArray<FormGroup>; itemKeys: string[] } {
    const { items, keys } = this.normalizeObjectArray(rawValue, field);
    const groups = items.map((item) => this.buildObjectGroup(keys, field, item));
    const arrayValidators: ValidatorFn[] = [];
    arrayValidators.push(this.objectArrayCompleteValidator(this.getObjectArrayRequiredKeys(keys, field)));
    const control = this.fb.array(
      groups.length ? groups : [this.buildObjectGroup(keys, field, {})],
      arrayValidators
    );
    return { control, itemKeys: keys };
  }

  private buildPhoneArrayControl(field: FormField, rawValue: unknown): FormArray<FormGroup> {
    const schema = field.itemSchema ?? {};
    const includeTipo = Object.prototype.hasOwnProperty.call(schema, 'tipo');
    const keys = includeTipo ? ['tipo', 'numero', 'country'] : ['numero', 'country'];

    const normalizeCountry = (value: unknown): '' | 'MX' | 'US' => {
      const normalized =
        typeof value === 'string' ? value.replace(/\s+/g, '').toUpperCase() : '';
      if (normalized === 'US') return 'US';
      if (normalized === 'MX') return 'MX';
      return '';
    };

    let items: Record<string, unknown>[] = [];
    if (Array.isArray(rawValue)) {
      const hasObject = rawValue.some((item) => item && typeof item === 'object');
      if (hasObject) {
        items = this.normalizeObjectArray(rawValue, field).items;
      } else if (rawValue.some((item) => typeof item === 'string' && this.safeParseJsonObject(item))) {
        items = rawValue.map((item) => {
          if (typeof item === 'string') {
            const parsed = this.safeParseJsonObject(item);
            if (parsed) {
              if (parsed['numero'] === undefined && parsed['number'] !== undefined) {
                parsed['numero'] = parsed['number'];
              }
              return parsed;
            }
          }
          return { numero: item };
        });
      } else {
        items = rawValue.map((value) => ({ numero: value }));
      }
    } else if (rawValue && typeof rawValue === 'object') {
      items = this.normalizeObjectArray(rawValue, field).items;
    }
    if (!items.length) items = [{}];

    const groups = items.map((item) => {
      const originalCountry = (item as Record<string, unknown>)?.['country'];
      const normalizedCountry = normalizeCountry(originalCountry);
      return this.buildObjectGroup(keys, field, {
        ...item,
        country: normalizedCountry
      });
    });

    const formArray = this.fb.array(
      groups.length ? groups : [this.buildObjectGroup(keys, field, {})],
      [this.objectArrayCompleteValidator(this.getObjectArrayRequiredKeys(keys, field))]
    );

    formArray.controls.forEach((group, index) => {
      const country = normalizeCountry((items[index] as Record<string, unknown>)?.['country']);
      group.get('country')?.setValue(country, { emitEvent: false });

      const numberControl = group.get('numero') as FormControl | null;
      const countryControl = group.get('country') as FormControl | null;
      numberControl?.addValidators(phoneDigitsValidator());
      numberControl?.addValidators(requiredIfSiblingFilled('country'));
      countryControl?.addValidators(requiredIfSiblingFilled('numero'));
      numberControl?.valueChanges.subscribe(() => {
        countryControl?.updateValueAndValidity({ emitEvent: false });
      });
      countryControl?.valueChanges.subscribe(() => {
        numberControl?.updateValueAndValidity({ emitEvent: false });
      });
    });

    return formArray;
  }

  private buildObjectGroup(keys: string[], field: FormField, value: Record<string, unknown>): FormGroup {
    const schema = field.itemSchema ?? {};
    const controls: Record<string, FormControl> = {};
    const hasExplicitCountryField =
      keys.includes('country') || Object.prototype.hasOwnProperty.call(schema, 'country');

    keys.forEach((key) => {
      const fieldSchema = schema[key];
      const validators = fieldSchema?.required ? [Validators.required] : [];
      if (fieldSchema?.type === 'tel') {
        const raw = value?.[key];
        let numberValue: unknown = raw;
        if (typeof raw === 'string') {
          const parsed = this.safeParseJsonObject(raw);
          if (parsed) {
            numberValue = parsed['number'] ?? parsed['numero'] ?? '';
          }
        } else if (raw && typeof raw === 'object') {
          const record = raw as Record<string, unknown>;
          numberValue = record['number'] ?? record['numero'] ?? '';
        }

        const numberControl = this.fb.control(this.coercePrimitive(numberValue), validators);
        numberControl.addValidators(phoneDigitsValidator());
        controls[key] = numberControl;
        const countryKey = `${key}Country`;
        if (!controls[countryKey] && !(hasExplicitCountryField && key === 'numero')) {
          const countryControl = this.fb.control(this.normalizePhoneCountry(raw), [
            requiredIfSiblingFilled(key)
          ]);
          numberControl.valueChanges.subscribe(() => {
            countryControl.updateValueAndValidity({ emitEvent: false });
          });
          countryControl.valueChanges.subscribe(() => {
            numberControl.updateValueAndValidity({ emitEvent: false });
          });
          numberControl.addValidators(requiredIfSiblingFilled(countryKey));
          controls[countryKey] = countryControl;
        }
        return;
      }

      controls[key] = this.fb.control(this.coercePrimitive(value?.[key]), validators);
    });

    return this.fb.group(controls);
  }

  private buildPrimitiveArrayControl(field: FormField, rawValue: unknown): FormArray<FormControl> {
    const validators = field.required ? [Validators.required] : [];
    const values: unknown[] = Array.isArray(rawValue) ? rawValue : [];
    const controls = values.length
      ? values.map((v) => this.fb.control(this.coercePrimitiveArrayValue(field, v), validators))
      : [this.fb.control(this.defaultPrimitiveArrayValue(field), validators)];
    const arrayValidators = [this.primitiveArrayCompleteValidator()];
    if (field.name === 'productosServicios') {
      return this.fb.array(controls, [this.primitiveArrayAtLeastOneValidator()]);
    }
    return this.fb.array(controls, arrayValidators);
  }

  private primitiveArrayCompleteValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const array = control as FormArray | null;
      if (!array || !array.controls?.length) return null;

      for (const item of array.controls) {
        if (!this.hasNonEmptyValue(item.value)) {
          return { arrayItemIncomplete: true };
        }
      }
      return null;
    };
  }

  private primitiveArrayAtLeastOneValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const array = control as FormArray | null;
      if (!array || !array.controls?.length) return { arrayItemIncomplete: true };
      const hasAny = array.controls.some((item) => this.hasNonEmptyValue(item.value));
      return hasAny ? null : { arrayItemIncomplete: true };
    };
  }

  private defaultPrimitiveArrayValue(field: FormField): Primitive | '' {
    if (field.type === 'checkbox' || field.type === 'checkbox-group') return false;
    if (field.type === 'file') return null;
    return '';
  }

  private coercePrimitiveArrayValue(field: FormField, value: unknown): unknown {
    if (field.type === 'file') return value ?? null;
    return this.coercePrimitive(value);
  }

  private normalizeObjectArray(
    rawValue: unknown,
    field: FormField
  ): {
    items: Record<string, unknown>[];
    keys: string[];
  } {
    let parsed: unknown = rawValue;

    if (typeof rawValue === 'string') {
      const trimmed = rawValue.trim();
      if (trimmed) {
        try {
          parsed = JSON.parse(trimmed);
        } catch {
          parsed = [];
        }
      }
    }

    let items: unknown[] = [];
    if (Array.isArray(parsed)) {
      items = parsed;
    } else if (parsed && typeof parsed === 'object') {
      items = [parsed];
    }

    const safeItems = items
      .map((item) => (item && typeof item === 'object' ? item : {}))
      .map((item) => ({ ...(item as Record<string, unknown>) }));

    const keySet = new Set<string>(Object.keys(field.itemSchema ?? {}));
    safeItems.forEach((item) => {
      Object.keys(item).forEach((k) => keySet.add(k));
    });
    if (keySet.size === 0) {
      ['nombreSucursal', 'telefonoSucursal', 'direccionSucursal'].forEach((k) => keySet.add(k));
    }
    if (!safeItems.length) safeItems.push({});

    return { items: safeItems, keys: Array.from(keySet) };
  }

  private getPhoneCountryControlName(fieldName: string): string {
    return `${fieldName}Country`;
  }

  private isPhoneCountryControl(name: string): boolean {
    return name === 'country' || name.endsWith('Country');
  }


  private normalizePhoneCountry(value: unknown): '' | 'MX' | 'US' {
    if (typeof value === 'string') {
      const parsed = this.safeParseJsonObject(value);
      if (parsed) {
        value = parsed;
      }
    }
    if (!value || typeof value !== 'object') return '';
    const raw = (value as Record<string, unknown>)['country'];
    const normalized = typeof raw === 'string' ? raw.trim().toUpperCase() : '';
    if (normalized === 'US') return 'US';
    if (normalized === 'MX') return 'MX';
    return '';
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

  private coercePrimitive(value: unknown): string | number | boolean | null {
    if (value === undefined) return '';
    if (value === null) return null;
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private stringifyValue(value: unknown): string {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  private parseJson(value: unknown, blockCode: string, fieldName: string): unknown {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.warn(`No se pudo parsear JSON para ${blockCode}.${fieldName}`, error);
      return value;
    }
  }

  private textAreaRows(rawValue: unknown): number {
    const value =
      typeof rawValue === 'string' ? rawValue : rawValue ? this.stringifyValue(rawValue) : '';
    const lines = value.split('\n').length;
    return Math.min(12, Math.max(3, lines + 1));
  }

  private toLabel(raw: string): string {
    return raw
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^./, (c) => c.toUpperCase());
  }

  private formatBlockLabel(code: string, index: number): string {
    const label = this.toLabel(code);
    return label || `Bloque ${index + 1}`;
  }

  private isPrimitive(value: unknown): value is Primitive | undefined {
    return ['string', 'number', 'boolean', 'undefined'].includes(typeof value) || value === null;
  }
}
