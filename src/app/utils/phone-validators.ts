import { AbstractControl, FormGroup, ValidatorFn } from '@angular/forms';

export const phoneDigitsValidator = (): ValidatorFn => {
  return (control: AbstractControl) => {
    const rawValue = control.value;
    if (rawValue === null || rawValue === undefined) return null;
    const value = String(rawValue).trim();
    if (!value) return null;
    return /^\d{10}$/.test(value) ? null : { phoneDigits: true };
  };
};

export const requiredIfSiblingFilled = (siblingKey: string): ValidatorFn => {
  return (control: AbstractControl) => {
    const parent = control.parent as FormGroup | null;
    if (!parent) return null;
    const sibling = parent.get(siblingKey);
    const siblingValue = sibling?.value;
    const hasSiblingValue =
      siblingValue !== null &&
      siblingValue !== undefined &&
      (typeof siblingValue !== 'string' || siblingValue.trim().length > 0);
    if (!hasSiblingValue) return null;
    const value = control.value;
    if (value === null || value === undefined) return { required: true };
    if (typeof value === 'string' && value.trim().length === 0) return { required: true };
    return null;
  };
};
