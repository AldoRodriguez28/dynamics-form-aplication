import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

const markControlTouched = (control: AbstractControl): void => {
  const asGroup = control as FormGroup;
  if (typeof asGroup.markAllAsTouched === 'function') {
    asGroup.markAllAsTouched();
    return;
  }
  control.markAsTouched();
};

export const canAppendFormArrayItem = (formArray: FormArray): boolean => {
  if (!formArray || formArray.length === 0) return true;
  const last = formArray.at(formArray.length - 1);
  if (!last) return true;
  markControlTouched(last);
  last.updateValueAndValidity({ emitEvent: false });
  return last.valid;
};
