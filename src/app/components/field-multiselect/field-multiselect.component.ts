import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField } from '../../models/form-schema.model';
import { OptionItemInterface } from '../../dynamic-form/interface/OptionItem.intreface';

@Component({
  selector: 'app-field-multiselect',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-multiselect.component.html',
  styleUrl: './field-multiselect.component.scss'
})
export class FieldMultiselectComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;
  @Input() options: OptionItemInterface[] = [];

  get size(): number {
    const base = this.options?.length ?? 4;
    return Math.min(8, Math.max(4, base || 4));
  }
}
