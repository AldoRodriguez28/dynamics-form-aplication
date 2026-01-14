import { Injectable } from '@angular/core';
import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { FormField } from '../models/form-schema.model';

interface BuildOptions {
  requiredValidator?: ValidatorFn | null;
  skipRequired?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FieldValidatorFactory {
  private readonly urlSchemePattern = /^(https?:)?\/\//i;

  build(field: FormField, options?: BuildOptions): ValidatorFn[] {
    const validators: ValidatorFn[] = [];

    const requiredValidator =
      options?.requiredValidator === undefined ? Validators.required : options.requiredValidator;

    if (!options?.skipRequired && field.required && requiredValidator) {
      validators.push(requiredValidator);
    }

    if (field.type === 'email') {
      validators.push(Validators.email);
    }

    if (field.type === 'url') {
      validators.push(this.urlValidator());
    }

    if (field.pattern) {
      validators.push(Validators.pattern(field.pattern));
    }

    if (field.maxLength && Number.isInteger(field.maxLength)) {
      validators.push(Validators.maxLength(field.maxLength));
    }

    return validators;
  }

  private urlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const rawValue = typeof control.value === 'string' ? control.value.trim() : '';
      if (!rawValue) return null;

      const normalized = this.urlSchemePattern.test(rawValue) ? rawValue : `https://${rawValue}`;

      try {
        const parsed = new URL(normalized);
        const hostname = parsed.hostname;
        if (!hostname.includes('.')) return { url: true };
        if (hostname.endsWith('.')) return { url: true };
        const labels = hostname.split('.');
        if (labels.some((label) => label.length === 0)) return { url: true };
        return null;
      } catch {
        return { url: true };
      }
    };
  }
}
