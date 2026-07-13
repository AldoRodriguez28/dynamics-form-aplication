import { FormArray, FormControl, FormGroup } from '@angular/forms';

type ControlContainer = FormGroup | FormArray;

export function getControl<T = unknown>(
  parent: ControlContainer | null | undefined,
  path: string | (string | number)[]
): FormControl<T> {
  const control = parent?.get(path);

  if (!control) {
    throw new Error(`Control not found for path: ${Array.isArray(path) ? path.join('.') : path}`);
  }

  return control as FormControl<T>;
}
