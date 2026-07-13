import { CommonModule } from '@angular/common';
import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';

@Component({
  selector: 'app-field-url',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-url.component.html',
  styleUrl: './field-url.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldUrlComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;
  @Input() readOnly = false;

  get showError(): boolean {
    return this.control.touched && this.control.invalid;
  }

  get hasPatternError(): boolean {
    return Boolean(this.control.errors?.['pattern']);
  }

  get hasRequiredError(): boolean {
    return Boolean(this.control.errors?.['required']);
  }
}
