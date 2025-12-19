import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';
import { OptionItemInterface } from '../../dynamic-form/interface/OptionItem.intreface';

@Component({
  selector: 'app-field-checkbox-grid',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-checkbox-grid.component.html',
  styleUrl: './field-checkbox-grid.component.scss'
})
export class FieldCheckboxGridComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;
  @Input() options: OptionItemInterface[] = [];
  @Output() toggle = new EventEmitter<{ value: OptionItemInterface['value']; checked: boolean }>();

  onChange(event: Event, value: OptionItemInterface['value']): void {
    const target = event.target as HTMLInputElement;
    this.toggle.emit({ value, checked: target.checked });
  }

  isChecked(value: OptionItemInterface['value']): boolean {
    const current = (this.control.value as OptionItemInterface['value'][]) || [];
    return current.includes(value);
  }
}
