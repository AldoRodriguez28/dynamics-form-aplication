import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { FormField, OptionItem } from '../../models/form-schema.model';

@Component({
  selector: 'app-field-select',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './field-select.component.html',
  styleUrl: './field-select.component.scss'
})
export class FieldSelectComponent {
  @Input({ required: true }) field!: FormField & { name: string };
  @Input({ required: true }) control!: FormControl;
  @Input() options: OptionItem[] = [];
}
