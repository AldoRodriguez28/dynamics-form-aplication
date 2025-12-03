import { AbstractControl } from '@angular/forms';
import { OptionItem } from '../models/form-schema.model';

export type OptionValue = OptionItem['value'];

export function optionKey(blockCode: string, fieldName: string): string {
  return `${blockCode}.${fieldName}`;
}

export function getFieldOptions(
  optionsMap: Record<string, OptionItem[]>,
  blockCode: string,
  fieldName: string
): OptionItem[] {
  return optionsMap[optionKey(blockCode, fieldName)] ?? [];
}

export function toggleOption(
  control: AbstractControl | null | undefined,
  payload: { value: OptionValue; checked: boolean }
): void {
  if (!control) return;
  const current: OptionValue[] = Array.isArray(control.value) ? control.value : [];
  const next = payload.checked ? [...current, payload.value] : current.filter((v) => v !== payload.value);
  control.setValue(next);
}
