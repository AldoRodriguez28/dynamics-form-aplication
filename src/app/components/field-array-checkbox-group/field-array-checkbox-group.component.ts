import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField, OptionItem } from '../../models/form-schema.model';

@Component({
  selector: 'app-field-array-checkbox-group',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-array-checkbox-group.component.html',
  styleUrl: './field-array-checkbox-group.component.scss'
})
export class FieldArrayCheckboxGroupComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;
  @Input() options: OptionItem[] = [];
  @Output() toggle = new EventEmitter<{ value: OptionItem['value']; checked: boolean }>();

  onChange(event: Event, value: OptionItem['value']): void {
    const target = event.target as HTMLInputElement;
    this.toggle.emit({ value, checked: target.checked });
  }

  isChecked(value: OptionItem['value']): boolean {
    const current = (this.control.value as OptionItem['value'][]) || [];
    return current.includes(value);
  }
}
