import { AbstractControl } from '@angular/forms';
import { OptionItemInterface } from '../dynamic-form/interface/OptionItem.intreface';

export type OptionValue = OptionItemInterface['value'];

export function optionKey(blockCode: string, fieldName: string): string {
  return `${blockCode}.${fieldName}`;
}

export function getFieldOptions(
  optionsMap: Record<string, OptionItemInterface[]>,
  blockCode: string,
  fieldName: string
): OptionItemInterface[] {
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
