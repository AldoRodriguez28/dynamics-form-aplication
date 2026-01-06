import { Injectable } from '@angular/core';
import { ValidatorFn, Validators } from '@angular/forms';
import { FormField } from '../models/form-schema.model';

interface BuildOptions {
  requiredValidator?: ValidatorFn | null;
  skipRequired?: boolean;
}

@Injectable({ providedIn: 'root' })
export class FieldValidatorFactory {
  private readonly urlPattern = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;

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
      validators.push(Validators.pattern(this.urlPattern));
    }

    if (field.pattern) {
      validators.push(Validators.pattern(field.pattern));
    }

    if (field.maxLength && Number.isInteger(field.maxLength)) {
      validators.push(Validators.maxLength(field.maxLength));
    }

    return validators;
  }
}
