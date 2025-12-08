import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FieldConfig} from './Interface/field-config.interface';
import { SelectOption} from './Interface/select-option.interface';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-field-select',
   standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-select.component.html',
  styleUrls: ['./field-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldSelectComponent<T = any> {
  @Input({ required: true }) field!: FieldConfig & { name: string };
  @Input({ required: true }) control!: FormControl<T | T[] | null>;
  @Input() options: SelectOption<T>[] = [];
  @Input() emptyText = 'Selecciona...';

  trackByValue = (_: number, opt: SelectOption<T>) => opt.value;

  markTouched(): void {
    this.control.markAsTouched();
  }
}
